import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LedgerService } from '../../../services/ledger.service';
import { MachineService } from '../../../services/machine.service';
import { DemandService } from '../../../services/demand.service';
import { Company } from '../../../models/company.model';
import { Machine } from '../../../models/machine.model';

@Component({
    selector: 'app-demand-create',
    standalone: true,
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
        MatSelectModule, MatDatepickerModule, MatNativeDateModule
    ],
    templateUrl: './demand-create.component.html',
    styleUrls: ['./demand-create.component.css']
})
export class DemandCreateComponent implements OnInit {
    demandForm: FormGroup;
    companies: Company[] = [];
    machines: Machine[] = [];
    isEditMode = false;
    demandId: number | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private ledgerService: LedgerService,
        private machineService: MachineService,
        private demandService: DemandService
    ) {
        this.demandForm = this.fb.group({
            company: ['', Validators.required],
            date: [new Date(), Validators.required],
            reference_number: [''],
            status: ['draft'],
            machine_orders: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.ledgerService.getCompanies().subscribe(data => this.companies = data);
        this.machineService.getMachines().subscribe(data => this.machines = data);

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.demandId = +id;
            this.loadDemand(this.demandId);
        } else {
            this.addMachineOrder(); // Add one row by default for new
        }
    }

    loadDemand(id: number) {
        this.demandService.getDemand(id).subscribe(data => {
            this.demandForm.patchValue({
                company: data.company,
                date: new Date(data.date),
                reference_number: data.reference_number,
                status: data.status
            });

            // Clear existing and populate machine orders
            const ordersArray = this.demandForm.get('machine_orders') as FormArray;
            ordersArray.clear();

            if (data.machine_orders && data.machine_orders.length > 0) {
                data.machine_orders.forEach((order: any) => {
                    const orderGroup = this.fb.group({
                        machine_id: [order.machine, Validators.required],
                        quantity: [order.quantity, [Validators.required, Validators.min(1)]]
                    });
                    ordersArray.push(orderGroup);
                });
            } else {
                this.addMachineOrder();
            }
        });
    }

    get machineOrders() {
        return this.demandForm.get('machine_orders') as FormArray;
    }

    addMachineOrder() {
        const orderGroup = this.fb.group({
            machine_id: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]]
        });
        this.machineOrders.push(orderGroup);
    }

    removeMachineOrder(index: number) {
        this.machineOrders.removeAt(index);
    }

    onSubmit() {
        if (this.demandForm.invalid) return;

        const formVal = this.demandForm.value;
        const date = new Date(formVal.date);
        const dateStr = date.toISOString().split('T')[0];

        const payload = {
            ...formVal,
            date: dateStr
        };

        const request$ = this.isEditMode && this.demandId
            ? this.demandService.updateDemand(this.demandId, payload)
            : this.demandService.createDemand(payload);

        request$.subscribe(() => {
            Swal.fire({
                title: this.isEditMode ? 'Demand Updated!' : 'Demand Sheet Created!',
                text: this.isEditMode ? 'The demand sheet has been successfully updated.' : 'The demand sheet has been successfully generated.',
                icon: 'success',
                confirmButtonColor: '#10b981',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                this.router.navigate(['/production/demands']);
            });
        });
    }
}
