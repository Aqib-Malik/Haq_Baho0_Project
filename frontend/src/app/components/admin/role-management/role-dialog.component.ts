import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';

import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-role-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatListModule,
        MatCheckboxModule,
        MatIconModule
    ],
    templateUrl: './role-dialog.component.html',
    styleUrls: ['./role-dialog.component.css']
})
export class RoleDialogComponent implements OnInit {
    roleForm: FormGroup;
    allPermissions: any[] = [];
    filteredPermissions: any[] = [];
    selectedPermissionIds: number[] = [];
    isEditMode: boolean = false;
    apiUrl = `${environment.apiUrl}/roles/`;
    permissionsUrl = `${environment.apiUrl}/permissions/`;

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        public dialogRef: MatDialogRef<RoleDialogComponent>,
        private notificationService: NotificationService,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.isEditMode = !!data.id;
        this.roleForm = this.fb.group({
            name: [data.name || '', Validators.required]
        });

        if (data.permissions) {
            this.selectedPermissionIds = data.permissions.map((p: any) => p.id);
        }
    }

    ngOnInit() {
        this.http.get<any>(this.permissionsUrl).subscribe({
            next: (data) => {
                console.log('Raw permissions API response:', data); // Debug log
                const perms = data.results || data;
                console.log('Processed permissions array:', perms); // Debug log
                this.allPermissions = perms;
                this.filteredPermissions = perms;
                console.log('filteredPermissions set to:', this.filteredPermissions); // Debug log
                this.cdr.detectChanges(); // Force update
            },
            error: (e) => {
                console.error('Error loading permissions', e);
                this.notificationService.showError('Failed to load permissions');
            }
        });
    }

    onSearch(event: Event): void {
        const input = event.target as HTMLInputElement;
        const query = input.value.toLowerCase();

        if (!query) {
            this.filteredPermissions = this.allPermissions;
            return;
        }

        this.filteredPermissions = this.allPermissions.filter(perm =>
            perm.name.toLowerCase().includes(query) ||
            perm.codename.toLowerCase().includes(query)
        );
    }

    togglePermission(permId: number) {
        const index = this.selectedPermissionIds.indexOf(permId);
        if (index >= 0) {
            this.selectedPermissionIds.splice(index, 1);
        } else {
            this.selectedPermissionIds.push(permId);
        }
    }

    isSelected(permId: number): boolean {
        return this.selectedPermissionIds.includes(permId);
    }

    onSave(): void {
        if (this.roleForm.valid) {
            const formData = {
                ...this.roleForm.value,
                permission_ids: this.selectedPermissionIds
            };

            if (this.isEditMode) {
                this.http.patch(`${this.apiUrl}${this.data.id}/`, formData).subscribe({
                    next: () => {
                        this.notificationService.showSuccess('Role updated successfully');
                        this.dialogRef.close(true);
                    },
                    error: (error) => {
                        console.error('Error updating role:', error);
                        this.notificationService.showError('Failed to update role');
                    }
                });
            } else {
                this.http.post(this.apiUrl, formData).subscribe({
                    next: () => {
                        this.notificationService.showSuccess('Role created successfully');
                        this.dialogRef.close(true);
                    },
                    error: (error) => {
                        console.error('Error creating role:', error);
                        this.notificationService.showError('Failed to create role');
                    }
                });
            }
        } else {
            this.roleForm.markAllAsTouched();
        }
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
