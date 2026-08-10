import { computed, inject, Injectable, Injector, OnDestroy, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { AuthUser, LoginResponse } from '../models/auth.models';
import { BackendJwtPayload } from '../models/jwt-payload.model';
import { AuthApiService } from './auth-api.service';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly tokenService = inject(TokenService);

  private readonly userSignal = signal<AuthUser | null>(null);
  private expirationTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor() {
    this.restoreSession();
  }

  ngOnDestroy(): void {
    this.clearExpirationTimer();
  }

  startSession(response: LoginResponse): AuthUser {
    const payload = this.tokenService.getPayload(response.token);

    if (!payload || this.tokenService.isPayloadExpired(payload)) {
      this.clearSession();
      throw new Error('Login response did not include a valid backend JWT.');
    }

    const user = this.toAuthUser(response, payload);

    this.tokenService.setAccessToken(response.token);
    if (response.refreshToken) {
      this.tokenService.setRefreshToken(response.refreshToken);
    }
    this.userSignal.set(user);
    this.scheduleSessionExpiration();
    return user;
  }

  clearSession(): void {
    this.clearExpirationTimer();
    this.tokenService.clearTokens();
    this.userSignal.set(null);
  }

  refreshSession(): Observable<AuthUser> {
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      throw new Error('No refresh token is available.');
    }

    return this.authApiService.refresh({ refreshToken }).pipe(
      map((response) => response.data),
      map((response) => this.startSession(response)),
    );
  }

  logoutCurrentDevice(): Observable<void> {
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }

    return this.authApiService.logout({ refreshToken }).pipe(
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  logoutAllDevices(): Observable<void> {
    return this.authApiService.logoutAll().pipe(
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  hasValidSession(): boolean {
    if (!this.userSignal()) {
      return false;
    }

    if (this.tokenService.isAccessTokenExpired()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  hasRole(role: string): boolean {
    return this.hasValidSession() && this.userSignal()?.role.toLowerCase() === role.toLowerCase();
  }

  private restoreSession(): void {
    const user = this.readUserFromToken();

    this.userSignal.set(user);

    if (user) {
      this.scheduleSessionExpiration();
    }
  }

  private get authApiService(): AuthApiService {
    return this.injector.get(AuthApiService);
  }

  private readUserFromToken(): AuthUser | null {
    const payload = this.getValidPayload();

    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.sub,
      role: payload.role,
    };
  }

  private toAuthUser(response: LoginResponse, payload: BackendJwtPayload): AuthUser {
    return {
      userId: payload.userId,
      email: payload.sub,
      name: response.name,
      role: payload.role,
    };
  }

  private getValidPayload(): BackendJwtPayload | null {
    const payload = this.tokenService.getPayload();

    if (!payload || this.tokenService.isPayloadExpired(payload)) {
      this.clearSession();
      return null;
    }

    return payload;
  }

  private scheduleSessionExpiration(): void {
    this.clearExpirationTimer();

    const payload = this.tokenService.getPayload();

    if (!payload) {
      return;
    }

    const delay = payload.exp * 1000 - Date.now();

    if (delay <= 0) {
      this.clearSession();
      return;
    }

    this.expirationTimeoutId = globalThis.setTimeout(
      () => {
        if (this.tokenService.isAccessTokenExpired()) {
          this.clearSession();
          return;
        }

        this.scheduleSessionExpiration();
      },
      Math.min(delay, 2_147_483_647),
    );
  }

  private clearExpirationTimer(): void {
    if (!this.expirationTimeoutId) {
      return;
    }

    globalThis.clearTimeout(this.expirationTimeoutId);
    this.expirationTimeoutId = null;
  }
}
