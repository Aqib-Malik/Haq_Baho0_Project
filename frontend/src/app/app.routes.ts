import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { AdminLayoutComponent } from './components/layout/admin-layout/admin-layout.component';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./components/welcome/welcome.component').then(m => m.WelcomeComponent)
            },
            {
                path: 'ledger',
                loadComponent: () => import('./components/ledger/ledger.component').then(m => m.LedgerComponent)
            },
            {
                path: 'invoices',
                loadComponent: () => import('./components/invoice/invoice.component').then(m => m.InvoiceComponent)
            },
            {
                path: 'payments',
                loadComponent: () => import('./components/payment/payment.component').then(m => m.PaymentComponent)
            },
            {
                path: 'quotations',
                loadComponent: () => import('./components/quotation/quotation.component').then(m => m.QuotationComponent)
            },
            {
                path: 'quotations/new',
                loadComponent: () => import('./components/quotation/quotation-form/quotation-form.component').then(m => m.QuotationFormComponent)
            },
            {
                path: 'quotations/edit/:id',
                loadComponent: () => import('./components/quotation/quotation-form/quotation-form.component').then(m => m.QuotationFormComponent)
            },
            {
                path: 'quotations/:id/view',
                loadComponent: () => import('./components/quotation/quotation-print/quotation-print.component').then(m => m.QuotationPrintComponent)
            },
            {
                path: 'add-company',
                loadComponent: () => import('./components/company/company-form/company-form.component').then(m => m.CompanyFormComponent)
            },
            {
                path: 'inventory',
                loadComponent: () => import('./components/inventory/inventory.component').then(m => m.InventoryComponent)
            },
            // Admin Routes
            {
                path: 'admin/users',
                loadComponent: () => import('./components/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
                data: { permissions: ['view_user'] }
            },
            {
                path: 'admin/roles',
                loadComponent: () => import('./components/admin/role-management/role-management.component').then(m => m.RoleManagementComponent),
                data: { permissions: ['view_group'] }
            }
        ]
    },

    // Fallback
    { path: '**', redirectTo: '' }
];
