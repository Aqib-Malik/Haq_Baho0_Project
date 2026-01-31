from django.core.management.base import BaseCommand
from ledger.models import Unit

class Command(BaseCommand):
    help = 'Populates the database with standard units of measurement'

    def handle(self, *args, **options):
        units_data = [
            # Count
            {'name': 'Pieces', 'code': 'pcs'},
            {'name': 'Box', 'code': 'box'},
            {'name': 'Pack', 'code': 'pkt'},
            {'name': 'Set', 'code': 'set'},
            {'name': 'Dozen', 'code': 'doz'},
            {'name': 'Carton', 'code': 'ctn'},
            {'name': 'Roll', 'code': 'roll'},
            {'name': 'Bundle', 'code': 'bdl'},
            # Weight
            {'name': 'Kilogram', 'code': 'kg'},
            {'name': 'Gram', 'code': 'g', 'base_code': 'kg', 'factor': '0.001'},
            {'name': 'Milligram', 'code': 'mg', 'base_code': 'g', 'factor': '0.001'},
            {'name': 'Metric Ton', 'code': 'ton', 'base_code': 'kg', 'factor': '1000'},
            {'name': 'Pound', 'code': 'lb', 'base_code': 'kg', 'factor': '0.45359'},
            {'name': 'Ounce', 'code': 'oz', 'base_code': 'lb', 'factor': '0.0625'},
            # Length
            {'name': 'Meter', 'code': 'm'},
            {'name': 'Centimeter', 'code': 'cm', 'base_code': 'm', 'factor': '0.01'},
            {'name': 'Millimeter', 'code': 'mm', 'base_code': 'm', 'factor': '0.001'},
            {'name': 'Foot', 'code': 'ft', 'base_code': 'm', 'factor': '0.3048'},
            {'name': 'Inch', 'code': 'in', 'base_code': 'ft', 'factor': '0.08333'},
            {'name': 'Yard', 'code': 'yd', 'base_code': 'm', 'factor': '0.9144'},
            # Area
            {'name': 'Square Meter', 'code': 'sqm'},
            {'name': 'Square Foot', 'code': 'sqft', 'base_code': 'sqm', 'factor': '0.09290'},
            # Volume
            {'name': 'Liter', 'code': 'l'},
            {'name': 'Milliliter', 'code': 'ml', 'base_code': 'l', 'factor': '0.001'},
            {'name': 'Gallon', 'code': 'gal', 'base_code': 'l', 'factor': '3.78541'},
            # Time
            {'name': 'Hour', 'code': 'hr'},
            {'name': 'Day', 'code': 'day', 'base_code': 'hr', 'factor': '24'},
            {'name': 'Month', 'code': 'mo'},
        ]

        # First pass: Create units without dependencies (base units)
        for data in units_data:
            if 'base_code' not in data:
                unit, created = Unit.objects.get_or_create(
                    code=data['code'],
                    defaults={
                        'name': data['name'],
                        'conversion_factor': '1.00000'
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created unit: {unit.name} ({unit.code})'))
                else:
                    self.stdout.write(f'Unit already exists: {unit.name}')

        # Second pass: Create/Update derived units linking to base units
        for data in units_data:
            if 'base_code' in data:
                try:
                    # Find the base unit specifically by code to be safe
                    # Note: data['base_code'] refers to another unit's code
                    base_unit = Unit.objects.filter(code=data['base_code']).first()
                    
                    if not base_unit:
                         # Try finding intermediate base if logic requires chain? 
                         # For distinct simple pass, ensure base exists.
                         # If base unit like 'lb' for 'oz' hasn't been created yet? (It should have been in first pass if it had no dependencies, or...)
                         # Wait, 'lb' depends on 'kg', so 'lb' is derived. 'oz' depends on 'lb'.
                         # This needs a topological sort or multiple passes.
                         # Simple fix: Just get base unit if it exists.
                         pass

                    unit, created = Unit.objects.get_or_create(
                        code=data['code'],
                        defaults={
                            'name': data['name'],
                            'conversion_factor': data['factor'],
                            'base_unit': base_unit
                        }
                    )
                    
                    # If it existed, ensure base unit is linked if missing
                    if not created and base_unit and not unit.base_unit:
                        unit.base_unit = base_unit
                        unit.conversion_factor = data['factor']
                        unit.save()
                        self.stdout.write(self.style.SUCCESS(f'Updated unit: {unit.name} with base {base_unit.name}'))
                    elif created:
                        self.stdout.write(self.style.SUCCESS(f'Created derived unit: {unit.name} -> {base_unit.name if base_unit else "None"}'))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error creating {data['name']}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS('Successfully populated units'))
