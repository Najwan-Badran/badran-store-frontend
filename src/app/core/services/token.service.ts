import { inject, Injectable } from '@angular/core';

import { BackendJwtPayload } from '../models/jwt-payload.model';
import { LocalStorageService } from './local-storage.service';
import { SessionStorageService } from './session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly sessionStorageService = inject(SessionStorageService);

  private readonly accessTokenKey = 'badran_store_access_token';
  // TODO: Store refresh tokens in an HttpOnly Secure cookie once backend support is available.
  private readonly refreshTokenKey = 'badran_store_refresh_token';

  getAccessToken(): string | null {
    return this.localStorageService.getItem(this.accessTokenKey);
  }

  setAccessToken(token: string): void {
    this.localStorageService.setItem(this.accessTokenKey, token);
  }

  clearAccessToken(): void {
    this.localStorageService.removeItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return this.sessionStorageService.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    this.sessionStorageService.setItem(this.refreshTokenKey, token);
  }

  clearRefreshToken(): void {
    this.sessionStorageService.removeItem(this.refreshTokenKey);
  }

  clearTokens(): void {
    this.clearAccessToken();
    this.clearRefreshToken();
  }

  getPayload(token = this.getAccessToken()): BackendJwtPayload | null {
    return token ? this.decodePayload(token) : null;
  }

  isAccessTokenExpired(token = this.getAccessToken()): boolean {
    return this.isPayloadExpired(this.getPayload(token));
  }

  isPayloadExpired(payload: BackendJwtPayload | null): boolean {
    const expiration = payload?.exp;

    if (!expiration) {
      return true;
    }

    return Date.now() >= expiration * 1000;
  }

  private decodePayload(token: string): BackendJwtPayload | null {
    if (typeof globalThis.atob !== 'function') {
      return null;
    }

    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    try {
      const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const normalizedPayload = base64Payload.padEnd(
        base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
        '=',
      );
      const decodedPayload = globalThis.atob(normalizedPayload);
      const parsedPayload = JSON.parse(decodedPayload) as Partial<BackendJwtPayload>;

      if (!isBackendJwtPayload(parsedPayload)) {
        return null;
      }

      return {
        ...parsedPayload,
        userId: normalizeUserId(parsedPayload.userId),
      };
    } catch {
      return null;
    }
  }
}

function isBackendJwtPayload(payload: Partial<BackendJwtPayload>): payload is BackendJwtPayload {
  return (
    typeof payload.sub === 'string' &&
    isUserId(payload.userId) &&
    typeof payload.role === 'string' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number'
  );
}

function isUserId(value: unknown): value is number | string {
  return (typeof value === 'number' && Number.isInteger(value) && value > 0) ||
    (typeof value === 'string' && /^\d+$/.test(value) && Number(value) > 0);
}

function normalizeUserId(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}
