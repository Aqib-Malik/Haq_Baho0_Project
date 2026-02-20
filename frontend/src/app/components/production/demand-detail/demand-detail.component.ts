import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { DemandService } from '../../../services/demand.service';
import { Demand } from '../../../models/demand.model';

@Component({
    selector: 'app-demand-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule, DatePipe, DecimalPipe],
    templateUrl: './demand-detail.component.html',
    styleUrls: ['./demand-detail.component.css']
})
export class DemandDetailComponent implements OnInit {
    demand: Demand | null = null;
    loading = true;
    error = false;

    constructor(
        private demandService: DemandService,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/production/demands']);
            return;
        }
        this.demandService.getDemand(+id).subscribe({
            next: (data) => {
                this.demand = data;
                this.loading = false;
            },
            error: () => {
                this.error = true;
                this.loading = false;
            }
        });
    }

    getOrderTotal(order: { machine_amount?: string | null; quantity: string }): number | null {
        const amt = order.machine_amount != null ? Number(order.machine_amount) : null;
        const qty = order.quantity != null ? Number(order.quantity) : null;
        if (amt == null || qty == null) return null;
        return amt * qty;
    }
}
