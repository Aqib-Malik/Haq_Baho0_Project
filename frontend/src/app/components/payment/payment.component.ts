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
import { Payment } from '../../models/payment.model';
import { PaymentFormComponent } from './payment-form/payment-form.component';

@Component({
  selector: 'app-payment',
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
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  payments = signal<Payment[]>([]);
  companies = signal<Company[]>([]);
  isLoading = signal<boolean>(false);
  isLoadingCompanies = signal<boolean>(false);
  selectedCompanyId = signal<number | null>(null);

  // Pagination
  totalPayments = signal<number>(0);
  pageSize = signal<number>(6);
  pageIndex = signal<number>(0);

  displayedColumns: string[] = ['payment_number', 'payment_date', 'company_name', 'amount', 'payment_mode', 'description', 'reference', 'actions'];

  paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private ledgerService: LedgerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadCompanies();
    this.loadPayments();
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

  loadPayments(): void {
    this.isLoading.set(true);
    const companyId = this.selectedCompanyId();
    const page = this.pageIndex() + 1;
    this.ledgerService.getPayments(companyId || undefined, page, this.pageSize()).subscribe({
      next: (response) => {
        this.payments.set(response.results);
        this.totalPayments.set(response.count);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.notificationService.showError('Failed to load payments');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadPayments();
  }

  onCompanyFilterChange(companyId: number | null): void {
    this.selectedCompanyId.set(companyId);
    this.pageIndex.set(0);
    this.loadPayments();
  }

  showAddForm(): void {
    const dialogRef = this.dialog.open(PaymentFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { payment: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayments();
      }
    });
  }

  showEditForm(payment: Payment): void {
    const dialogRef = this.dialog.open(PaymentFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { payment }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayments();
      }
    });
  }

  async deletePayment(payment: Payment): Promise<void> {
    const confirmed = await this.notificationService.confirm({
      title: 'Delete Payment?',
      text: `Are you sure you want to delete payment ${payment.payment_number}? This action cannot be undone.`,
      confirmButtonText: 'Yes, delete it',
      icon: 'warning'
    });

    if (!confirmed) return;

    this.isLoading.set(true);
    this.ledgerService.deletePayment(payment.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Payment deleted successfully');
        this.loadPayments();
      },
      error: (error) => {
        console.error('Error deleting payment:', error);
        this.notificationService.showError('Failed to delete payment');
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

  getPaymentModeLabel(value: string): string {
    const mode = this.paymentModes.find(m => m.value === value);
    return mode ? mode.label : value;
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
