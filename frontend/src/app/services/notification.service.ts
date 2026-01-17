import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor() { }

    /**
     * Show a success toast notification
     */
    showSuccess(message: string): void {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: '#ffffff',
            color: '#1e293b',
            iconColor: '#10b981',
            customClass: {
                popup: 'animated fadeInDown faster'
            }
        });
    }

    /**
     * Show an error toast notification
     */
    showError(message: string): void {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            background: '#ffffff',
            color: '#1e293b',
            iconColor: '#ef4444',
            customClass: {
                popup: 'animated fadeInDown faster'
            }
        });
    }
    /**
     * Show an info toast notification
     */
    showInfo(message: string): void {
        Swal.fire({
            icon: 'info',
            title: 'Info',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            background: '#ffffff',
            color: '#1e293b',
            iconColor: '#3b82f6',
            customClass: {
                popup: 'animated fadeInDown faster'
            }
        });
    }

    /**
     * Show an error toast notification

    /**
     * Show a detailed error dialog
     */
    showErrorDialog(title: string, message: string): void {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'OK',
            background: '#ffffff',
            color: '#1e293b'
        });
    }

    /**
     * Show a confirmation dialog (e.g. for delete)
     */
    async confirm(options: {
        title?: string;
        text?: string;
        confirmButtonText?: string;
        cancelButtonText?: string;
        icon?: 'warning' | 'error' | 'question' | 'info' | 'success';
    }): Promise<boolean> {
        const result = await Swal.fire({
            title: options.title || 'Are you sure?',
            text: options.text || "You won't be able to revert this!",
            icon: options.icon || 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Red for dangerous actions
            cancelButtonColor: '#64748b',   // Slate for cancel
            confirmButtonText: options.confirmButtonText || 'Yes, delete it!',
            cancelButtonText: options.cancelButtonText || 'Cancel',
            reverseButtons: true, // Cancel on left, Confirm on right
            background: '#ffffff',
            color: '#1e293b',
            iconColor: options.icon === 'warning' ? '#f59e0b' : '#ef4444',
            customClass: {
                confirmButton: 'swal2-confirm-btn',
                cancelButton: 'swal2-cancel-btn'
            }
        });

        return result.isConfirmed;
    }
}
