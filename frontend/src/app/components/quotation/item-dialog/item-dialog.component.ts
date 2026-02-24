import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { QuotationService } from '../../../services/quotation.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItem, Unit } from '../../../models/quotation.model';

@Component({
  selector: 'app-item-dialog',
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
    MatSlideToggleModule
  ],
  templateUrl: './item-dialog.component.html',
  styleUrl: './item-dialog.component.css'
})
export class ItemDialogComponent implements OnInit {
  itemForm!: FormGroup;
  inventoryItems = signal<InventoryItem[]>([]);
  unitsList = signal<Unit[]>([]);
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private notificationService: NotificationService,
    public dialogRef: MatDialogRef<ItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: any | null }
  ) {
    this.isEditMode = !!data.item;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadInventoryItems();
    this.loadUnits();
  }

  loadUnits(): void {
    this.quotationService.getUnits().subscribe({
      next: (list) => {
        this.unitsList.set(Array.isArray(list) ? list : []);
        const units = this.unitsList();
        const currentUnit = this.itemForm?.get('unit')?.value;
        if (units.length && currentUnit !== null && currentUnit !== undefined && !units.some(u => u.code === currentUnit)) {
          this.itemForm.patchValue({ unit: units[0].code });
        }
      },
      error: (err) => console.error('Error loading units:', err)
    });
  }

  initForm(): void {
    const item = this.data.item;
    this.itemForm = this.fb.group({
      id: [item?.id || null],
      inventory_item: [item?.inventory_item || null],
      item_name: [item?.item_name || '', Validators.required],
      description: [item?.description || ''],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unit_price: [item?.unit_price || 0, [Validators.required, Validators.min(0)]],
      unit: [item?.unit || 'pcs', Validators.required],
      machine_cost: [item?.machine_cost || 0, Validators.min(0)]
    });
  }

  loadInventoryItems(): void {
    this.quotationService.getInventoryItems().subscribe({
      next: (items) => this.inventoryItems.set(items),
      error: (error) => console.error('Error loading inventory items:', error)
    });
  }

  onInventoryItemSelected(itemId: number): void {
    const item = this.inventoryItems().find(i => i.id === itemId);
    if (item) {
      this.itemForm.patchValue({
        item_name: item.name,
        description: item.description || '',
        unit_price: item.unit_price,
        unit: item.unit
      });
    }
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      // Don't show notification - inline errors are enough and snackbar appears behind dialogs
      return;
    }

    const formValue = this.itemForm.value;
    const itemData = {
      ...formValue
    };

    this.dialogRef.close(itemData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getSubtotal(): number {
    const qty = parseFloat(this.itemForm.get('quantity')?.value || 0);
    const price = parseFloat(this.itemForm.get('unit_price')?.value || 0);
    return qty * price;
  }

  formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
