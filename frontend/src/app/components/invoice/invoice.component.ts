import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { LedgerService } from '../../services/ledger.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Company } from '../../models/company.model';
import { Invoice } from '../../models/invoice.model';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTableModule,
    MatDialogModule,
    MatPaginatorModule
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  invoices = signal<Invoice[]>([]);
  companies = signal<Company[]>([]);
  isLoading = signal<boolean>(false);
  isLoadingCompanies = signal<boolean>(false);
  selectedCompanyId = signal<number | null>(null);

  // Pagination
  totalInvoices = signal<number>(0);
  pageSize = signal<number>(6);
  pageIndex = signal<number>(0);

  displayedColumns: string[] = ['invoice_number', 'invoice_date', 'company_name', 'amount', 'description', 'reference', 'actions'];

  constructor(
    private ledgerService: LedgerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadCompanies();
    this.loadInvoices();
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

  loadInvoices(): void {
    this.isLoading.set(true);
    const companyId = this.selectedCompanyId();
    // API uses 1-based indexing for pages
    const page = this.pageIndex() + 1;
    this.ledgerService.getInvoices(companyId || undefined, page, this.pageSize()).subscribe({
      next: (response) => {
        this.invoices.set(response.results);
        this.totalInvoices.set(response.count);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.notificationService.showError('Failed to load invoices');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadInvoices();
  }

  onCompanyFilterChange(companyId: number | null): void {
    this.selectedCompanyId.set(companyId);
    this.pageIndex.set(0); // Reset to first page
    this.loadInvoices();
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { invoice: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvoices();
      }
    });
  }

  showEditForm(invoice: Invoice): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { invoice }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvoices();
      }
    });
  }

  async deleteInvoice(invoice: Invoice): Promise<void> {
    const confirmed = await this.notificationService.confirm({
      title: 'Delete Invoice?',
      text: `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`,
      confirmButtonText: 'Yes, delete it',
      icon: 'warning'
    });

    if (!confirmed) return;

    this.isLoading.set(true);
    this.ledgerService.deleteInvoice(invoice.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Invoice deleted successfully');
        this.loadInvoices();
      },
      error: (error) => {
        console.error('Error deleting invoice:', error);
        this.notificationService.showError('Failed to delete invoice');
        this.isLoading.set(false);
      }
    });
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
      'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue
      'linear-gradient(135deg, #10b981, #059669)', // Green
      'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
      'linear-gradient(135deg, #ef4444, #dc2626)', // Red
      'linear-gradient(135deg, #8b5cf6, #7c3aed)', // Violet
      'linear-gradient(135deg, #ec4899, #db2777)', // Pink
      'linear-gradient(135deg, #6366f1, #4f46e5)', // Indigo
      'linear-gradient(135deg, #14b8a6, #0d9488)', // Teal
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash % colors.length);
    return colors[index];
  }
}
