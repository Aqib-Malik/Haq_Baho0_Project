from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from .mixins import SoftDeleteMixin


class Company(SoftDeleteMixin):
    """Company model for tracking client/vendor information"""
    name = models.CharField(max_length=200, unique=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True, verbose_name="GSTIN")

    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def total_debit(self):
        """Calculate total debit (invoices) for this company"""
        return self.invoices.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def total_credit(self):
        """Calculate total credit (payments) for this company"""
        return self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def outstanding_balance(self):
        """Calculate outstanding balance: Total Invoices - Total Payments"""
        return self.total_debit - self.total_credit


class Invoice(SoftDeleteMixin):
    """Invoice model representing debit entries (money owed to us/from company)"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.company.name} - {self.amount}"


class Payment(SoftDeleteMixin):
    """Payment model representing credit entries (money received/payments made)"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payments')
    payment_number = models.CharField(max_length=50, unique=True)
    payment_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('cheque', 'Cheque'),
            ('bank_transfer', 'Bank Transfer'),
            ('upi', 'UPI'),
            ('card', 'Card'),
            ('other', 'Other')
        ],
        default='cash'
    )
    reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.payment_number} - {self.company.name} - {self.amount}"


class LedgerEntry(SoftDeleteMixin):
    """Generic ledger entry model that combines invoices and payments for easy querying"""
    TRANSACTION_TYPES = [
        ('debit', 'Debit (Invoice)'),
        ('credit', 'Credit (Payment)')
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ledger_entries')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    transaction_number = models.CharField(max_length=50)
    transaction_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, null=True)
    payment_mode = models.CharField(max_length=20, blank=True, null=True)
    
    # Foreign keys to original invoice or payment
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Ledger Entries"
        ordering = ['transaction_date', 'created_at']
        indexes = [
            models.Index(fields=['company', 'transaction_date']),
            models.Index(fields=['transaction_type']),
        ]

    def __str__(self):
        return f"{self.transaction_number} - {self.company.name} - {self.transaction_type} - {self.amount}"


