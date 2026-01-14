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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LedgerService } from '../../../services/ledger.service';
import { Invoice } from '../../../models/invoice.model';
import { Company } from '../../../models/company.model';

@Component({
    selector: 'app-invoice-form',
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
        MatIconModule,
        MatSnackBarModule
    ],
    templateUrl: './invoice-form.component.html',
    styleUrls: ['./invoice-form.component.css']
})
export class InvoiceFormComponent implements OnInit {
    invoiceForm: FormGroup;
    companies = signal<Company[]>([]);
    isLoading = false;
    isEditMode = false;

    constructor(
        private fb: FormBuilder,
        private ledgerService: LedgerService,
        private snackBar: MatSnackBar,
        public dialogRef: MatDialogRef<InvoiceFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { invoice?: Invoice }
    ) {
        this.isEditMode = !!data.invoice;

        this.invoiceForm = this.fb.group({
            company: [data.invoice?.company || null, Validators.required],
            invoice_number: [data.invoice?.invoice_number || '', [Validators.required, Validators.maxLength(50)]],
            invoice_date: [data.invoice?.invoice_date ? new Date(data.invoice.invoice_date) : new Date(), Validators.required],
            amount: [data.invoice?.amount || '', [Validators.required, Validators.min(0.01)]],
            description: [data.invoice?.description || ''],
            reference: [data.invoice?.reference || '']
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
        if (this.invoiceForm.invalid) {
            this.invoiceForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        const formValue = this.invoiceForm.value;

        // Format date to YYYY-MM-DD
        const date = new Date(formValue.invoice_date);
        const formattedDate = date.toISOString().split('T')[0];

        const invoiceData = {
            ...formValue,
            invoice_date: formattedDate,
            amount: parseFloat(formValue.amount).toString()
        };

        const request$ = this.isEditMode && this.data.invoice
            ? this.ledgerService.updateInvoice(this.data.invoice.id, invoiceData)
            : this.ledgerService.createInvoice(invoiceData);

        request$.subscribe({
            next: () => {
                this.snackBar.open(
                    `Invoice ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    'Close',
                    { duration: 3000, panelClass: ['success-snackbar'], verticalPosition: 'top', horizontalPosition: 'end' }
                );
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error saving invoice:', error);
                this.snackBar.open(
                    error.error?.detail || error.error?.message || 'Failed to save invoice',
                    'Close',
                    { duration: 5000, panelClass: ['error-snackbar'], verticalPosition: 'top', horizontalPosition: 'end' }
                );
                this.isLoading = false;
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
