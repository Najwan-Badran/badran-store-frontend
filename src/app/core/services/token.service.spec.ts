import { TestBed } from '@angular/core/testing';

import {
  createJwt,
  createJwtPayload,
  installMemoryStorage,
  nowInSeconds,
  uninstallMemoryStorage,
} from '../testing/auth-test-utils';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let storage: Storage;
  let sessionStorage: Storage;
  let tokenService: TokenService;

  beforeEach(() => {
    storage = installMemoryStorage();
    sessionStorage = globalThis.sessionStorage;
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    uninstallMemoryStorage();
  });

  it('stores and clears the access token', () => {
    tokenService.setAccessToken('token');

    expect(tokenService.getAccessToken()).toBe('token');
    expect(storage.getItem('badran_store_access_token')).toBe('token');

    tokenService.clearAccessToken();

    expect(tokenService.getAccessToken()).toBeNull();
  });

  it('stores and clears the refresh token in session storage', () => {
    tokenService.setRefreshToken('refresh-token');

    expect(tokenService.getRefreshToken()).toBe('refresh-token');
    expect(storage.getItem('badran_store_refresh_token')).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBe('refresh-token');

    tokenService.clearRefreshToken();

    expect(tokenService.getRefreshToken()).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBeNull();
  });

  it('clears access and refresh tokens from their storage locations', () => {
    tokenService.setAccessToken('access-token');
    tokenService.setRefreshToken('refresh-token');

    tokenService.clearTokens();

    expect(storage.getItem('badran_store_access_token')).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBeNull();
  });

  it('decodes a valid backend JWT payload', () => {
    const payload = createJwtPayload({
      sub: 'admin@example.com',
      userId: 1,
      role: 'admin',
    });

    expect(tokenService.getPayload(createJwt(payload))).toEqual(payload);
  });

  it('returns null for malformed or incomplete tokens', () => {
    expect(tokenService.getPayload('not-a-jwt')).toBeNull();
    expect(tokenService.getPayload('header.invalid-base64.signature')).toBeNull();
    expect(tokenService.getPayload(createJwt({ sub: 'missing-fields@example.com' }))).toBeNull();
  });

  it('treats missing, malformed, and expired tokens as expired', () => {
    expect(tokenService.isAccessTokenExpired(null)).toBe(true);
    expect(tokenService.isAccessTokenExpired('not-a-jwt')).toBe(true);
    expect(
      tokenService.isAccessTokenExpired(
        createJwt(
          createJwtPayload({
            iat: nowInSeconds() - 7200,
            exp: nowInSeconds() - 3600,
          }),
        ),
      ),
    ).toBe(true);
  });

  it('does not treat a future-expiring token as expired', () => {
    expect(tokenService.isAccessTokenExpired(createJwt(createJwtPayload()))).toBe(false);
  });
});
