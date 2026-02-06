import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Quotation } from '../../../models/quotation.model';
import { Company } from '../../../models/company.model';
import { QuotationService } from '../../../services/quotation.service';

@Component({
    selector: 'app-quotation-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule
    ],
    templateUrl: './quotation-detail-dialog.component.html',
    styleUrl: './quotation-detail-dialog.component.css'
})
export class QuotationDetailDialogComponent {
    quotation: Quotation;
    company: Company | undefined;

    constructor(
        public dialogRef: MatDialogRef<QuotationDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { quotation: Quotation, company?: Company },
        private quotationService: QuotationService,
        private router: Router
    ) {
        this.quotation = data.quotation;
        this.company = data.company;
    }

    close(): void {
        this.dialogRef.close();
    }

    downloadPdf(): void {
        this.quotationService.downloadPdf(this.quotation.id, this.quotation.quotation_number);
    }

    viewPdfPreview(): void {
        // Close dialog and navigate to PDF preview page
        this.dialogRef.close();
        this.router.navigate(['/quotations', this.quotation.id, 'view']);
    }

    edit(): void {
        this.dialogRef.close('edit');
    }

    formatDate(dateString: string | undefined): string {
        if (!dateString) return '-';
        // Use a clean, long format for readability
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatCurrency(amount: string | null | undefined): string {
        if (!amount) return 'Rs 0.00';
        const num = parseFloat(amount);
        return `Rs ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatNumber(value: string | number | undefined): string {
        if (value === undefined || value === null) return '0';
        return value.toString();
    }

    getStatusLabel(status: string): string {
        const statusLabels: { [key: string]: string } = {
            'draft': 'Draft',
            'sent': 'Sent',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'expired': 'Expired'
        };
        return statusLabels[status] || status;
    }
}
