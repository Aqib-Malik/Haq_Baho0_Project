import { Component } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatExpansionModule,
        MatDividerModule
    ],
    templateUrl: './admin-layout.component.html',
    styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {
    isHandset = false;

    constructor(
        public authService: AuthService,
        private notificationService: NotificationService,
        private breakpointObserver: BreakpointObserver,
        private router: Router
    ) {
        this.breakpointObserver.observe([Breakpoints.Handset])
            .subscribe(result => {
                this.isHandset = result.matches;
            });
    }

    get isWelcomePage(): boolean {
        return this.router.url === '/';
    }

    async logout() {
        const confirmed = await this.notificationService.confirm({
            title: 'Confirm Logout',
            text: 'Are you sure you want to logout?',
            confirmButtonText: 'Logout',
            cancelButtonText: 'Cancel',
            icon: 'warning'
        });

        if (confirmed) {
            this.authService.logout();
        }
    }

    hasPermission(perm: string): boolean {
        return this.authService.hasPermission(perm);
    }

    showComingSoon(moduleName: string) {
        this.notificationService.showSuccess(`Coming Soon: ${moduleName} module is under development.`);
    }

    isSidebarOpen = true;

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }
}
