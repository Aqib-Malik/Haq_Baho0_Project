import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { LedgerService } from '../../../services/ledger.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './company-form.component.html',
  styleUrl: './company-form.component.css'
})
export class CompanyFormComponent {
  private fb = inject(FormBuilder);
  private ledgerService = inject(LedgerService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  public dialogRef = inject(MatDialogRef<CompanyFormComponent>);

  companyForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    contact_person: [''],
    gstin: ['', [Validators.maxLength(15)]]
  });

  isLoading = false;

  onSubmit() {
    if (this.companyForm.valid) {
      this.isLoading = true;
      this.ledgerService.createCompany(this.companyForm.value).subscribe({
        next: (company) => {
          this.notificationService.showSuccess('Company added successfully!');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error adding company:', error);
          this.isLoading = false;
          let errorMessage = 'Failed to add company. Please try again.';
          if (error.error && error.error.name) {
            errorMessage = `Error: ${error.error.name[0]}`;
          }
          this.notificationService.showError(errorMessage);
        }
      });
    } else {
      this.companyForm.markAllAsTouched();
    }
  }

  goBack() {
    this.dialogRef.close(); // Close without result
  }
}
