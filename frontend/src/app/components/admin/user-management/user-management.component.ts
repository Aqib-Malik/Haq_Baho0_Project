import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { UserDialogComponent } from './user-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '../../../services/notification.service';

@Component({
    selector: 'app-user-management',
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
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
    displayedColumns: string[] = ['username', 'email', 'firstName', 'lastName', 'roles', 'actions'];
    dataSource: any[] = [];
    apiUrl = 'http://127.0.0.1:8000/api/users/';
    loading = false;

    constructor(
        private http: HttpClient,
        public dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.http.get<any>(this.apiUrl)
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
            }))
            .subscribe({
                next: (data) => {
                    console.log('Users data received:', data);
                    this.dataSource = data.results || data;
                },
                error: (e) => {
                    console.error('Error loading users', e);
                    this.notificationService.showError('Failed to load users');
                }
            });
    }

    openDialog(user?: any): void {
        const dialogRef = this.dialog.open(UserDialogComponent, {
            width: '500px',
            data: user || {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadUsers();
            }
        });
    }

    async deleteUser(id: number) {
        const confirmed = await this.notificationService.confirm({
            title: 'Delete User?',
            text: 'Are you sure you want to delete this user? This action cannot be undone.',
            confirmButtonText: 'Yes, delete user',
            icon: 'warning'
        });

        if (confirmed) {
            this.http.delete(`${this.apiUrl}${id}/`).subscribe({
                next: () => {
                    this.notificationService.showSuccess('User deleted successfully');
                    this.loadUsers();
                },
                error: (error) => {
                    console.error('Error deleting user:', error);
                    this.notificationService.showError('Failed to delete user');
                }
            });
        }
    }

    getVisibleRoles(roles: any[]): any[] {
        return roles.slice(0, 2); // Show fewer roles as names can be long
    }

    getHiddenRolesCount(roles: any[]): number {
        return Math.max(0, roles.length - 2);
    }

    getHiddenRolesTooltip(roles: any[]): string {
        return roles
            .slice(2)
            .map(r => r.name)
            .join(', ');
    }
}
