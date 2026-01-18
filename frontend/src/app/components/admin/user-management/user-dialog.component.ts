import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';

import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-user-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatIconModule
    ],
    templateUrl: './user-dialog.component.html',
    styleUrls: ['./user-dialog.component.css']
})
export class UserDialogComponent implements OnInit {
    userForm: FormGroup;
    roles: any[] = [];
    isEditMode: boolean = false;
    apiUrl = `${environment.apiUrl}/users/`;
    rolesUrl = `${environment.apiUrl}/roles/`;

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        public dialogRef: MatDialogRef<UserDialogComponent>,
        private notificationService: NotificationService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.isEditMode = !!data.id;
        this.userForm = this.fb.group({
            username: [data.username || '', Validators.required],
            email: [data.email || '', [Validators.required, Validators.email]],
            first_name: [data.first_name || ''],
            last_name: [data.last_name || ''],
            password: [''],
            role_ids: [data.roles ? data.roles.map((r: any) => r.id) : []]
        });
    }

    ngOnInit() {
        this.http.get<any>(this.rolesUrl).subscribe({
            next: (data) => {
                this.roles = data.results || data;
            },
            error: (e) => {
                console.error('Error loading roles for dropdown', e);
                this.notificationService.showError('Failed to load roles');
            }
        });
    }

    onSave(): void {
        if (this.userForm.valid) {
            const formData = this.userForm.value;

            if (this.isEditMode) {
                if (!formData.password) {
                    delete formData.password;
                }
                this.http.patch(`${this.apiUrl}${this.data.id}/`, formData).subscribe({
                    next: () => {
                        this.notificationService.showSuccess('User updated successfully');
                        this.dialogRef.close(true);
                    },
                    error: (error) => {
                        console.error('Error updating user:', error);
                        this.notificationService.showError('Failed to update user');
                    }
                });
            } else {
                if (!formData.password) {
                    this.notificationService.showError('Password is required for new users');
                    return;
                }
                this.http.post(this.apiUrl, formData).subscribe({
                    next: () => {
                        this.notificationService.showSuccess('User created successfully');
                        this.dialogRef.close(true);
                    },
                    error: (error) => {
                        console.error('Error creating user:', error);
                        this.notificationService.showError('Failed to create user');
                    }
                });
            }
        } else {
            this.userForm.markAllAsTouched();
        }
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
