import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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

    constructor(
        private fb: FormBuilder,
        private router: Router,
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
        this.addMachineOrder(); // Add one row by default
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

        this.demandService.createDemand(payload).subscribe(() => {
            Swal.fire({
                title: 'Demand Sheet Created!',
                text: 'The demand sheet has been successfully generated.',
                icon: 'success',
                confirmButtonColor: '#10b981', // Emerald-500 matching the theme likely
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                this.router.navigate(['/production/demands']);
            });
        });
    }
}
