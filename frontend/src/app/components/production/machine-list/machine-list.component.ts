import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
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
    machines = new MatTableDataSource<Machine>([]);
    displayedColumns: string[] = ['name', 'description', 'actions'];

    constructor(
        private machineService: MachineService,
        private cdr: ChangeDetectorRef
    ) { }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.machines.filter = filterValue.trim().toLowerCase();
    }

    ngOnInit(): void {
        this.loadMachines();
    }

    loadMachines() {
        this.machineService.getMachines().subscribe(data => {
            this.machines.data = data;
            this.cdr.detectChanges(); // Explicitly mark for check
        });
    }

    deleteMachine(id: number) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.machineService.deleteMachine(id).subscribe(() => {
                    this.loadMachines();
                    Swal.fire(
                        'Deleted!',
                        'Your machine has been deleted.',
                        'success'
                    );
                });
            }
        });
    }
}
