import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { QuotationService } from '../../services/quotation.service';
import { LedgerService } from '../../services/ledger.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Company } from '../../models/company.model';
import { Quotation } from '../../models/quotation.model';
import { QuotationFormDialogComponent } from './quotation-form-dialog/quotation-form-dialog.component';
import { QuotationDetailDialogComponent } from './quotation-detail-dialog/quotation-detail-dialog.component';

@Component({
    selector: 'app-quotation',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        MatChipsModule,
        MatDialogModule
    ],
    templateUrl: './quotation.component.html',
    styleUrl: './quotation.component.css'
})
export class QuotationComponent implements OnInit {
    quotations = signal<Quotation[]>([]);
    companies = signal<Company[]>([]);
    isLoading = signal<boolean>(false);
    isLoadingCompanies = signal<boolean>(false);
    selectedCompanyId = signal<number | null>(null);
    selectedStatus = signal<string | null>(null);

    // Pagination
    totalQuotations = signal<number>(0);
    pageSize = signal<number>(6);
    pageIndex = signal<number>(0);

    // Status options
    statusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' }
    ];

    displayedColumns: string[] = ['quotation_number', 'quotation_date', 'company_name', 'items', 'subtotal', 'tax_amount', 'total_amount', 'status', 'actions'];

    constructor(
        private quotationService: QuotationService,
        private ledgerService: LedgerService,
        private notificationService: NotificationService,
        public authService: AuthService,
        private dialog: MatDialog,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadCompanies();
        this.loadQuotations();
    }

    loadCompanies(): void {
        this.isLoadingCompanies.set(true);
        this.ledgerService.getCompanies().subscribe({
            next: (companies) => {
                this.companies.set(companies);
                this.isLoadingCompanies.set(false);
            },
            error: (error) => {
                console.error('Error loading companies:', error);
                this.notificationService.showError('Failed to load companies');
                this.isLoadingCompanies.set(false);
            }
        });
    }

    loadQuotations(): void {
        this.isLoading.set(true);
        const companyId = this.selectedCompanyId();
        const status = this.selectedStatus();
        const page = this.pageIndex() + 1;

        this.quotationService.getQuotations(
            companyId || undefined,
            status || undefined,
            undefined,
            undefined,
            page,
            this.pageSize()
        ).subscribe({
            next: (response) => {
                this.quotations.set(response.results);
                this.totalQuotations.set(response.count);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading quotations:', error);
                this.notificationService.showError('Failed to load quotations');
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(event: PageEvent): void {
        this.pageIndex.set(event.pageIndex);
        this.pageSize.set(event.pageSize);
        this.loadQuotations();
    }

    onCompanyFilterChange(companyId: number | null): void {
        this.selectedCompanyId.set(companyId);
        this.pageIndex.set(0);
        this.loadQuotations();
    }

    onStatusFilterChange(status: string | null): void {
        this.selectedStatus.set(status);
        this.pageIndex.set(0);
        this.loadQuotations();
    }

    showAddForm(): void {
        const dialogRef = this.dialog.open(QuotationFormDialogComponent, {
            width: '90vw',
            maxWidth: '1200px',
            maxHeight: '90vh',
            disableClose: false,
            data: { quotation: null, companies: this.companies() }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadQuotations();
            }
        });
    }

    showEditForm(quotation: Quotation): void {
        const dialogRef = this.dialog.open(QuotationFormDialogComponent, {
            width: '90vw',
            maxWidth: '1200px',
            maxHeight: '90vh',
            disableClose: false,
            data: { quotation: quotation, companies: this.companies() }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadQuotations();
            }
        });
    }

    showDetail(quotation: Quotation): void {
        const company = this.companies().find(c => c.id === quotation.company);
        // Open detail dialog instead of navigating to PDF-style print view
        const dialogRef = this.dialog.open(QuotationDetailDialogComponent, {
            width: '90%',
            maxWidth: '1200px',
            data: { quotation, company }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'edit') {
                this.showEditForm(quotation);
            } else if (result === 'delete') {
                this.deleteQuotation(quotation);
            } else if (result) {
                // Reload quotations if any action was performed
                this.loadQuotations();
            }
        });
    }

    async deleteQuotation(quotation: Quotation): Promise<void> {
        const confirmed = await this.notificationService.confirm({
            title: 'Delete Quotation?',
            text: `Are you sure you want to delete quotation ${quotation.quotation_number}? This action cannot be undone.`,
            confirmButtonText: 'Yes, delete it',
            icon: 'warning'
        });

        if (!confirmed) return;

        this.isLoading.set(true);
        this.quotationService.deleteQuotation(quotation.id).subscribe({
            next: () => {
                this.notificationService.showSuccess('Quotation deleted successfully');
                this.loadQuotations();
            },
            error: (error) => {
                console.error('Error deleting quotation:', error);
                this.notificationService.showError('Failed to delete quotation');
                this.isLoading.set(false);
            }
        });
    }

    downloadPdf(quotation: Quotation): void {
        this.quotationService.downloadPdf(quotation.id, quotation.quotation_number);
        this.notificationService.showSuccess('Downloading PDF...');
    }

    formatCurrency(amount: string | null | undefined): string {
        if (!amount) return '-';
        const num = parseFloat(amount);
        return `Rs ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatDate(dateString: string): string {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN');
    }

    getInitials(name: string): string {
        if (!name) return '';
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    getAvatarColor(name: string): string {
        const colors = [
            'linear-gradient(135deg, #3b82f6, #2563eb)',
            'linear-gradient(135deg, #10b981, #059669)',
            'linear-gradient(135deg, #f59e0b, #d97706)',
            'linear-gradient(135deg, #ef4444, #dc2626)',
            'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            'linear-gradient(135deg, #ec4899, #db2777)',
            'linear-gradient(135deg, #6366f1, #4f46e5)',
            'linear-gradient(135deg, #14b8a6, #0d9488)',
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash % colors.length);
        return colors[index];
    }

    getStatusColor(status: string): string {
        const statusColors: { [key: string]: string } = {
            'draft': '#94a3b8',
            'sent': '#3b82f6',
            'accepted': '#10b981',
            'rejected': '#ef4444',
            'expired': '#f59e0b'
        };
        return statusColors[status] || '#64748b';
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
