from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Company(models.Model):
    """Company model for tracking client/vendor information"""
    name = models.CharField(max_length=200, unique=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True, verbose_name="GSTIN")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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


class Invoice(models.Model):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.company.name} - {self.amount}"


class Payment(models.Model):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.payment_number} - {self.company.name} - {self.amount}"


class LedgerEntry(models.Model):
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
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Ledger Entries"
        ordering = ['transaction_date', 'created_at']
        indexes = [
            models.Index(fields=['company', 'transaction_date']),
            models.Index(fields=['transaction_type']),
        ]

    def __str__(self):
        return f"{self.transaction_number} - {self.company.name} - {self.transaction_type} - {self.amount}"
