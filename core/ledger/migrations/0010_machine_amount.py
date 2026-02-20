# Generated manually

from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0009_merge_0006_0008'),
    ]

    operations = [
        migrations.AddField(
            model_name='machine',
            name='amount',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Default rate/amount for this machine (user-defined)',
                max_digits=15,
                blank=True
            ),
        ),
    ]
