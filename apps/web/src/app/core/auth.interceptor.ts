import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  if (!token || isAuthRequest) {
    return next(req);
  }

  return next(withBearerToken(req, token)).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return auth.refreshTokens().pipe(
        switchMap(() => {
          const refreshedToken = auth.accessToken;
          return refreshedToken ? next(withBearerToken(req, refreshedToken)) : throwError(() => error);
        }),
        catchError((refreshError) => {
          auth.logout();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};

function withBearerToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
