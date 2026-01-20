import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatRippleModule
    ],
    templateUrl: './welcome.component.html',
    styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
    currentDate: Date = new Date();
    username: string = 'User';

    // Simplified quick actions for a clean welcome screen
    quickActions = [
        { title: 'Company Ledger', icon: 'account_balance', route: '/ledger', description: 'Manage company financial records' },
        { title: 'Invoices', icon: 'receipt', route: '/invoices', description: 'Create and manage invoices' },
        { title: 'Stock Receipt', icon: 'inventory_2', route: '/inventory', description: 'Manage inventory stock' },
        { title: 'Employees', icon: 'badge', route: '/admin/users', description: 'HR and employee management' }
    ];

    constructor(
        private authService: AuthService,
        private router: Router,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        this.authService.currentUser.subscribe((user: any) => {
            if (user) {
                this.username = user.username;
            }
        });

        // Update time every minute
        setInterval(() => {
            this.currentDate = new Date();
        }, 60000);
    }

    handleAction(action: any) {
        if (action.route) {
            this.router.navigate([action.route]);
        } else {
            this.showComingSoon(action.title);
        }
    }

    showComingSoon(moduleName: string) {
        this.notificationService.showSuccess(`Coming Soon: ${moduleName} module is under development.`);
    }

    getGreeting(): string {
        const hour = this.currentDate.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }
}
