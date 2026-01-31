import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { QuotationService } from '../../../services/quotation.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItem, Unit, Location } from '../../../models/quotation.model';

@Component({
    selector: 'app-inventory-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatTooltipModule,
        MatTooltipModule,
        MatAutocompleteModule,
        MatCheckboxModule
    ],
    templateUrl: './inventory-form-dialog.component.html',
    styleUrl: './inventory-form-dialog.component.css'
})
export class InventoryFormDialogComponent implements OnInit {
    inventoryForm!: FormGroup;
    isLoading = signal<boolean>(false);
    isEditMode = false;

    categories = signal<string[]>([]);

    // Dynamic Units and Locations from Backend
    unitsList = signal<Unit[]>([]);
    locationsList = signal<Location[]>([]);

    constructor(
        private fb: FormBuilder,
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        public dialogRef: MatDialogRef<InventoryFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { item: InventoryItem | null }
    ) {
        this.isEditMode = !!data.item;
    }

    ngOnInit(): void {
        this.initForm();
        this.loadCategories();
        this.loadUnits();
        this.loadLocations();
    }

    initForm(): void {
        this.inventoryForm = this.fb.group({
            name: [this.data.item?.name || '', [Validators.required, Validators.minLength(2)]],
            description: [this.data.item?.description || ''],
            unit_price: [this.data.item?.unit_price || 0, [Validators.required, Validators.min(0)]],
            unit: [this.data.item?.unit || ''], // Will be set by base_unit change
            category: [this.data.item?.category || ''],
            sku: [this.data.item?.sku || ''],

            // New Inventory Fields
            base_unit: [this.data.item?.base_unit || null, Validators.required],
            min_stock_level: [this.data.item?.min_stock_level || 0, [Validators.min(0)]],
            reorder_level: [this.data.item?.reorder_level || 0, [Validators.min(0)]],
            default_location: [this.data.item?.default_location || null],
            batch_tracking: [this.data.item?.batch_tracking || false]
        });
    }

    loadCategories(): void {
        this.quotationService.getCategories().subscribe({
            next: (cats) => {
                this.categories.set(cats);
            },
            error: (err) => console.error('Error loading categories:', err)
        });
    }

    loadUnits(): void {
        this.quotationService.getUnits().subscribe({
            next: (data) => this.unitsList.set(data),
            error: (err) => console.error('Error loading units:', err)
        });
    }

    loadLocations(): void {
        this.quotationService.getLocations().subscribe({
            next: (data) => this.locationsList.set(data),
            error: (err) => console.error('Error loading locations:', err)
        });
    }

    onUnitChange(event: any): void {
        const unitId = event.value;
        const selectedUnit = this.unitsList().find(u => u.id === unitId);
        if (selectedUnit) {
            this.inventoryForm.patchValue({ unit: selectedUnit.code });
        }
    }

    onSubmit(): void {
        if (this.inventoryForm.invalid) {
            this.inventoryForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formData = this.inventoryForm.value;

        // Ensure unit is set (fallback to 'pcs' if something went wrong, though validation should catch it)
        if (!formData.unit) {
            formData.unit = 'pcs';
        }

        const request = this.isEditMode
            ? this.quotationService.updateInventoryItem(this.data.item!.id, formData)
            : this.quotationService.createInventoryItem(formData);

        request.subscribe({
            next: () => {
                this.notificationService.showSuccess(
                    this.isEditMode ? 'Item updated successfully' : 'Item added successfully'
                );
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error saving item:', error);
                this.notificationService.showError('Failed to save item');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
