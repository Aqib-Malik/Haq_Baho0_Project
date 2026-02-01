import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DemandService } from '../../../services/demand.service';
import { Demand } from '../../../models/demand.model';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
    selector: 'app-demand-list',
    standalone: true,
    imports: [
        CommonModule, RouterModule, MatTableModule, MatButtonModule,
        MatIconModule, MatCheckboxModule, DatePipe, DecimalPipe
    ],
    templateUrl: './demand-list.component.html',
    styleUrls: ['./demand-list.component.css']
})
export class DemandListComponent implements OnInit {
    demands: Demand[] = [];
    displayedColumns: string[] = ['select', 'date', 'company', 'reference', 'status', 'actions'];
    selection = new SelectionModel<Demand>(true, []);

    aggregatedMaterials: any[] = [];
    showSummary = false;
    today = new Date();

    constructor(private demandService: DemandService) { }

    ngOnInit(): void {
        this.loadDemands();
    }

    loadDemands() {
        this.demandService.getDemands().subscribe(data => {
            this.demands = data;
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.demands.length;
        return numSelected === numRows;
    }

    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear();
            return;
        }
        this.selection.select(...this.demands);
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

        this.demandService.aggregateDemands(selectedIds).subscribe(data => {
            this.aggregatedMaterials = data;
            this.showSummary = true;
        });
    }

    printReport() {
        window.print();
    }
}
