import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LedgerService } from '../../../services/ledger.service';
import { Company } from '../../../models/company.model';
import { signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
    selector: 'app-add-payment-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule
    ],
    templateUrl: './add-payment-dialog.component.html',
    styleUrl: './add-payment-dialog.component.css'
})
export class AddPaymentDialogComponent implements OnInit {
    paymentForm: FormGroup;
    companies = signal<Company[]>([]);
    isLoading = signal<boolean>(false);

    paymentModes = [
        { value: 'cash', label: 'Cash' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' },
        { value: 'other', label: 'Other' }
    ];

    private ledgerService = inject(LedgerService);
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<AddPaymentDialogComponent>);
    private snackBar = inject(MatSnackBar);

    constructor() {
        this.paymentForm = this.fb.group({
            company: [null, Validators.required],
            payment_number: ['', [Validators.required, Validators.maxLength(50)]],
            payment_date: [new Date().toISOString().split('T')[0], Validators.required],
            amount: ['', [Validators.required, Validators.min(0.01)]],
            payment_mode: ['cash', Validators.required],
            description: [''],
            reference: ['']
        });
    }

    ngOnInit(): void {
        this.loadCompanies();
    }

    loadCompanies(): void {
        this.isLoading.set(true);
        this.ledgerService.getCompanies().subscribe({
            next: (companies) => {
                this.companies.set(companies);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading companies:', error);
                this.showError('Failed to load companies');
                this.isLoading.set(false);
            }
        });
    }

    savePayment(): void {
        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formValue = this.paymentForm.value;
        const paymentData = {
            company: formValue.company,
            payment_number: formValue.payment_number,
            payment_date: formValue.payment_date,
            amount: parseFloat(formValue.amount).toString(),
            payment_mode: formValue.payment_mode,
            description: formValue.description || null,
            reference: formValue.reference || null
        };

        this.ledgerService.createPayment(paymentData).subscribe({
            next: () => {
                this.showSuccess('Payment created successfully');
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error creating payment:', error);
                this.showError(error.error?.detail || error.error?.message || 'Failed to create payment');
                this.isLoading.set(false);
            }
        });
    }

    close(): void {
        this.dialogRef.close(false);
    }

    showSuccess(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
        });
    }

    showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
        });
    }
}
