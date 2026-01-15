import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, startWith, map } from 'rxjs';

import { QuotationService } from '../../../services/quotation.service';
import { LedgerService } from '../../../services/ledger.service';
import { NotificationService } from '../../../services/notification.service';
import { Company } from '../../../models/company.model';
import { Tax, InventoryItem, Quotation, QuotationItem } from '../../../models/quotation.model';

@Component({
    selector: 'app-quotation-form',
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
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatTooltipModule
    ],
    templateUrl: './quotation-form.component.html',
    styleUrl: './quotation-form.component.css'
})
export class QuotationFormComponent implements OnInit {
    quotationForm!: FormGroup;
    companies = signal<Company[]>([]);
    taxes = signal<Tax[]>([]);
    inventoryItems = signal<InventoryItem[]>([]);
    isLoading = signal<boolean>(false);
    isEditMode = signal<boolean>(false);
    quotationId: number | null = null;

    // Computed values for calculations
    subtotal = computed(() => {
        let total = 0;
        const items = this.quotationForm?.get('items') as FormArray;
        if (items) {
            items.controls.forEach(item => {
                const qty = parseFloat(item.get('quantity')?.value || 0);
                const price = parseFloat(item.get('unit_price')?.value || 0);
                total += qty * price;
            });
        }
        return total;
    });

    taxAmount = computed(() => {
        const taxId = this.quotationForm?.get('tax')?.value;
        if (!taxId) return 0;
        const tax = this.taxes().find(t => t.id === taxId);
        if (!tax) return 0;
        return (this.subtotal() * parseFloat(tax.rate)) / 100;
    });

    discountAmount = computed(() => {
        const discountType = this.quotationForm?.get('discount_type')?.value;
        const discountValue = parseFloat(this.quotationForm?.get('discount_value')?.value || 0);
        if (discountType === 'percentage') {
            return (this.subtotal() * discountValue) / 100;
        }
        return discountValue;
    });

    totalAmount = computed(() => {
        return Math.max(0, this.subtotal() + this.taxAmount() - this.discountAmount());
    });

    statusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' }
    ];

    constructor(
        private fb: FormBuilder,
        private quotationService: QuotationService,
        private ledgerService: LedgerService,
        private notificationService: NotificationService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadCompanies();
        this.loadTaxes();
        this.loadInventoryItems();

        // Check if editing
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.quotationId = +params['id'];
                this.isEditMode.set(true);
                this.loadQuotation(this.quotationId);
            }
        });
    }

    initForm(): void {
        const today = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        this.quotationForm = this.fb.group({
            company: ['', Validators.required],
            quotation_date: [today, Validators.required],
            valid_until: [validUntil],
            tax: [null],
            discount_type: ['percentage'],
            discount_value: [0, [Validators.min(0)]],
            notes: [''],
            status: ['draft'],
            items: this.fb.array([])
        });

        // Add one empty item by default
        this.addItem();
    }

    get items(): FormArray {
        return this.quotationForm.get('items') as FormArray;
    }

    createItemFormGroup(item?: QuotationItem): FormGroup {
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
        this.items.push(this.createItemFormGroup());
    }

    removeItem(index: number): void {
        if (this.items.length > 1) {
            this.items.removeAt(index);
        } else {
            this.notificationService.showError('At least one item is required');
        }
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

    loadCompanies(): void {
        this.ledgerService.getCompanies().subscribe({
            next: (companies) => this.companies.set(companies),
            error: (error) => {
                console.error('Error loading companies:', error);
                this.notificationService.showError('Failed to load companies');
            }
        });
    }

    loadTaxes(): void {
        this.quotationService.getTaxes(true).subscribe({
            next: (taxes) => {
                this.taxes.set(taxes);
                // Set default tax if available
                const defaultTax = taxes.find(t => t.is_default);
                if (defaultTax && !this.isEditMode()) {
                    this.quotationForm.patchValue({ tax: defaultTax.id });
                }
            },
            error: (error) => {
                console.error('Error loading taxes:', error);
                this.notificationService.showError('Failed to load taxes');
            }
        });
    }

    loadInventoryItems(): void {
        this.quotationService.getInventoryItems().subscribe({
            next: (items) => this.inventoryItems.set(items),
            error: (error) => {
                console.error('Error loading inventory items:', error);
                this.notificationService.showError('Failed to load inventory items');
            }
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
                    tax: quotation.tax,
                    discount_type: quotation.discount_type,
                    discount_value: quotation.discount_value,
                    notes: quotation.notes,
                    status: quotation.status
                });

                // Clear and add items
                this.items.clear();
                if (quotation.items && quotation.items.length > 0) {
                    quotation.items.forEach(item => {
                        this.items.push(this.createItemFormGroup(item));
                    });
                } else {
                    this.addItem();
                }

                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading quotation:', error);
                this.notificationService.showError('Failed to load quotation');
                this.isLoading.set(false);
                this.router.navigate(['/quotations']);
            }
        });
    }

    onSubmit(): void {
        if (this.quotationForm.invalid) {
            this.quotationForm.markAllAsTouched();
            this.notificationService.showError('Please fill all required fields');
            return;
        }

        this.isLoading.set(true);
        const formValue = this.quotationForm.value;

        // Format dates
        const quotationData = {
            ...formValue,
            quotation_date: this.formatDate(formValue.quotation_date),
            valid_until: formValue.valid_until ? this.formatDate(formValue.valid_until) : null,
            items: formValue.items.map((item: any) => ({
                ...item,
                inventory_item: item.use_manual ? null : item.inventory_item
            }))
        };

        const request = this.isEditMode()
            ? this.quotationService.updateQuotation(this.quotationId!, quotationData)
            : this.quotationService.createQuotation(quotationData);

        request.subscribe({
            next: () => {
                this.notificationService.showSuccess(
                    this.isEditMode() ? 'Quotation updated successfully' : 'Quotation created successfully'
                );
                this.router.navigate(['/quotations']);
            },
            error: (error) => {
                console.error('Error saving quotation:', error);
                this.notificationService.showError('Failed to save quotation');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/quotations']);
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
