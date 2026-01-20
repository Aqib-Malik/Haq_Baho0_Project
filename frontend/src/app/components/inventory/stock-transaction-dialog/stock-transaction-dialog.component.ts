
import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { QuotationService } from '../../../services/quotation.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItem, Unit, Location, Batch, StockTransaction } from '../../../models/quotation.model';

@Component({
    selector: 'app-stock-transaction-dialog',
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
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule
    ],
    template: `
    <div class="dialog-container">
        <div class="dialog-header">
            <div class="title-wrapper">
                <div class="icon-circle">
                    <mat-icon>receipt_long</mat-icon>
                </div>
                <div>
                    <h2 class="dialog-title">New Stock Transaction</h2>
                    <p class="dialog-subtitle">Record movement of inventory</p>
                </div>
            </div>
            <button mat-icon-button class="close-btn" (click)="onCancel()" type="button">
                <mat-icon>close</mat-icon>
            </button>
        </div>

        <div class="dialog-content">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="form-grid">
                    <!-- Transaction Type -->
                    <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
                        <mat-label>Transaction Type</mat-label>
                        <mat-select formControlName="transaction_type">
                            <mat-option value="receipt">Stock Receipt (In)</mat-option>
                            <mat-option value="issue">Stock Issue (Out)</mat-option>
                            <mat-option value="return">Stock Return (In)</mat-option>
                            <mat-option value="adjustment">Adjustment (+/-)</mat-option>
                        </mat-select>
                        <mat-icon matPrefix>sync_alt</mat-icon>
                    </mat-form-field>

                    <!-- Date -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Date</mat-label>
                        <input matInput [matDatepicker]="picker" formControlName="transaction_date">
                        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                        <mat-datepicker #picker></mat-datepicker>
                    </mat-form-field>

                    <!-- Reference -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Reference #</mat-label>
                        <input matInput formControlName="reference_number" placeholder="PO-123 or INV-456">
                        <mat-icon matPrefix>tag</mat-icon>
                    </mat-form-field>

                    <!-- Item Selection -->
                    <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
                        <mat-label>Item</mat-label>
                        <mat-select formControlName="item" (selectionChange)="onItemSelect($event.value)">
                            <mat-option>
                                <ngx-mat-select-search [formControl]="itemFilterCtrl" placeholderLabel="Find item..." 
                                    noEntriesFoundLabel="No item found"></ngx-mat-select-search>
                            </mat-option>
                             <!-- Simple Select for now, ideally autocomplete -->
                            @for (item of filteredItems(); track item.id) {
                                <mat-option [value]="item.id">{{ item.name }} ({{item.stock_quantity}} {{item.unit}})</mat-option>
                            }
                        </mat-select>
                        <mat-icon matPrefix>inventory_2</mat-icon>
                    </mat-form-field>

                    <!-- Quantity -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Quantity</mat-label>
                        <input matInput type="number" formControlName="quantity" min="0">
                        <mat-icon matPrefix>onetwothree</mat-icon>
                    </mat-form-field>

                    <!-- Unit -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Unit</mat-label>
                        <mat-select formControlName="unit">
                            @for (u of availableUnits(); track u.id) {
                                <mat-option [value]="u.id">{{ u.name }} ({{u.code}})</mat-option>
                            }
                        </mat-select>
                        <mat-icon matPrefix>straighten</mat-icon>
                    </mat-form-field>

                    <!-- Location -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Location</mat-label>
                        <mat-select formControlName="location">
                            <mat-option [value]="null">-- Default --</mat-option>
                            @for (loc of locations(); track loc.id) {
                                <mat-option [value]="loc.id">{{ loc.name }}</mat-option>
                            }
                        </mat-select>
                        <mat-icon matPrefix>place</mat-icon>
                    </mat-form-field>

                    <!-- Batch (if enabled) -->
                     @if (showBatchField()) {
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                            <mat-label>Batch / Lot</mat-label>
                            <!-- Can be free text or selection of existing batches -->
                            <mat-select formControlName="batch">
                                <mat-option [value]="null">-- None --</mat-option>
                                @for (b of itemBatches(); track b.id) {
                                    <mat-option [value]="b.id">{{ b.batch_number }} (Exp: {{b.expiry_date}})</mat-option>
                                }
                            </mat-select>
                            <mat-icon matPrefix>qr_code_2</mat-icon>
                        </mat-form-field>
                     }

                    <!-- Notes -->
                    <mat-form-field appearance="outline" class="full-width textarea-field" subscriptSizing="dynamic">
                        <mat-label>Notes</mat-label>
                        <textarea matInput formControlName="notes" rows="2"></textarea>
                        <mat-icon matPrefix>edit_note</mat-icon>
                    </mat-form-field>

                </div>

                <div class="dialog-actions">
                    <button mat-stroked-button type="button" (click)="onCancel()">Cancel</button>
                    <button mat-raised-button color="primary" type="submit" [disabled]="isLoading()">
                        <mat-icon>save_alt</mat-icon>
                        {{ isLoading() ? 'Saving...' : 'Record Transaction' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  `,
    styles: [`
    /* Reuse styles from inventory-form-dialog */
    .dialog-container { display: flex; flex-direction: column; height: 100%; max-height: 90vh; }
    .dialog-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: white; sticky: top; }
    .title-wrapper { display: flex; gap: 16px; align-items: center; }
    .icon-circle { background: linear-gradient(135deg, #0f172a, #334155); width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(15,23,42,0.2); color: white; }
    .dialog-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; font-family: 'Inter', sans-serif; }
    .dialog-subtitle { color: #64748b; font-size: 13px; margin: 2px 0 0 0; }
    .close-btn { color: #94a3b8; }
    .close-btn:hover { color: #ef4444; background: #fee2e2; }
    .dialog-content { padding: 24px; overflow-y: auto; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
    .full-width { grid-column: 1 / -1; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 16px; padding-top: 16px; margin-top: 16px; border-top: 1px solid #f1f5f9; }
    .dialog-actions button { padding: 0 24px; height: 40px; border-radius: 10px; font-weight: 600; }
    mat-form-field { width: 100%; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class StockTransactionDialogComponent implements OnInit {
    form!: FormGroup;
    isLoading = signal<boolean>(false);

    items = signal<InventoryItem[]>([]);
    filteredItems = signal<InventoryItem[]>([]);
    locations = signal<Location[]>([]);
    units = signal<Unit[]>([]);
    availableUnits = signal<Unit[]>([]);
    itemBatches = signal<Batch[]>([]);

    selectedItem: InventoryItem | null = null;
    showBatchField = signal<boolean>(false);

    itemFilterCtrl = new FormControl('');

    constructor(
        private fb: FormBuilder,
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        public dialogRef: MatDialogRef<StockTransactionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { type?: string }
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadInitialData();

        this.itemFilterCtrl.valueChanges.subscribe((val: string | null) => {
            this.filterItems(val || '');
        });
    }

    initForm(): void {
        this.form = this.fb.group({
            transaction_type: [this.data.type || 'receipt', Validators.required],
            transaction_date: [new Date(), Validators.required],
            reference_number: [''],
            item: [null, Validators.required],
            quantity: [null, [Validators.required, Validators.min(0.0001)]],
            unit: [null, Validators.required],
            location: [null],
            batch: [null],
            notes: ['']
        });
    }

    loadInitialData(): void {
        this.quotationService.getInventoryItems().subscribe(items => {
            this.items.set(items);
            this.filteredItems.set(items);
        });

        this.quotationService.getLocations().subscribe(locs => {
            this.locations.set(locs);
        });

        this.quotationService.getUnits().subscribe(units => {
            this.units.set(units);
        });
    }

    filterItems(search: string): void {
        const term = search.toLowerCase();
        this.filteredItems.set(
            this.items().filter(i => i.name.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term))
        );
    }

    onItemSelect(itemId: number): void {
        const item = this.items().find(i => i.id === itemId);
        this.selectedItem = item || null;

        if (item) {
            this.showBatchField.set(item.batch_tracking);

            const allUnits = this.units();
            if (item.base_unit) {
                this.availableUnits.set(
                    allUnits.filter(u => u.id === item.base_unit || u.base_unit === item.base_unit)
                );
            } else {
                this.availableUnits.set(allUnits);
            }

            if (item.base_unit) {
                this.form.get('unit')?.setValue(item.base_unit);
            }

            if (item.batch_tracking) {
                this.quotationService.getBatches(item.id).subscribe(batches => {
                    this.itemBatches.set(batches);
                });
            }

            if (item.default_location) {
                this.form.get('location')?.setValue(item.default_location);
            }
        }
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const data = this.form.value;
        const formattedDate = data.transaction_date.toISOString().split('T')[0];

        const payload: Partial<StockTransaction> = {
            ...data,
            transaction_date: formattedDate
        };

        this.quotationService.createStockTransaction(payload).subscribe({
            next: () => {
                this.notificationService.showSuccess('Transaction recorded successfully');
                this.dialogRef.close(true);
            },
            error: (err) => {
                console.error(err);
                this.notificationService.showError('Failed to record transaction');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
