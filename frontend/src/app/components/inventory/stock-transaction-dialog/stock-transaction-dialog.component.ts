import { Component, Inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
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
                    <h2 class="dialog-title">{{ isEditMode ? 'Edit' : 'New' }} Stock Transaction</h2>
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
                        <input matInput [matAutocomplete]="auto" [formControl]="itemFilterCtrl" placeholder="Search item...">
                        <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayItemFn" 
                            (optionSelected)="onAutocompleteSelect($event)">
                            @for (item of filteredItems(); track item.id) {
                                <mat-option [value]="item">
                                    {{ item.name }} ({{item.stock_quantity}} {{item.unit}})
                                </mat-option>
                            }
                        </mat-autocomplete>
                        <mat-icon matSuffix>search</mat-icon>
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

                    <!-- Location (Autocomplete) -->
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Location</mat-label>
                        <input matInput [matAutocomplete]="locAuto" [formControl]="locationFilterCtrl" placeholder="Search location...">
                        <mat-autocomplete #locAuto="matAutocomplete" [displayWith]="displayLocationFn"
                             (optionSelected)="onLocationAutocompleteSelect($event)">
                            <mat-option [value]="null">-- Default --</mat-option>
                            @for (loc of filteredLocations(); track loc.id) {
                                <mat-option [value]="loc">{{ loc.name }}</mat-option>
                            }
                        </mat-autocomplete>
                        <mat-icon matPrefix>place</mat-icon>
                    </mat-form-field>

                    <!-- Batch (if enabled) -->
                     @if (showBatchField()) {
                        <div class="batch-section">
                            <div class="batch-header">
                                <span class="section-label">Batch Details</span>
                                <button mat-stroked-button color="primary" type="button" (click)="toggleNewBatch()" class="small-btn">
                                    <mat-icon>{{ isNewBatch() ? 'list' : 'add' }}</mat-icon>
                                    {{ isNewBatch() ? 'Select Existing' : 'New Batch' }}
                                </button>
                            </div>

                            @if (!isNewBatch()) {
                                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                                    <mat-label>Batch / Lot</mat-label>
                                    <mat-select formControlName="batch">
                                        <mat-option [value]="null">-- None --</mat-option>
                                        @for (b of itemBatches(); track b.id) {
                                            <mat-option [value]="b.id">{{ b.batch_number }} (Exp: {{b.expiry_date}})</mat-option>
                                        }
                                    </mat-select>
                                    <mat-icon matPrefix>qr_code_2</mat-icon>
                                </mat-form-field>
                            } @else {
                                <div class="new-batch-grid">
                                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                                        <mat-label>Batch Number*</mat-label>
                                        <input matInput formControlName="new_batch_number">
                                        <mat-icon matPrefix>tag</mat-icon>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                                        <mat-label>Expiry Date</mat-label>
                                        <input matInput [matDatepicker]="expPicker" formControlName="new_batch_expiry">
                                        <mat-datepicker-toggle matIconSuffix [for]="expPicker"></mat-datepicker-toggle>
                                        <mat-datepicker #expPicker></mat-datepicker>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                                        <mat-label>Mfg Date</mat-label>
                                        <input matInput [matDatepicker]="mfgPicker" formControlName="new_batch_mfg">
                                        <mat-datepicker-toggle matIconSuffix [for]="mfgPicker"></mat-datepicker-toggle>
                                        <mat-datepicker #mfgPicker></mat-datepicker>
                                    </mat-form-field>
                                </div>
                            }
                        </div>
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
                        {{ isLoading() ? 'Saving...' : (isEditMode ? 'Update Transaction' : 'Record Transaction') }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  `,
    styleUrls: ['./stock-transaction-dialog.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class StockTransactionDialogComponent implements OnInit {
    form!: FormGroup;
    isLoading = signal<boolean>(false);
    isEditMode = false;

    items = signal<InventoryItem[]>([]);
    filteredItems = signal<InventoryItem[]>([]);
    locations = signal<Location[]>([]);
    filteredLocations = signal<Location[]>([]);
    units = signal<Unit[]>([]);
    availableUnits = signal<Unit[]>([]);
    itemBatches = signal<Batch[]>([]);

    selectedItem: InventoryItem | null = null;
    showBatchField = signal<boolean>(false);

    itemFilterCtrl = new FormControl<string | InventoryItem>('');
    locationFilterCtrl = new FormControl<string | Location>('');
    isNewBatch = signal<boolean>(false);

    constructor(
        private fb: FormBuilder,
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        public dialogRef: MatDialogRef<StockTransactionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { type?: string, transaction?: StockTransaction }
    ) {
        this.isEditMode = !!data.transaction;
    }

    ngOnInit(): void {
        this.initForm();
        this.loadInitialData();

        this.itemFilterCtrl.valueChanges.subscribe((val: string | InventoryItem | null) => {
            if (typeof val === 'string') {
                this.filterItems(val);
            } else if (!val) {
                this.filterItems('');
            }
        });

        this.locationFilterCtrl.valueChanges.subscribe((val: string | Location | null) => {
            if (typeof val === 'string') {
                this.filterLocations(val);
            } else if (!val) {
                this.filterLocations('');
            }
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

            // New batch fields
            new_batch_number: [''],
            new_batch_expiry: [null],
            new_batch_mfg: [null],

            notes: ['']
        });
    }

    toggleNewBatch(): void {
        this.isNewBatch.update(v => !v);
        const isNew = this.isNewBatch();

        if (isNew) {
            this.form.get('batch')?.setValue(null);
            this.form.get('batch')?.clearValidators();
            this.form.get('new_batch_number')?.setValidators(Validators.required);
        } else {
            this.form.get('new_batch_number')?.setValue('');
            this.form.get('new_batch_number')?.clearValidators();
            this.form.get('new_batch_expiry')?.setValue(null);
            this.form.get('new_batch_mfg')?.setValue(null);
        }

        this.form.get('batch')?.updateValueAndValidity();
        this.form.get('new_batch_number')?.updateValueAndValidity();
    }

    loadInitialData(): void {
        // Use forkJoin to load all dependencies first
        forkJoin({
            items: this.quotationService.getInventoryItems(),
            locations: this.quotationService.getLocations(),
            units: this.quotationService.getUnits()
        }).subscribe({
            next: (result) => {
                this.items.set(result.items);
                this.filteredItems.set(result.items);
                this.locations.set(result.locations);
                this.filteredLocations.set(result.locations);

                console.log('Units loaded:', result.units);
                this.units.set(result.units);
                // Default to all units initially
                this.availableUnits.set(result.units);

                // If editing, patch the form
                if (this.data.transaction) {
                    this.patchTransactionData(this.data.transaction);
                }
            },
            error: (err) => {
                console.error('Error loading initial data', err);
                this.notificationService.showError('Failed to load form data');
            }
        });
    }

    patchTransactionData(transaction: StockTransaction): void {
        // Find the item
        const item = this.items().find(i => i.id === transaction.item);
        if (item) {
            this.itemFilterCtrl.setValue(item); // Set autocomplete display
            this.form.get('item')?.setValue(item.id);

            // Trigger item selection logic (filtering units, batches)
            this.onItemSelect(item.id);
        }

        // Find the location
        if (transaction.location) {
            const loc = this.locations().find(l => l.id === transaction.location);
            if (loc) {
                this.locationFilterCtrl.setValue(loc);
            }
        }

        // Patch other fields
        // Note: onItemSelect might override some fields (like unit/location) with defaults, 
        // so we patch AFTER select to ensure transaction values take precedence
        this.form.patchValue({
            transaction_type: transaction.transaction_type,
            transaction_date: new Date(transaction.transaction_date),
            reference_number: transaction.reference_number,
            quantity: transaction.quantity,
            unit: transaction.unit,
            location: transaction.location,
            batch: transaction.batch,
            notes: transaction.notes
        });
    }

    filterItems(search: string): void {
        const term = search.toLowerCase();
        this.filteredItems.set(
            this.items().filter(i => i.name.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term))
        );
    }

    filterLocations(search: string): void {
        const term = search.toLowerCase();
        this.filteredLocations.set(
            this.locations().filter(l => l.name.toLowerCase().includes(term))
        );
    }

    displayItemFn(item: InventoryItem): string {
        return item ? item.name : '';
    }

    displayLocationFn(location: Location): string {
        return location ? location.name : '';
    }

    onAutocompleteSelect(event: any): void {
        const item: InventoryItem = event.option.value;
        this.form.get('item')?.setValue(item.id);
        this.onItemSelect(item.id);
    }

    onLocationAutocompleteSelect(event: any): void {
        const location: Location = event.option.value;
        this.form.get('location')?.setValue(location ? location.id : null);
    }

    onItemSelect(itemId: number): void {
        const item = this.items().find(i => i.id === itemId);
        this.selectedItem = item || null;
        console.log('Selected Item:', item);

        // Reset new batch state when item changes
        this.isNewBatch.set(false);
        this.form.get('new_batch_number')?.clearValidators();
        this.form.get('new_batch_number')?.updateValueAndValidity();

        if (item) {
            this.showBatchField.set(item.batch_tracking);

            const allUnits = this.units();
            if (item.base_unit) {
                const filtered = allUnits.filter(u => u.id === item.base_unit || u.base_unit === item.base_unit);
                this.availableUnits.set(filtered);
            } else {
                this.availableUnits.set(allUnits);
            }

            // Only set defaults if we are NOT in the middle of patching (simple heuristic)
            // Or better: just set defaults. patchTransactionData will override them immediately after if called from load.
            // When user manually selects, we want defaults.
            if (item.base_unit) {
                this.form.get('unit')?.setValue(item.base_unit);
            }

            if (item.batch_tracking) {
                this.quotationService.getBatches(item.id).subscribe(batches => {
                    this.itemBatches.set(batches);
                });
            }

            if (item.default_location) {
                const defaultLoc = this.locations().find(l => l.id === item.default_location);
                if (defaultLoc) {
                    this.locationFilterCtrl.setValue(defaultLoc);
                    this.form.get('location')?.setValue(item.default_location);
                }
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

        // Format batch dates if present
        if (this.isNewBatch()) {
            if (data.new_batch_expiry) {
                payload.new_batch_expiry = data.new_batch_expiry.toISOString().split('T')[0];
            }
            if (data.new_batch_mfg) {
                payload.new_batch_mfg = data.new_batch_mfg.toISOString().split('T')[0];
            }
        }

        const request$ = this.isEditMode && this.data.transaction
            ? this.quotationService.updateStockTransaction(this.data.transaction.id, payload)
            : this.quotationService.createStockTransaction(payload);

        request$.subscribe({
            next: () => {
                this.notificationService.showSuccess(`Transaction ${this.isEditMode ? 'updated' : 'recorded'} successfully`);
                this.dialogRef.close(true);
            },
            error: (err) => {
                console.error(err);
                this.notificationService.showError(`Failed to ${this.isEditMode ? 'update' : 'record'} transaction`);
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
