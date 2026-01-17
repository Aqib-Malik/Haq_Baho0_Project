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
import { InventoryItem } from '../../models/quotation.model';
import { InventoryFormDialogComponent } from './inventory-form-dialog/inventory-form-dialog.component';

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
        ReactiveFormsModule
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

    constructor(
        private quotationService: QuotationService,
        private notificationService: NotificationService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadItems();
        this.setupSearch();
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

        // Note: getInventoryItems currently returns array, ideally it would support serverside pagination
        // For now, we'll fetch all and paginate/filter client side if needed, or update service later.
        // However, looking at the service, it DOES accept params in `getInventoryItems` but return type might be simple array.
        // The service implementation I saw mapped response to array.
        // Let's assume for now filters are applied backend side via 'search' param.

        this.quotationService.getInventoryItems(searchTerm).subscribe({
            next: (data) => {
                this.items.set(data);
                this.totalItems.set(data.length); // If no pagination metadata, just use array length
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading inventory:', error);
                this.notificationService.showError('Failed to load inventory items');
                this.isLoading.set(false);
            }
        });
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
}
