import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DemandService } from '../../../services/demand.service';
import { Demand } from '../../../models/demand.model';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
    selector: 'app-demand-list',
    standalone: true,
    imports: [
        CommonModule, RouterModule, MatTableModule, MatButtonModule,
        MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, DatePipe, DecimalPipe
    ],
    templateUrl: './demand-list.component.html',
    styleUrls: ['./demand-list.component.css']
})
export class DemandListComponent implements OnInit {
    demands = new MatTableDataSource<Demand>([]);
    displayedColumns: string[] = ['select', 'date', 'company', 'reference', 'status', 'actions'];
    selection = new SelectionModel<Demand>(true, []);
    isLoading = false;

    aggregatedMaterials: any[] = [];
    showSummary = false;
    today = new Date();

    constructor(
        private demandService: DemandService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadDemands();
    }

    loadDemands() {
        this.demandService.getDemands().subscribe(data => {
            this.demands.data = data;
            this.cdr.detectChanges();
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.demands.data.length;
        return numSelected === numRows;
    }

    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear();
            return;
        }
        this.selection.select(...this.demands.data);
    }

    checkboxLabel(row?: Demand): string {
        if (!row) {
            return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
    }

    aggregateSelected() {
        const selectedIds = this.selection.selected.map(d => d.id);
        if (selectedIds.length === 0) {
            alert('Select at least one demand sheet.');
            return;
        }

        this.isLoading = true;
        this.demandService.aggregateDemands(selectedIds)
            .subscribe({
                next: (data) => {
                    // Use setTimeout to avoid NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
                    // if the response is too fast or interferes with current CD cycle
                    setTimeout(() => {
                        this.aggregatedMaterials = data;
                        this.showSummary = true;
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }, 0);
                },
                error: (err) => {
                    setTimeout(() => {
                        this.isLoading = false;
                        console.error('Aggregation error:', err);
                        alert('Failed to aggregate demands.');
                        this.cdr.detectChanges();
                    }, 0);
                }
            });
    }

    printReport() {
        window.print();
    }

    trackByItem(index: number, item: any): number {
        return item.inventory_item__id;
    }
}
