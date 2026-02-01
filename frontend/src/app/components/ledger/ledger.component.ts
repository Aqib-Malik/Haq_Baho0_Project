import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { LedgerService } from '../../services/ledger.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Company } from '../../models/company.model';
import { CompanyLedgerResponse, LedgerEntry } from '../../models/ledger.model';
import { InvoiceFormComponent } from '../invoice/invoice-form/invoice-form.component';
import { PaymentFormComponent } from '../payment/payment-form/payment-form.component';
import { TransactionDetailDialogComponent } from '../dialogs/transaction-detail-dialog/transaction-detail-dialog.component';
import { CompanyFormComponent } from '../company/company-form/company-form.component';

@Component({
  selector: 'app-ledger',
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
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule
  ],
  templateUrl: './ledger.component.html',
  styleUrl: './ledger.component.css'
})
export class LedgerComponent implements OnInit {
  companies = signal<Company[]>([]);
  filteredCompanies = signal<Company[]>([]);
  searchQuery = signal<string>('');
  selectedCompany = signal<Company | null>(null);

  ledgerData = signal<CompanyLedgerResponse | null>(null);
  isLoading = signal<boolean>(false);
  isLoadingCompanies = signal<boolean>(false);
  startDate = signal<string>('');
  endDate = signal<string>('');

  private dialog = inject(MatDialog);



  constructor(
    private ledgerService: LedgerService,
    private notificationService: NotificationService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadCompanies();
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    this.filterCompanies();
  }

  filterCompanies(): void {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      this.filteredCompanies.set(this.companies());
      return;
    }

    const filtered = this.companies().filter(company =>
      company.name.toLowerCase().includes(query) ||
      (company.email && company.email.toLowerCase().includes(query)) ||
      (company.contact_person && company.contact_person.toLowerCase().includes(query))
    );
    this.filteredCompanies.set(filtered);
  }

  loadCompanies(): void {
    this.isLoadingCompanies.set(true);
    this.ledgerService.getCompanies().subscribe({
      next: (companies) => {
        console.log('Companies loaded:', companies);
        this.companies.set(companies);
        this.filterCompanies(); // Initialize filtered list
        this.isLoadingCompanies.set(false);
        if (companies.length === 0) {
          this.showError('No companies found. Please add companies via Django admin panel at http://16.170.24.40/admin');
        }
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        let errorMessage = 'Failed to load companies. ';
        if (error.status === 0) {
          errorMessage += 'Cannot connect to backend. Please ensure Django server is running on http://localhost:8000';
        } else if (error.status === 404) {
          errorMessage += 'API endpoint not found. Please check the backend configuration.';
        } else {
          errorMessage += `Error: ${error.message || 'Unknown error'}`;
        }
        this.showError(errorMessage);
        this.isLoadingCompanies.set(false);
      }
    });
  }

  onCompanySelected(company: Company | null): void {
    if (company) {
      this.selectedCompany.set(company);
      this.loadLedger();
    } else {
      this.selectedCompany.set(null);
      this.ledgerData.set(null);
    }
  }

  onCompanySelectionChange(companyId: number | null): void {
    if (companyId === null) {
      this.onCompanySelected(null);
      return;
    }

    const company = this.companies().find(c => c.id === companyId);
    this.onCompanySelected(company || null);
  }

  loadLedger(): void {
    const company = this.selectedCompany();
    if (!company) {
      return;
    }

    this.isLoading.set(true);
    this.ledgerService.getCompanyLedger(
      company.id,
      this.startDate() || undefined,
      this.endDate() || undefined
    ).subscribe({
      next: (data) => {
        this.ledgerData.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading ledger:', error);
        this.showError('Failed to load ledger data');
        this.isLoading.set(false);
      }
    });
  }

  onDateFilterChange(): void {
    if (this.selectedCompany()) {
      this.loadLedger();
    }
  }

  openAddCompanyDialog(): void {
    const dialogRef = this.dialog.open(CompanyFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      panelClass: 'dialog-responsive',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadCompanies(); // Refresh company list on success
      }
    });
  }

  exportPdf(): void {
    const company = this.selectedCompany();
    if (!company) {
      this.showError('Please select a company first');
      return;
    }

    this.isLoading.set(true);
    this.ledgerService.exportLedgerPdf(
      company.id,
      this.startDate() || undefined,
      this.endDate() || undefined
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger_${company.name}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showSuccess('PDF exported successfully');
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error exporting PDF:', error);
        this.showError('Failed to export PDF');
        this.isLoading.set(false);
      }
    });
  }

  exportExcel(): void {
    const company = this.selectedCompany();
    if (!company) {
      this.showError('Please select a company first');
      return;
    }

    this.isLoading.set(true);
    this.ledgerService.exportLedgerExcel(
      company.id,
      this.startDate() || undefined,
      this.endDate() || undefined
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger_${company.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showSuccess('Excel exported successfully');
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error exporting Excel:', error);
        this.showError('Failed to export Excel');
        this.isLoading.set(false);
      }
    });
  }

  formatCurrency(amount: string | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') return 'Rs 0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'Rs 0.00';
    return `Rs ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getNumericBalance(amount: string | null | undefined): number {
    if (!amount) return 0;
    return parseFloat(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue
      'linear-gradient(135deg, #ef4444, #dc2626)', // Red
      'linear-gradient(135deg, #10b981, #059669)', // Green
      'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
      'linear-gradient(135deg, #8b5cf6, #7c3aed)', // Violet
      'linear-gradient(135deg, #ec4899, #db2777)', // Pink
      'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
      'linear-gradient(135deg, #6366f1, #4f46e5)', // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  }

  showSuccess(message: string): void {
    this.notificationService.showSuccess(message);
  }

  showError(message: string): void {
    this.notificationService.showError(message);
  }

  onStartDateChange(event: any): void {
    const date = event.value;
    if (date) {
      const dateString = this.formatDateForInput(date);
      this.startDate.set(dateString);
      this.onDateFilterChange();
    } else {
      this.startDate.set('');
      this.onDateFilterChange();
    }
  }

  onEndDateChange(event: any): void {
    const date = event.value;
    if (date) {
      const dateString = this.formatDateForInput(date);
      this.endDate.set(dateString);
      this.onDateFilterChange();
    } else {
      this.endDate.set('');
      this.onDateFilterChange();
    }
  }


  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openAddInvoiceDialog(): void {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: true,
      autoFocus: false,
      data: { invoice: null, preselectedCompanyId: this.selectedCompany()?.id } // Pass preselected company if available
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.selectedCompany()) {
          this.loadLedger();
        } else {
          // If no company selected, reload company list to update balances if needed
          this.loadCompanies();
        }
      }
    });
  }

  openTransactionDetail(transaction: any): void {
    this.dialog.open(TransactionDetailDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: false, // Allow clicking outside to close
      autoFocus: false,
      panelClass: 'modern-modal-panel',
      data: transaction
    });
  }


  openAddPaymentDialog(): void {
    const dialogRef = this.dialog.open(PaymentFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: true,
      autoFocus: false,
      data: { payment: null, preselectedCompanyId: this.selectedCompany()?.id } // Pass preselected company
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.selectedCompany()) {
          this.loadLedger();
        } else {
          this.loadCompanies();
        }
      }
    });
  }

  clearFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
    if (this.selectedCompany()) {
      this.loadLedger();
    }
  }
}
