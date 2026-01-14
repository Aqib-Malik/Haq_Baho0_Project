import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
    selector: 'app-transaction-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule
    ],
    templateUrl: './transaction-detail-dialog.component.html',
    styleUrls: ['./transaction-detail-dialog.component.css']
})
export class TransactionDetailDialogComponent {
    transaction = signal<any>(null);

    constructor(
        public dialogRef: MatDialogRef<TransactionDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.transaction.set(data);
    }

    close(): void {
        this.dialogRef.close();
    }

    formatCurrency(amount: any): string {
        if (amount === null || amount === undefined) return 'Rs. 0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(Number(amount)).replace('₹', 'Rs. ');
    }

    formatDate(dateString: any): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    getTransactionTypeLabel(type: string): string {
        return type === 'debit' ? 'Invoice' : 'Payment';
    }
}
