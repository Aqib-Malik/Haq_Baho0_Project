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
    selector: 'app-add-invoice-dialog',
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
    templateUrl: './add-invoice-dialog.component.html',
    styleUrl: './add-invoice-dialog.component.css'
})
export class AddInvoiceDialogComponent implements OnInit {
    invoiceForm: FormGroup;
    companies = signal<Company[]>([]);
    isLoading = signal<boolean>(false);

    private ledgerService = inject(LedgerService);
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<AddInvoiceDialogComponent>);
    private snackBar = inject(MatSnackBar);

    constructor() {
        this.invoiceForm = this.fb.group({
            company: [null, Validators.required],
            invoice_number: ['', [Validators.required, Validators.maxLength(50)]],
            invoice_date: [new Date().toISOString().split('T')[0], Validators.required],
            amount: ['', [Validators.required, Validators.min(0.01)]],
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

    saveInvoice(): void {
        if (this.invoiceForm.invalid) {
            this.invoiceForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formValue = this.invoiceForm.value;
        const invoiceData = {
            company: formValue.company,
            invoice_number: formValue.invoice_number,
            invoice_date: formValue.invoice_date,
            amount: parseFloat(formValue.amount).toString(),
            description: formValue.description || null,
            reference: formValue.reference || null
        };

        this.ledgerService.createInvoice(invoiceData).subscribe({
            next: () => {
                this.showSuccess('Invoice created successfully');
                this.dialogRef.close(true);
            },
            error: (error) => {
                console.error('Error creating invoice:', error);
                this.showError(error.error?.detail || error.error?.message || 'Failed to create invoice');
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
