import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { MachineService } from '../../../services/machine.service';
import { QuotationService } from '../../../services/quotation.service';
import { Machine } from '../../../models/machine.model';
import { Unit } from '../../../models/quotation.model';

export interface MachineLineData {
  id?: number | null;
  machine: number | null;
  item_name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  inventory_item?: number | null;
  machine_cost?: number | null;
  use_manual?: boolean;
}

@Component({
  selector: 'app-machine-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './machine-dialog.component.html',
  styleUrl: './machine-dialog.component.css'
})
export class MachineDialogComponent implements OnInit {
  machineForm!: FormGroup;
  machines: Machine[] = [];
  unitsList = signal<Unit[]>([]);
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private machineService: MachineService,
    private quotationService: QuotationService,
    public dialogRef: MatDialogRef<MachineDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { line: MachineLineData | null }
  ) {
    this.isEditMode = !!data?.line;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadMachines();
    this.loadUnits();
  }

  loadUnits(): void {
    this.quotationService.getUnits().subscribe({
      next: (list) => {
        const units = Array.isArray(list) ? list : [];
        this.unitsList.set(units);
        const currentUnit = this.machineForm?.get('unit')?.value;
        if (units.length && currentUnit != null && !units.some(u => u.code === currentUnit)) {
          this.machineForm.patchValue({ unit: units[0].code });
        }
      },
      error: (err) => console.error('Error loading units:', err)
    });
  }

  initForm(): void {
    const line = this.data?.line;
    this.machineForm = this.fb.group({
      id: [line?.id ?? null],
      machine: [line?.machine ?? null, Validators.required],
      item_name: [line?.item_name ?? '', Validators.required],
      description: [line?.description ?? ''],
      quantity: [line?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      unit_price: [line?.unit_price ?? 0, [Validators.required, Validators.min(0)]],
      unit: [line?.unit ?? 'hr', Validators.required]
    });
  }

  loadMachines(): void {
    this.machineService.getMachines().subscribe({
      next: (list) => (this.machines = list),
      error: (err) => console.error('Error loading machines:', err)
    });
  }

  onMachineSelected(machineId: number): void {
    const machine = this.machines.find(m => m.id === machineId);
    if (machine) {
      const amount = machine.amount != null && machine.amount !== ''
        ? parseFloat(String(machine.amount))
        : 0;
      this.machineForm.patchValue({
        item_name: machine.name,
        description: machine.description || '',
        unit_price: amount
      });
    }
  }

  onSubmit(): void {
    if (this.machineForm.invalid) {
      this.machineForm.markAllAsTouched();
      return;
    }
    const value = this.machineForm.value;
    const result: MachineLineData = {
      id: value.id,
      machine: value.machine,
      item_name: value.item_name,
      description: value.description || '',
      quantity: value.quantity,
      unit: value.unit,
      unit_price: value.unit_price,
      inventory_item: null,
      machine_cost: null,
      use_manual: false
    };
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getSubtotal(): number {
    const qty = parseFloat(this.machineForm.get('quantity')?.value || 0);
    const price = parseFloat(this.machineForm.get('unit_price')?.value || 0);
    return qty * price;
  }

  formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
