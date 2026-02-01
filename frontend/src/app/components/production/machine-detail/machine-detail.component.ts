import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MachineService } from '../../../services/machine.service';
import { QuotationService } from '../../../services/quotation.service';
import { Machine, MachineRequirement } from '../../../models/machine.model';
import { InventoryItem } from '../../../models/quotation.model';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
    selector: 'app-machine-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule, FormsModule,
        MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
        MatTableModule, MatSelectModule, MatAutocompleteModule
    ],
    templateUrl: './machine-detail.component.html',
    styleUrls: ['./machine-detail.component.css']
})
export class MachineDetailComponent implements OnInit {
    machineId: number | null = null;
    machineForm: FormGroup;
    requirements: MachineRequirement[] = [];
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
        private quotationService: QuotationService
    ) {
        this.machineForm = this.fb.group({
            name: ['', Validators.required],
            code: [''],
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
            this.requirements = machine.requirements || [];
        });
    }

    saveMachine() {
        if (this.machineForm.invalid) return;

        const data = this.machineForm.value;
        if (this.machineId) {
            this.machineService.updateMachine(this.machineId, data).subscribe(() => {
                alert('Machine updated');
            });
        } else {
            this.machineService.createMachine(data).subscribe(machine => {
                this.machineId = machine.id;
                alert('Machine created. You can now add requirements.');
                this.router.navigate(['/production/machines', machine.id], { replaceUrl: true });
            });
        }
    }

    addRequirement() {
        if (!this.machineId) {
            alert('Please save the machine first.');
            return;
        }

        if (this.newItemControl.invalid || this.newQtyControl.invalid) return;

        const item = this.newItemControl.value;
        if (typeof item === 'string') {
            alert('Please select a valid item from the list');
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

    deleteRequirement(id: number) {
        if (confirm('Remove this material?')) {
            this.machineService.deleteRequirement(id).subscribe(() => {
                this.requirements = this.requirements.filter(r => r.id !== id);
            });
        }
    }
}
