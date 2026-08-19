import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, finalize } from 'rxjs';
import { ApiService } from './api.service';
import type { AuthResponse, User } from '../shared/models';

const TOKEN_KEY = 'vitrina_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private setToken(token: string | null): void {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  setUser(user: User | null): void {
    this.userSignal.set(user);
  }

  bootstrap(): void {
    const token = this.getToken();
    if (!token) {
      this.userSignal.set(null);
      return;
    }
    this.loadingSignal.set(true);
    this.api
      .profile()
      .pipe(
        catchError(() => {
          this.setToken(null);
          this.userSignal.set(null);
          return of(null);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((u) => {
        if (u) this.userSignal.set(u);
      });
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.api.login(identifier, password).pipe(
      tap((res) => this.applyAuth(res)),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  register(body: {
    username: string;
    email: string;
    name: string;
    password: string;
  }): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.api.register(body).pipe(
      tap((res) => this.applyAuth(res)),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  refreshProfile(): void {
    if (!this.getToken()) return;
    this.api.profile().subscribe({
      next: (u) => this.userSignal.set(u),
      error: () => {
        /* keep existing */
      },
    });
  }

  logout(): void {
    this.setToken(null);
    this.userSignal.set(null);
    void this.router.navigateByUrl('/');
  }

  private applyAuth(res: AuthResponse): void {
    this.setToken(res.accessToken);
    this.userSignal.set(res.user);
  }
}
