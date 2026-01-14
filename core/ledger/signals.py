from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Invoice, Payment, LedgerEntry


@receiver(post_save, sender=Invoice)
def create_ledger_entry_for_invoice(sender, instance, created, **kwargs):
    """Create or update ledger entry when invoice is created or updated"""
    if created:
        LedgerEntry.objects.create(
            company=instance.company,
            transaction_type='debit',
            transaction_number=instance.invoice_number,
            transaction_date=instance.invoice_date,
            description=instance.description,
            amount=instance.amount,
            reference=instance.reference,
            invoice=instance
        )
    else:
        # Update existing ledger entry if invoice is updated
        try:
            ledger_entry = LedgerEntry.objects.get(invoice=instance)
            ledger_entry.company = instance.company
            ledger_entry.transaction_number = instance.invoice_number
            ledger_entry.transaction_date = instance.invoice_date
            ledger_entry.description = instance.description
            ledger_entry.amount = instance.amount
            ledger_entry.reference = instance.reference
            ledger_entry.save()
        except LedgerEntry.DoesNotExist:
            # Create if it doesn't exist (for existing invoices)
            LedgerEntry.objects.create(
                company=instance.company,
                transaction_type='debit',
                transaction_number=instance.invoice_number,
                transaction_date=instance.invoice_date,
                description=instance.description,
                amount=instance.amount,
                reference=instance.reference,
                invoice=instance
            )


@receiver(post_delete, sender=Invoice)
def delete_ledger_entry_for_invoice(sender, instance, **kwargs):
    """Delete ledger entry when invoice is deleted"""
    LedgerEntry.objects.filter(invoice=instance).delete()


@receiver(post_save, sender=Payment)
def create_ledger_entry_for_payment(sender, instance, created, **kwargs):
    """Create or update ledger entry when payment is created or updated"""
    if created:
        LedgerEntry.objects.create(
            company=instance.company,
            transaction_type='credit',
            transaction_number=instance.payment_number,
            transaction_date=instance.payment_date,
            description=instance.description,
            amount=instance.amount,
            reference=instance.reference,
            payment_mode=instance.payment_mode,
            payment=instance
        )
    else:
        # Update existing ledger entry if payment is updated
        try:
            ledger_entry = LedgerEntry.objects.get(payment=instance)
            ledger_entry.company = instance.company
            ledger_entry.transaction_number = instance.payment_number
            ledger_entry.transaction_date = instance.payment_date
            ledger_entry.description = instance.description
            ledger_entry.amount = instance.amount
            ledger_entry.reference = instance.reference
            ledger_entry.payment_mode = instance.payment_mode
            ledger_entry.save()
        except LedgerEntry.DoesNotExist:
            # Create if it doesn't exist (for existing payments)
            LedgerEntry.objects.create(
                company=instance.company,
                transaction_type='credit',
                transaction_number=instance.payment_number,
                transaction_date=instance.payment_date,
                description=instance.description,
                amount=instance.amount,
                reference=instance.reference,
                payment_mode=instance.payment_mode,
                payment=instance
            )


@receiver(post_delete, sender=Payment)
def delete_ledger_entry_for_payment(sender, instance, **kwargs):
    """Delete ledger entry when payment is deleted"""
    LedgerEntry.objects.filter(payment=instance).delete()
