import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { QuotationService } from '../../services/quotation.service';
import { NotificationService } from '../../services/notification.service';
import { InventoryItem, StockTransaction } from '../../models/quotation.model';
import { InventoryFormDialogComponent } from './inventory-form-dialog/inventory-form-dialog.component';
import { StockTransactionDialogComponent } from './stock-transaction-dialog/stock-transaction-dialog.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatPaginatorModule,
        MatDialogModule,
        MatTooltipModule,
        MatChipsModule,
        MatCardModule,
        MatProgressSpinnerModule,

        ReactiveFormsModule,
        MatTabsModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
    items = signal<InventoryItem[]>([]);
    totalItems = signal<number>(0);
    isLoading = signal<boolean>(false);
    displayedColumns: string[] = ['name', 'description', 'unit', 'unit_price', 'category', 'actions'];
    searchControl = new FormControl('');

    // Pagination
    pageSize = 10;
    pageIndex = 0;

    // Transactions State
    transactions = signal<StockTransaction[]>([]);
    totalTransactions = signal<number>(0);
    transactionPageSize = 10;
    transactionPageIndex = 0;
    transactionTypeControl = new FormControl('');

    selectedTabIndex = 0;

    constructor(
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadItems();
        this.setupSearch();

        // Listen to transaction filter changes
        this.transactionTypeControl.valueChanges.subscribe(() => {
            this.transactionPageIndex = 0;
            this.loadTransactions();
        });
    }

    setupSearch(): void {
        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(() => {
            this.pageIndex = 0; // Reset to first page on search
            this.loadItems();
        });
    }

    loadItems(): void {
        this.isLoading.set(true);
        const searchTerm = this.searchControl.value || '';

        this.quotationService.getInventoryItems(searchTerm).subscribe({
            next: (data) => {
                this.items.set(data);
                this.totalItems.set(data.length);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading inventory:', error);
                this.notificationService.showError('Failed to load inventory items');
                this.isLoading.set(false);
            }
        });
    }

    loadTransactions(): void {
        this.isLoading.set(true);
        const type = this.transactionTypeControl.value || undefined;

        this.quotationService.getStockTransactions(undefined, type, this.transactionPageIndex + 1, this.transactionPageSize).subscribe({
            next: (data) => {
                this.transactions.set(data.results);
                this.totalTransactions.set(data.count);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading transactions:', err);
                this.notificationService.showError('Failed to load transactions');
                this.isLoading.set(false);
            }
        });
    }

    onTabChange(index: number): void {
        this.selectedTabIndex = index;
        if (index === 1 && this.transactions().length === 0) {
            this.loadTransactions();
        }
    }

    onPageChange(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        // Client side pagination for items for now (as service returns full list mostly)
        // If service supports server-side, call loadItems()
    }

    onTransactionPageChange(event: PageEvent): void {
        this.transactionPageIndex = event.pageIndex;
        this.transactionPageSize = event.pageSize;
        this.loadTransactions();
    }

    openInventoryDialog(item?: InventoryItem): void {
        const dialogRef = this.dialog.open(InventoryFormDialogComponent, {
            width: '600px',
            maxWidth: '95vw',
            panelClass: 'custom-dialog-container',
            data: { item }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadItems();
            }
        });
    }

    confirmDelete(item: InventoryItem): void {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete "${item.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.deleteItem(item.id);
            }
        });
    }

    deleteItem(id: number): void {
        this.quotationService.deleteInventoryItem(id).subscribe({
            next: () => {
                this.notificationService.showSuccess('Item deleted successfully');
                this.loadItems();
            },
            error: (error) => {
                console.error('Error deleting item:', error);
                this.notificationService.showError('Failed to delete item');
            }
        });
    }

    formatCurrency(amount: any): string {
        const num = parseFloat(amount);
        if (isNaN(num)) return 'Rs 0.00';
        return `Rs ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    openTransactionDialog(): void {
        const dialogRef = this.dialog.open(StockTransactionDialogComponent, {
            width: '600px',
            maxWidth: '95vw',
            data: { type: 'receipt' } // Default to receipt
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadTransactions();
                // Also reload items to show updated stock
                this.loadItems();
            }
        });
    }
}
