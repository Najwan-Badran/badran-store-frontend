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
  let tokenService: TokenService;

  beforeEach(() => {
    storage = installMemoryStorage();
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