class Tax(SoftDeleteMixin):
    """Tax model for managing different tax types and rates"""
    name = models.CharField(max_length=100, unique=True)
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Tax rate as percentage (e.g., 18.00 for 18%)"
    )
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "Taxes"
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f"{self.name} ({self.rate}%)"

    def save(self, *args, **kwargs):
        # Ensure only one tax is marked as default
        if self.is_default:
            Tax.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class Unit(SoftDeleteMixin):
    """Unit of measurement for inventory items"""
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True, help_text="Short code e.g., kg, m, pcs")
    base_unit = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='derived_units', help_text="If this is a derived unit, select the base unit")
    conversion_factor = models.DecimalField(
        max_digits=15, 
        decimal_places=5, 
        default=Decimal('1.00000'), 
        validators=[MinValueValidator(Decimal('0.00001'))],
        help_text="Multiplier to convert to base unit (1 derived = x base)"
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


    def get_root_unit(self):
        """Find the ultimate root unit (e.g., Meter for CM/Inch)"""
        root = self
        visited = {self.id}
        while root.base_unit:
            if root.base_unit.id in visited: # Prevent infinite loops
                break 
            root = root.base_unit
            visited.add(root.id)
        return root

    def get_conversion_to_root(self):
        """Calculate multiplier to convert this unit to its root unit"""
        factor = Decimal('1.0')
        current = self
        visited = {self.id}
        while current.base_unit:
            factor *= current.conversion_factor
            if current.base_unit.id in visited:
                break
            current = current.base_unit
            visited.add(current.id)
        return factor


class Location(SoftDeleteMixin):
    """Physical location for inventory (Warehouse, Rack, etc.)"""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        full_name = self.name
        if self.parent:
            full_name = f"{self.parent.str()} > {full_name}"
        return full_name

class InventoryItem(SoftDeleteMixin):
    """Inventory item model for managing products/services"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    unit = models.CharField(max_length=50, default='pcs', help_text="Unit of measurement (e.g., pcs, kg, m)")
    category = models.CharField(max_length=100, blank=True, null=True)
    stock_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    sku = models.CharField(max_length=100, blank=True, null=True, unique=True, verbose_name="SKU")
    
    # New Inventory Fields
    base_unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='base_items')
    min_stock_level = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Minimum stock level before alert"
    )
    reorder_level = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Level at which to reorder"
    )
    default_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    batch_tracking = models.BooleanField(default=False, help_text="Enable batch/lot tracking for this item")

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} - Rs {self.unit_price}/{self.unit}"


class Batch(SoftDeleteMixin):
    """Batch/Lot tracking for items"""
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ('item', 'batch_number')
        verbose_name_plural = "Batches"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item.name} - {self.batch_number}"


class Project(SoftDeleteMixin):
    """Project or Work Order for tracking material usage"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
        ('cancelled', 'Cancelled'),
    ]

    name = models.CharField(max_length=200)
    client = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    start_date = models.DateField(default=models.functions.Now)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class StockTransaction(SoftDeleteMixin):
    """Record of stock movements (receipts, issues, returns)"""
    TRANSACTION_TYPES = [
        ('receipt', 'Stock Receipt'),
        ('issue', 'Stock Issue'),
        ('return', 'Stock Return'),
        ('adjustment', 'Stock Adjustment'),
    ]
    
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=15, decimal_places=4) # Quantity in transaction unit
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True) # The unit used in this transaction
    
    # Conversion details
    base_quantity = models.DecimalField(max_digits=15, decimal_places=4, help_text="Quantity converted to base unit", editable=False)
    
    # Tracking details
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
    
    transaction_date = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['item', 'transaction_date']),
            models.Index(fields=['transaction_type']),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.item.name} ({self.quantity} {self.unit.code if self.unit else ''})"

    def save(self, *args, **kwargs):
        # Calculate base quantity
        if not self.unit or not self.item.base_unit:
            # Fallback if unitted Item is not set up correctly, assume 1:1 if units match or missing
             self.base_quantity = self.quantity
        else:
             # Logic: Convert Transaction Unit -> Root, then Root -> Item Base Unit
             root_trans = self.unit.get_root_unit()
             root_item = self.item.base_unit.get_root_unit()
             
             if root_trans.id == root_item.id:
                 # Shared root, conversion possible
                 # Qty * (Factor Trans->Root) / (Factor ItemBase->Root)
                 factor_trans_to_root = self.unit.get_conversion_to_root()
                 factor_base_to_root = self.item.base_unit.get_conversion_to_root()
                 
                 # base_qty = (qty * trans_factor) / base_factor
                 # Example: 10 CM (Base Meter, 0.01) to Inch (Base Meter via Foot, 0.0254)
                 # 10 * 0.01 = 0.1 Meter.
                 # 0.1 Meter / 0.0254 = 3.937 Inches.
                 if factor_base_to_root and factor_base_to_root > 0:
                     self.base_quantity = (self.quantity * factor_trans_to_root) / factor_base_to_root
                 else:
                     self.base_quantity = self.quantity # Should not happen if data valid
             else:
                 # Different roots (e.g. Kg vs Meter). Cannot convert.
                 # Fallback to 1:1 or Raise error?
                 # For safety in MVP, assume 1:1 but log/warn?
                 # Or just store as is.
                 self.base_quantity = self.quantity

        # Update Item Stock Quantity
        is_new = self.pk is None
        
        # We only update stock on creation to avoid double-counting on edits
        # Edits should be handled by a separate adjustment transaction or requiring a delete+recreate flow
        if is_new:
            # Determine direction
            if self.transaction_type in ['receipt', 'return']:
                self.item.stock_quantity += self.base_quantity
            elif self.transaction_type == 'issue':
                self.item.stock_quantity -= self.base_quantity
            elif self.transaction_type == 'adjustment':
                # For adjustment, we assume the quantity dictates the change directly
                # If quantity is positive -> Add, Negative -> Subtract
                # But Base Quantity is usually positive absolute value?
                # Let's assume Adjustment adds base_quantity (user can enter negative qty if supported, 
                # but models usually enforce positive). 
                # Better approach: Adjustment adds. To reduce, use negative.
                # Since we likely enforce positive quantity in UI, let's treat Adjustment as ADD.
                # If user wants to reduce, they should use Issue or we need a specific 'Adjustment Out' type.
                # For now, let's treat Adjustment as ADD (like Receipt) but allowing negative inputs if valid.
                self.item.stock_quantity += self.base_quantity
            
            self.item.save()
        
        super().save(*args, **kwargs)
        
        # Improve this logic in signals or manager method later. Use signals.py for cleaner separation?
        # For now, I'll rely on a signal or separate method, NOT save() to avoid recursion or side effects.

