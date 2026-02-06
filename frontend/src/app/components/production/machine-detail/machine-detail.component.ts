import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MachineService } from '../../../services/machine.service';
import { QuotationService } from '../../../services/quotation.service';
import { Machine, MachineRequirement } from '../../../models/machine.model';
import { InventoryItem } from '../../../models/quotation.model';
import { InventoryFormDialogComponent } from '../../inventory/inventory-form-dialog/inventory-form-dialog.component';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-machine-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule, FormsModule,
        MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
        MatTableModule, MatSelectModule, MatAutocompleteModule, MatDialogModule,
        MatTooltipModule
    ],
    templateUrl: './machine-detail.component.html',
    styleUrls: ['./machine-detail.component.css']
})
export class MachineDetailComponent implements OnInit {
    machineId: number | null = null;
    machineForm: FormGroup;
    requirements = new MatTableDataSource<MachineRequirement>([]);
    displayedColumns: string[] = ['item', 'quantity', 'actions'];

    // Requirement Add Form
    inventoryItems: InventoryItem[] = [];
    filteredItems: Observable<InventoryItem[]> | undefined;
    newItemControl = new FormControl<string | InventoryItem>('', Validators.required);
    newQtyControl = new FormControl<number>(1, [Validators.required, Validators.min(0.0001)]);

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private machineService: MachineService,
        private quotationService: QuotationService,
        private cdr: ChangeDetectorRef,
        private dialog: MatDialog
    ) {
        this.machineForm = this.fb.group({
            name: ['', Validators.required],
            code: ['', Validators.required],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id && id !== 'new') {
                this.machineId = +id;
                this.loadMachine(this.machineId);
            }
        });

        this.quotationService.getInventoryItems().subscribe(items => {
            this.inventoryItems = items;
            this.filteredItems = this.newItemControl.valueChanges.pipe(
                startWith(''),
                map(value => {
                    const name = typeof value === 'string' ? value : value?.name;
                    return name ? this._filter(name as string) : this.inventoryItems.slice();
                })
            );
        });
    }

    private _filter(name: string): InventoryItem[] {
        const filterValue = name.toLowerCase();
        return this.inventoryItems.filter(option => option.name.toLowerCase().includes(filterValue));
    }

    displayFn(item: InventoryItem): string {
        return item && item.name ? item.name : '';
    }

    loadMachine(id: number) {
        this.machineService.getMachine(id).subscribe(machine => {
            this.machineForm.patchValue(machine);
            this.requirements.data = machine.requirements || [];
            this.cdr.detectChanges();
        });
    }

    saveMachine() {
        if (this.machineForm.invalid) {
            this.machineForm.markAllAsTouched();
            return;
        }

        const data = this.machineForm.value;
        if (this.machineId) {
            this.machineService.updateMachine(this.machineId, data).subscribe(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Machine configuration saved successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });
            });
        } else {
            this.machineService.createMachine(data).subscribe(machine => {
                this.machineId = machine.id;
                Swal.fire({
                    icon: 'success',
                    title: 'Created!',
                    text: 'Machine created. You can now configure the BOM.',
                    confirmButtonText: 'Start Configuration',
                    confirmButtonColor: '#3b82f6'
                });
                this.router.navigate(['/production/machines', machine.id], { replaceUrl: true });
            });
        }
    }

    addRequirement() {
        if (!this.machineId) {
            Swal.fire({
                icon: 'warning',
                title: 'Unsaved Changes',
                text: 'Please save the machine details first.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        if (this.newItemControl.invalid || this.newQtyControl.invalid) return;

        const item = this.newItemControl.value;
        if (typeof item === 'string') {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Selection',
                text: 'Please select a valid item from the list',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        if (!item || !item.id) return;

        const req = {
            machine: this.machineId,
            inventory_item: item.id,
            quantity: this.newQtyControl.value?.toString()
        };

        this.machineService.addRequirement(req).subscribe(newReq => {
            this.loadMachine(this.machineId!); // Refresh list
            this.newItemControl.reset();
            this.newQtyControl.setValue(1);
        });
    }

    openQuickAddDialog() {
        const dialogRef = this.dialog.open(InventoryFormDialogComponent, {
            width: '600px',
            data: { item: null, quickAdd: true },
            disableClose: false,
            panelClass: 'modern-modal-panel'
        });

        dialogRef.afterClosed().subscribe(createdItem => {
            if (createdItem) {
                // Refresh inventory items list
                this.quotationService.getInventoryItems().subscribe(items => {
                    this.inventoryItems = items;

                    // Find and auto-select the newly created item by ID
                    const newItem = items.find(item => item.id === createdItem.id);
                    if (newItem) {
                        this.newItemControl.setValue(newItem);
                    }

                    // Update filtered items observable
                    this.filteredItems = this.newItemControl.valueChanges.pipe(
                        startWith(newItem || ''),
                        map(value => {
                            const name = typeof value === 'string' ? value : value?.name;
                            return name ? this._filter(name as string) : this.inventoryItems.slice();
                        })
                    );

                    Swal.fire({
                        icon: 'success',
                        title: 'Item Added!',
                        text: `"${createdItem.name}" has been created and selected.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                });
            }
        });
    }

    deleteRequirement(id: number) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to remove this material from the BOM?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Yes, remove it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.machineService.deleteRequirement(id).subscribe(() => {
                    this.requirements.data = this.requirements.data.filter(r => r.id !== id);
                    this.cdr.detectChanges();
                    Swal.fire({
                        icon: 'success',
                        title: 'Removed!',
                        text: 'Material requirement has been removed.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                });
            }
        });
    }
}
