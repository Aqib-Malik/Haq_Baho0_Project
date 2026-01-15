from django.db import models
from django.core.validators import MinValueValidator
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

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} - Rs {self.unit_price}/{self.unit}"


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

