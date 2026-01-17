import { Component, Inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';

import { QuotationService } from '../../../services/quotation.service';
import { NotificationService } from '../../../services/notification.service';
import { Company } from '../../../models/company.model';
import { Tax, InventoryItem, Quotation } from '../../../models/quotation.model';
import { ItemDialogComponent } from '../item-dialog/item-dialog.component';

@Component({
    selector: 'app-quotation-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatDividerModule,
        MatTableModule
    ],
    templateUrl: './quotation-form-dialog.component.html',
    styleUrl: './quotation-form-dialog.component.css'
})
export class QuotationFormDialogComponent implements OnInit {
    quotationForm!: FormGroup;
    companies: Company[] = [];

    taxes = signal<Tax[]>([]);
    inventoryItems = signal<InventoryItem[]>([]);
    isLoading = signal<boolean>(false);
    isEditMode = false;

    // Calculation methods (not computed - called directly in template)
    getSubtotal(): number {
        if (!this.quotationForm) return 0;

        const itemsArray = this.quotationForm.get('items') as FormArray;
        if (!itemsArray || itemsArray.length === 0) return 0;

        let total = 0;
        itemsArray.controls.forEach(item => {
            const qty = parseFloat(item.get('quantity')?.value || 0);
            const price = parseFloat(item.get('unit_price')?.value || 0);
            total += qty * price;
        });

        return total;
    }

    getTotal(): number {
        return this.getSubtotal() + this.getTaxAmount();
    }

    // Keep these for backward compatibility (just call the methods)
    subtotal = computed(() => this.getSubtotal());
    totalAmount = computed(() => this.getTotal());

    getTaxAmount(): number {
        const taxId = this.quotationForm?.get('tax')?.value;
        if (!taxId) return 0;
        const tax = this.taxes().find(t => t.id === taxId);
        if (!tax) return 0;
        return (this.getSubtotal() * parseFloat(tax.rate)) / 100;
    }

    statusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' }
    ];

    displayedColumns: string[] = ['item_name', 'quantity', 'unit_price', 'subtotal', 'actions'];

    constructor(
        private fb: FormBuilder,
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        public dialogRef: MatDialogRef<QuotationFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { quotation: Quotation | null, companies: Company[] }
    ) {
        this.companies = data.companies;
        this.isEditMode = !!data.quotation;
    }

    ngOnInit(): void {
        this.initForm();
        this.loadTaxes();
        this.loadInventoryItems();

        if (this.data.quotation) {
            this.loadQuotation(this.data.quotation.id);
        }
    }

    initForm(): void {
        const today = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        this.quotationForm = this.fb.group({
            company: [this.data.quotation?.company || '', Validators.required],
            quotation_date: [this.data.quotation?.quotation_date ? new Date(this.data.quotation.quotation_date) : today, Validators.required],
            valid_until: [this.data.quotation?.valid_until ? new Date(this.data.quotation.valid_until) : validUntil],
            notes: [this.data.quotation?.notes || ''],
            status: [this.data.quotation?.status || 'draft'],
            tax: [this.data.quotation?.tax || null],
            items: this.fb.array([])
        });

        // Don't add empty item automatically - user will add items via dialog
    }

    get items(): FormArray {
        return this.quotationForm.get('items') as FormArray;
    }

    createItemFormGroup(item?: any): FormGroup {
        return this.fb.group({
            id: [item?.id || null],
            inventory_item: [item?.inventory_item || null],
            item_name: [item?.item_name || '', Validators.required],
            description: [item?.description || ''],
            quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.01)]],
            unit_price: [item?.unit_price || 0, [Validators.required, Validators.min(0)]],
            unit: [item?.unit || 'pcs', Validators.required],
            machine_cost: [item?.machine_cost || 0, Validators.min(0)],
            use_manual: [!item?.inventory_item]
        });
    }

    addItem(): void {
        const dialogRef = this.dialog.open(ItemDialogComponent, {
            width: '500px',
            data: { item: null }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const newItem = this.createItemFormGroup(result);
                this.items.push(newItem);
                // Force change detection
                this.cdr.detectChanges();
                // Trigger form update to recalculate totals
                this.quotationForm.updateValueAndValidity();
            }
        });
    }

    editItem(index: number): void {
        const item = this.items.at(index).value;
        const dialogRef = this.dialog.open(ItemDialogComponent, {
            width: '500px',
            data: { item: item }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.items.at(index).patchValue(result);
                // Force change detection
                this.cdr.detectChanges();
                // Trigger form update to recalculate totals
                this.quotationForm.updateValueAndValidity();
            }
        });
    }

    removeItem(index: number): void {
        this.items.removeAt(index);
        // Force change detection to update table
        this.cdr.detectChanges();
        // Trigger form update to recalculate totals
        this.quotationForm.updateValueAndValidity();
    }

    onInventoryItemSelected(index: number, itemId: number): void {
        const item = this.inventoryItems().find(i => i.id === itemId);
        if (item) {
            const itemForm = this.items.at(index);
            itemForm.patchValue({
                item_name: item.name,
                description: item.description || '',
                unit_price: item.unit_price,
                unit: item.unit
            });
        }
    }

    toggleManualEntry(index: number, useManual: boolean): void {
        const itemForm = this.items.at(index);
        if (useManual) {
            itemForm.patchValue({
                inventory_item: null,
                item_name: '',
                description: '',
                unit_price: 0,
                unit: 'pcs'
            });
        }
    }

    loadTaxes(): void {
        this.quotationService.getTaxes(true).subscribe({
            next: (taxes) => {
                this.taxes.set(taxes);
                const defaultTax = taxes.find(t => t.is_default);
                if (defaultTax && !this.isEditMode) {
                    this.quotationForm.patchValue({ tax: defaultTax.id });
                }
            },
            error: (error) => {
                console.error('Error loading taxes:', error);
            }
        });
    }

    loadInventoryItems(): void {
        this.quotationService.getInventoryItems().subscribe({
            next: (items) => this.inventoryItems.set(items),
            error: (error) => console.error('Error loading inventory items:', error)
        });
    }

    loadQuotation(id: number): void {
        this.isLoading.set(true);
        this.quotationService.getQuotation(id).subscribe({
            next: (quotation) => {
                this.quotationForm.patchValue({
                    company: quotation.company,
                    quotation_date: new Date(quotation.quotation_date),
                    valid_until: quotation.valid_until ? new Date(quotation.valid_until) : null,
                    discount_type: quotation.discount_type,
                    discount_value: quotation.discount_value,
                    notes: quotation.notes,
                    status: quotation.status,
                    tax: quotation.tax
                });

                this.items.clear();
                if (quotation.items && quotation.items.length > 0) {
                    quotation.items.forEach(item => {
                        this.items.push(this.createItemFormGroup(item));
                    });
                }
                // Don't add empty item automatically

                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading quotation:', error);
                this.notificationService.showError('Failed to load quotation');
                this.isLoading.set(false);
                this.dialogRef.close();
            }
        });
    }

    onSubmit(): void {
        if (this.quotationForm.invalid) {
            this.quotationForm.markAllAsTouched();
            // Don't show notification - inline errors are enough
            return;
        }

        if (this.items.length === 0) {
            this.notificationService.showError('Please add at least one item');
            return;
        }

        this.isLoading.set(true);
        const formValue = this.quotationForm.value;

        const quotationData = {
            ...formValue,
            quotation_date: this.formatDate(formValue.quotation_date),
            valid_until: formValue.valid_until ? this.formatDate(formValue.valid_until) : null,
            items: formValue.items.map((item: any) => ({
                ...item,
                inventory_item: item.use_manual ? null : item.inventory_item
            }))
        };

        const request = this.isEditMode
            ? this.quotationService.updateQuotation(this.data.quotation!.id, quotationData)
            : this.quotationService.createQuotation(quotationData);

        request.subscribe({
            next: () => {
                this.notificationService.showSuccess(
                    this.isEditMode ? 'Quotation updated successfully' : 'Quotation created successfully'
                );
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error saving quotation:', error);
                this.notificationService.showError('Failed to save quotation');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatCurrency(amount: number): string {
        return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    getItemSubtotal(index: number): number {
        const item = this.items.at(index);
        const qty = parseFloat(item.get('quantity')?.value || 0);
        const price = parseFloat(item.get('unit_price')?.value || 0);
        return qty * price;
    }

    getSelectedTaxRate(): string {
        const taxId = this.quotationForm.get('tax')?.value;
        if (!taxId) return '0';
        const tax = this.taxes().find(t => t.id === taxId);
        return tax ? tax.rate : '0';
    }

}
