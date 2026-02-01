import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MachineService } from '../../../services/machine.service';
import { Machine } from '../../../models/machine.model';

@Component({
    selector: 'app-machine-list',
    standalone: true,
    imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule],
    templateUrl: './machine-list.component.html',
    styleUrls: ['./machine-list.component.css']
})
export class MachineListComponent implements OnInit {
    machines: Machine[] = [];
    displayedColumns: string[] = ['name', 'description', 'actions'];

    constructor(private machineService: MachineService) { }

    ngOnInit(): void {
        this.loadMachines();
    }

    loadMachines() {
        this.machineService.getMachines().subscribe(data => {
            this.machines = data;
        });
    }

    deleteMachine(id: number) {
        if (confirm('Are you sure you want to delete this machine?')) {
            this.machineService.deleteMachine(id).subscribe(() => {
                this.loadMachines();
            });
        }
    }
}
