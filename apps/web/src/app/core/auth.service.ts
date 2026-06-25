import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { Role, User } from './types';

type LoginResponse = {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

type TokenResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const API_BASE_URL = 'http://localhost:4000/api';
const USER_KEY = 'shalvinat_hms_user';
const ACCESS_KEY = 'shalvinat_hms_access_token';
const REFRESH_KEY = 'shalvinat_hms_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<User | null>(this.loadUser());
  private refreshInFlight$?: Observable<TokenResponse>;

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState() && this.accessToken));

  get accessToken() {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(credentials: { email: string; password: string }) {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.storeTokens(response.tokens);
        this.userState.set(response.user);
      })
    );
  }

  refreshTokens() {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        .pipe(
          tap((response) => this.storeTokens(response.tokens)),
          finalize(() => {
            this.refreshInFlight$ = undefined;
          }),
          shareReplay(1)
        );
    }

    return this.refreshInFlight$;
  }

  logout() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.userState.set(null);
  }

  hasAnyRole(roles: readonly Role[]) {
    const user = this.userState();
    return Boolean(user?.roles.includes('director') || roles.some((role) => user?.roles.includes(role)));
  }

  private storeTokens(tokens: TokenResponse['tokens']) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
