import { TestBed } from '@angular/core/testing';

import {
  createJwt,
  createJwtPayload,
  installMemoryStorage,
  nowInSeconds,
  uninstallMemoryStorage,
} from '../testing/auth-test-utils';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let storage: Storage;
  let sessionStorage: Storage;

  beforeEach(() => {
    storage = installMemoryStorage();
    sessionStorage = globalThis.sessionStorage;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    uninstallMemoryStorage();
  });

  it('restores a user from a valid stored token', () => {
    storage.setItem(
      'badran_store_access_token',
      createJwt(
        createJwtPayload({
          sub: 'admin@example.com',
          userId: 1,
          role: 'admin',
        }),
      ),
    );

    const authService = TestBed.inject(AuthService);

    expect(authService.user()).toEqual({
      userId: 1,
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.hasRole('admin')).toBe(true);
  });

  it('clears an expired stored token during session restoration', () => {
    storage.setItem(
      'badran_store_access_token',
      createJwt(
        createJwtPayload({
          iat: nowInSeconds() - 7200,
          exp: nowInSeconds() - 3600,
        }),
      ),
    );

    const authService = TestBed.inject(AuthService);

    expect(authService.user()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(storage.getItem('badran_store_access_token')).toBeNull();
  });

  it('starts and clears a login session', () => {
    const authService = TestBed.inject(AuthService);

    const user = authService.startSession({
      token: createJwt(createJwtPayload()),
      refreshToken: 'refresh-token',
      email: 'customer@example.com',
      name: 'Customer User',
      role: 'customer',
    });

    expect(user).toEqual({
      userId: 2,
      email: 'customer@example.com',
      name: 'Customer User',
      role: 'customer',
    });
    expect(authService.hasValidSession()).toBe(true);
    expect(storage.getItem('badran_store_refresh_token')).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBe('refresh-token');

    authService.clearSession();

    expect(authService.user()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(storage.getItem('badran_store_access_token')).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBeNull();
  });

  it('uses JWT claims instead of mutable login response fields for authorization state', () => {
    const authService = TestBed.inject(AuthService);
    const token = createJwt(
      createJwtPayload({
        sub: 'claims@example.com',
        userId: 7,
        role: 'admin',
      }),
    );

    const user = authService.startSession({
      token,
      email: 'response@example.com',
      name: 'Response User',
      role: 'customer',
    });

    expect(user).toEqual({
      userId: 7,
      email: 'claims@example.com',
      name: 'Response User',
      role: 'admin',
    });
    expect(authService.hasRole('admin')).toBe(true);
  });

  it('does not persist malformed login tokens', () => {
    const authService = TestBed.inject(AuthService);

    expect(() =>
      authService.startSession({
        token: 'not-a-jwt',
        email: 'customer@example.com',
        name: 'Customer User',
        role: 'customer',
      }),
    ).toThrow('Login response did not include a valid backend JWT.');

    expect(authService.user()).toBeNull();
    expect(storage.getItem('badran_store_access_token')).toBeNull();
  });
});
