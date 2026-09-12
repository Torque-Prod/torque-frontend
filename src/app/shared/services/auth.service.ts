import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  roleId: number;
  branchLocation: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = `${API_BASE_URL}/api/v1/auth`;
  private readonly ACCESS_TOKEN_KEY  = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Login: save both tokens ───────────────────────────
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/authenticate`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY,  response.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
      })
    );
  }

  // ─── Register: save both tokens ────────────────────────
  register(credentials: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY,  response.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
      })
    );
  }

  // ─── Refresh: get new access token ─────────────────────
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${this.API_URL}/refresh-token`, { refreshToken }).pipe(
      tap(response => {
        // Only update the access token; keep the same refresh token
        localStorage.setItem(this.ACCESS_TOKEN_KEY, response.accessToken);
      })
    );
  }

  // ─── Logout: clear everything ──────────────────────────
  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  // ─── Token helpers ─────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  }

  getUsername(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  getPrivileges(): string[] {
    const token = this.getToken();
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.privileges || [];
    } catch {
      return [];
    }
  }

  hasPrivilege(privilege: string): boolean {
    // ADMIN role gets full access to everything automatically
    if (this.getRole() === 'ADMIN') {
      return true;
    }

    const privileges = this.getPrivileges();
    if (!privileges || privileges.length === 0) {
      return false;
    }

    // Direct match
    if (privileges.includes(privilege)) {
      return true;
    }

    // Handle common privilege aliases (e.g. READ_JOB -> VIEW_REPAIR_JOBS / MANAGE_REPAIR_JOBS)
    const aliases: { [key: string]: string[] } = {
      'READ_JOB': ['VIEW_REPAIR_JOBS', 'MANAGE_REPAIR_JOBS'],
      'WRITE_JOB': ['MANAGE_REPAIR_JOBS'],
      'READ_CUSTOMER': ['VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS'],
      'WRITE_CUSTOMER': ['MANAGE_CUSTOMERS'],
      'READ_INVENTORY': ['VIEW_INVENTORY', 'MANAGE_INVENTORY'],
      'WRITE_INVENTORY': ['MANAGE_INVENTORY'],
      'MANAGE_ROLES': ['MANAGE_ROLES', 'MANAGE_SETTINGS'],
    };

    const mapped = aliases[privilege];
    if (mapped) {
      return mapped.some(p => privileges.includes(p));
    }

    return false;
  }
}