class Quotation(SoftDeleteMixin):
    """Quotation/Estimate model for creating quotations"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    DISCOUNT_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    quotation_number = models.CharField(max_length=50, unique=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='quotations')
    quotation_date = models.DateField()
    valid_until = models.DateField(blank=True, null=True)
    
    # Tax relationship
    tax = models.ForeignKey(Tax, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    
    # Calculated fields
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percentage')
    discount_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    discount_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    ton = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Total weight in tons'
    )
    
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    class Meta:
        ordering = ['-quotation_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'quotation_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.quotation_number} - {self.company.name} - Rs {self.total_amount}"

    def calculate_totals(self):
        """Calculate subtotal, tax, discount, and total amounts"""
        # Calculate subtotal from items
        self.subtotal = sum(item.subtotal for item in self.items.all())
        
        # Calculate tax amount
        if self.tax:
            self.tax_amount = (self.subtotal * self.tax.rate) / Decimal('100.00')
        else:
            self.tax_amount = Decimal('0.00')
        
        # Calculate discount amount
        if self.discount_type == 'percentage':
            self.discount_amount = (self.subtotal * self.discount_value) / Decimal('100.00')
        else:
            self.discount_amount = self.discount_value
        
        # Calculate total
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount
        
        # Ensure total is not negative
        if self.total_amount < Decimal('0.00'):
            self.total_amount = Decimal('0.00')

    def save(self, *args, **kwargs):
        # Auto-generate quotation number if not set
        if not self.quotation_number:
            from datetime import datetime
            year = datetime.now().year
            last_quotation = Quotation.objects.filter(
                quotation_number__startswith=f'QT-{year}-'
            ).order_by('-quotation_number').first()
            
            if last_quotation:
                last_number = int(last_quotation.quotation_number.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.quotation_number = f'QT-{year}-{new_number:04d}'
        
        super().save(*args, **kwargs)


class QuotationItem(SoftDeleteMixin):
    """Quotation item model for line items in quotations"""
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotation_items'
    )
    
    # Item details (can be from inventory or manual entry)
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    unit = models.CharField(max_length=50, default='pcs')
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    machine_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.item_name} x {self.quantity} - Rs {self.subtotal}"

    def calculate_subtotal(self):
        """Calculate subtotal for this item"""
        self.subtotal = self.quantity * self.unit_price

    def save(self, *args, **kwargs):
        # Auto-populate from inventory item if selected
        if self.inventory_item and not self.item_name:
            self.item_name = self.inventory_item.name
            self.description = self.inventory_item.description
            self.unit_price = self.inventory_item.unit_price
            self.unit = self.inventory_item.unit
        
        # Calculate subtotal
        self.calculate_subtotal()
        
        super().save(*args, **kwargs)
        
        # Update quotation totals
        self.quotation.calculate_totals()
        self.quotation.save()


class Machine(SoftDeleteMixin):
    """Machine model for manufacturing units"""
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class MachineRequirement(models.Model):
    """BOM: Materials required per unit/run of a machine"""
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='requirements')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=4, help_text="Quantity required per unit/run")

    class Meta:
        unique_together = ('machine', 'inventory_item')

    def __str__(self):
        return f"{self.inventory_item.name} for {self.machine.name}"

class Demand(SoftDeleteMixin):
    """Demand sheet for a specific client/order"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('finalized', 'Finalized'),
    ]
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='demands')
    date = models.DateField(default=timezone.now)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Demand for {self.company.name} - {self.date}"

class DemandMachineOrder(models.Model):
    """Input: Specific Machines requested in a Demand"""
    demand = models.ForeignKey(Demand, on_delete=models.CASCADE, related_name='machine_orders')
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=15, decimal_places=2, help_text="Number of runs/units")

    def __str__(self):
        return f"{self.quantity} x {self.machine.name}"

class DemandMaterial(models.Model):
    """Output: Calculated Material Requirements for the Demand"""
    demand = models.ForeignKey(Demand, on_delete=models.CASCADE, related_name='materials')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=15, decimal_places=4)

    def __str__(self):
        return f"{self.quantity} x {self.inventory_item.name}"

