import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

import { LedgerService } from '../../../services/ledger.service';
import { NotificationService } from '../../../services/notification.service';
import { Payment } from '../../../models/payment.model';
import { Company } from '../../../models/company.model';

@Component({
    selector: 'app-payment-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule
    ],
    templateUrl: './payment-form.component.html',
    styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {
    paymentForm: FormGroup;
    companies = signal<Company[]>([]);
    isLoading = false;
    isEditMode = false;

    paymentModes = [
        { value: 'cash', label: 'Cash' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' },
        { value: 'other', label: 'Other' }
    ];

    constructor(
        private fb: FormBuilder,
        private ledgerService: LedgerService,
        private notificationService: NotificationService,
        public dialogRef: MatDialogRef<PaymentFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { payment?: Payment }
    ) {
        this.isEditMode = !!data.payment;

        this.paymentForm = this.fb.group({
            company: [data.payment?.company || null, Validators.required],
            payment_number: [data.payment?.payment_number || '', [Validators.required, Validators.maxLength(50)]],
            payment_date: [data.payment?.payment_date ? new Date(data.payment.payment_date) : new Date(), Validators.required],
            amount: [data.payment?.amount || '', [Validators.required, Validators.min(0.01)]],
            payment_mode: [data.payment?.payment_mode || 'cash', Validators.required],
            description: [data.payment?.description || ''],
            reference: [data.payment?.reference || '']
        });
    }

    ngOnInit(): void {
        this.loadCompanies();
    }

    loadCompanies(): void {
        this.ledgerService.getCompanies().subscribe({
            next: (companies) => this.companies.set(companies),
            error: (error) => console.error('Error loading companies:', error)
        });
    }

    onSubmit(): void {
        if (this.paymentForm.invalid) {
            this.paymentForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        const formValue = this.paymentForm.value;

        // Format date to YYYY-MM-DD
        const date = new Date(formValue.payment_date);
        const formattedDate = date.toISOString().split('T')[0];

        const paymentData = {
            ...formValue,
            payment_date: formattedDate,
            amount: parseFloat(formValue.amount).toString()
        };

        const request$ = this.isEditMode && this.data.payment
            ? this.ledgerService.updatePayment(this.data.payment.id, paymentData)
            : this.ledgerService.createPayment(paymentData);

        request$.subscribe({
            next: () => {
                this.notificationService.showSuccess(
                    `Payment ${this.isEditMode ? 'updated' : 'created'} successfully`
                );
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error saving payment:', error);
                this.notificationService.showError(
                    error.error?.detail || error.error?.message || 'Failed to save payment'
                );
                this.isLoading = false;
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
