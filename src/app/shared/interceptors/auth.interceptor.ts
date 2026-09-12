import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // Prevents multiple simultaneous refresh calls
  private isRefreshing = false;
  private refreshDone$ = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    // Skip auth endpoints — they don't need a token
    if (request.url.includes('/auth/')) {
      return next.handle(request);
    }

    // Attach access token to every other request
    request = this.attachToken(request);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401) {
          // Access token expired → try to silently refresh
          return this.handle401Error(request, next);
        }

        return throwError(() => error);
      })
    );
  }

  // ─── Clone request with Bearer token ──────────────────
  private attachToken(request: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authService.getToken();
    if (!token) return request;

    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // ─── Called when server returns 401 ───────────────────
  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    if (!this.authService.getRefreshToken()) {
      // No refresh token at all → logout immediately
      this.authService.logout();
      return throwError(() => new Error('No refresh token. Please login.'));
    }

    if (!this.isRefreshing) {
      // First request to hit 401 → trigger one refresh call
      this.isRefreshing = true;
      this.refreshDone$.next(false);

      return this.authService.refreshToken().pipe(
        switchMap(() => {
          // Refresh succeeded → retry original request with new token
          this.isRefreshing = false;
          this.refreshDone$.next(true);
          return next.handle(this.attachToken(request));
        }),
        catchError(err => {
          // Refresh token also expired → force logout
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );

    } else {
      // Another request already triggered a refresh → wait for it to finish
      return this.refreshDone$.pipe(
        filter(done => done === true),  // Wait until refresh completes
        take(1),
        switchMap(() => next.handle(this.attachToken(request)))
      );
    }
  }
}
