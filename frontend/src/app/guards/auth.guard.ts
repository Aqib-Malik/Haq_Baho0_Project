import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.access) {
            // check if route is restricted by role provided in route data
            if (route.data['permissions'] && !this.checkPermissions(route.data['permissions'])) {
                // role not authorised so redirect to home page
                this.router.navigate(['/']);
                return false;
            }

            // authorised so return true
            return true;
        }

        // not logged in so redirect to login page with the return url
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }

    private checkPermissions(requiredPermissions: string[]): boolean {
        for (const perm of requiredPermissions) {
            if (this.authService.hasPermission(perm)) {
                return true;
            }
        }
        return false;
    }
}
