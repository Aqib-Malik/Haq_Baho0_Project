import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://13.61.5.28/api';
    private currentUserSubject: BehaviorSubject<any>;
    public currentUser: Observable<any>;

    constructor(private http: HttpClient, private router: Router) {
        this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || '{}'));
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): any {
        return this.currentUserSubject.value;
    }

    public get token(): string | null {
        const user = this.currentUserValue;
        return user && user.access ? user.access : null;
    }

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/token/`, { username, password })
            .pipe(map(user => {
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.currentUserSubject.next(user);
                return user;
            }));
    }

    refreshToken(): Observable<any> {
        const user = this.currentUserValue;
        const refresh = user && user.refresh ? user.refresh : null;

        return this.http.post<any>(`${this.apiUrl}/token/refresh/`, { refresh })
            .pipe(map(tokens => {
                const currentUser = {
                    ...this.currentUserValue,
                    access: tokens.access,
                    // keep refresh token if not returned, usually refresh is rotated or kept same
                    refresh: tokens.refresh || this.currentUserValue.refresh
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                this.currentUserSubject.next(currentUser);
                return tokens;
            }));
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    hasPermission(permission: string): boolean {
        const token = this.token;
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.is_superuser) return true;
            return payload.permissions && payload.permissions.includes(permission);
        } catch (e) {
            return false;
        }
    }
}
