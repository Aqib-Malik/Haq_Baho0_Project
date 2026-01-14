import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // If it's a refresh token request that failed, logout
                if (req.url.includes('token/refresh')) {
                    authService.logout();
                    return throwError(() => error);
                }

                // Try to refresh token
                return authService.refreshToken().pipe(
                    switchMap((token: any) => {
                        // Retry with new token
                        const newReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${token.access}`
                            }
                        });
                        return next(newReq);
                    }),
                    catchError((refreshError) => {
                        // Refresh failed, logout
                        authService.logout();
                        return throwError(() => refreshError);
                    })
                );
            }
            return throwError(() => error);
        })
    );
};
