import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MachineService } from '../../../services/machine.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-machine-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './machine-detail.component.html',
    styleUrls: ['./machine-detail.component.css']
})
export class MachineDetailComponent implements OnInit {
    machineId: number | null = null;
    machineForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private machineService: MachineService,
        private cdr: ChangeDetectorRef
    ) {
        this.machineForm = this.fb.group({
            name: ['', Validators.required],
            code: ['', Validators.required],
            description: [''],
            amount: [0, [Validators.required, Validators.min(0)]]
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
    }

    loadMachine(id: number): void {
        this.machineService.getMachine(id).subscribe(machine => {
            this.machineForm.patchValue({
                name: machine.name,
                code: machine.code ?? '',
                description: machine.description ?? '',
                amount: machine.amount != null ? parseFloat(machine.amount) : 0
            });
            this.cdr.detectChanges();
        });
    }

    saveMachine(): void {
        if (this.machineForm.invalid) {
            this.machineForm.markAllAsTouched();
            return;
        }

        const data = {
            ...this.machineForm.value,
            amount: this.machineForm.get('amount')?.value ?? 0
        };

        if (this.machineId) {
            this.machineService.updateMachine(this.machineId, data).subscribe(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Machine saved successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });
            });
        } else {
            this.machineService.createMachine(data).subscribe(machine => {
                Swal.fire({
                    icon: 'success',
                    title: 'Created!',
                    text: 'Machine created successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.router.navigate(['/production/machines', machine.id], { replaceUrl: true });
            });
        }
    }
}
