import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { RoleDialogComponent } from './role-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '../../../services/notification.service';

@Component({
    selector: 'app-role-management',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './role-management.component.html',
    styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit {
    displayedColumns: string[] = ['name', 'permissions', 'actions'];
    dataSource: any[] = [];
    apiUrl = 'http://13.61.5.28/api/roles/';
    loading = false;

    constructor(
        private http: HttpClient,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        this.loadRoles();
    }

    loadRoles() {
        this.loading = true;
        this.http.get<any>(this.apiUrl)
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
            }))
            .subscribe({
                next: (data) => {
                    console.log('Roles data received:', data);
                    this.dataSource = data.results || data;
                },
                error: (e) => {
                    console.error('Error loading roles', e);
                    this.notificationService.showError('Failed to load roles');
                }
            });
    }

    openDialog(role?: any): void {
        const dialogRef = this.dialog.open(RoleDialogComponent, {
            width: '600px',
            data: role || {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadRoles();
            }
        });
    }

    async deleteRole(id: number) {
        const confirmed = await this.notificationService.confirm({
            title: 'Delete Role?',
            text: 'Are you sure you want to delete this role? This action cannot be undone.',
            confirmButtonText: 'Yes, delete role',
            icon: 'warning'
        });

        if (confirmed) {
            this.http.delete(`${this.apiUrl}${id}/`).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Role deleted successfully');
                    this.loadRoles();
                },
                error: (error) => {
                    console.error('Error deleting role:', error);
                    this.notificationService.showError('Failed to delete role');
                }
            });
        }
    }

    getVisiblePermissions(permissions: any[]): any[] {
        return permissions.slice(0, 3);
    }

    getHiddenPermissionsCount(permissions: any[]): number {
        return Math.max(0, permissions.length - 3);
    }

    getHiddenPermissionsTooltip(permissions: any[]): string {
        return permissions
            .slice(3)
            .map(p => p.name)
            .join(', ');
    }
}
