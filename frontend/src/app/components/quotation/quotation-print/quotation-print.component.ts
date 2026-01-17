import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { QuotationService } from '../../../services/quotation.service';
import { Quotation } from '../../../models/quotation.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-quotation-print',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  templateUrl: './quotation-print.component.html',
  styleUrl: './quotation-print.component.css'
})
export class QuotationPrintComponent implements OnInit {
  quotation = signal<Quotation | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private quotationService: QuotationService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadQuotation(+id);
    } else {
      this.error.set('Invalid Quotation ID');
      this.isLoading.set(false);
    }
  }

  loadQuotation(id: number): void {
    this.quotationService.getQuotation(id).subscribe({
      next: (data) => {
        this.quotation.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading quotation:', err);
        this.error.set('Failed to load quotation details.');
        this.isLoading.set(false);
      }
    });
  }

  downloadPdf(): void {
    // The user wants to download "exact these pages", so we use the browser's print-to-pdf capability
    // which uses the @media print CSS already defined.
    this.notificationService.showInfo('Select "Save as PDF" in the print dialog.');
    window.print();
  }



  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format: 28 / 06 / 2024
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day} / ${month} / ${year}`;
  }

  formatCurrency(amount: string | number | undefined): string {
    if (amount === undefined || amount === null) return '0.00/-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-IN') + '/-';
  }

  formatNumber(value: string | number | undefined): string {
    if (value === undefined || value === null) return '0';
    return value.toString();
  }
}
