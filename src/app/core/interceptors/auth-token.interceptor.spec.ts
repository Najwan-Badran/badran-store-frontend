import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideApiConfig } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import {
  createJwt,
  createJwtPayload,
  installMemoryStorage,
  nowInSeconds,
  uninstallMemoryStorage,
} from '../testing/auth-test-utils';
import { SKIP_AUTH_TOKEN, authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let storage: Storage;
  let sessionStorage: Storage;
  let authService: AuthService;
  let tokenService: TokenService;

  beforeEach(() => {
    storage = installMemoryStorage();
    sessionStorage = globalThis.sessionStorage;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        provideApiConfig({
          baseUrl: 'https://api.example.test/api',
        }),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
    uninstallMemoryStorage();
  });

  it('adds the bearer token to configured API requests', () => {
    const token = createJwt(createJwtPayload());
    tokenService.setAccessToken(token);

    http.get('https://api.example.test/api/products').subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/products');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush({});
  });

  it('adds the authenticated user id header to configured API requests', () => {
    const token = createJwt(
      createJwtPayload({
        userId: 42,
      }),
    );
    tokenService.setAccessToken(token);

    http.get('https://api.example.test/api/v1/products').subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/products');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(request.request.headers.get('X-User-Id')).toBe('42');
    request.flush({});
  });

  it('adds an anonymous session header to cart requests without a token', () => {
    http.get('https://api.example.test/api/v1/cart').subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/cart');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.headers.get('X-Session-Id')).toBeTruthy();
    request.flush({});
  });

  it('does not override an existing authorization header', () => {
    const token = createJwt(createJwtPayload());
    tokenService.setAccessToken(token);

    http
      .get('https://api.example.test/api/products', {
        headers: {
          Authorization: 'Bearer explicit-token',
        },
      })
      .subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/products');
    expect(request.request.headers.get('Authorization')).toBe('Bearer explicit-token');
    request.flush({});
  });

  it('skips requests marked with SKIP_AUTH_TOKEN', () => {
    tokenService.setAccessToken(createJwt(createJwtPayload()));

    http
      .post(
        'https://api.example.test/api/v1/auth/login',
        {},
        {
          context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
        },
      )
      .subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('skips non-API requests', () => {
    tokenService.setAccessToken(createJwt(createJwtPayload()));

    http.get('https://cdn.example.test/assets/config.json').subscribe();

    const request = httpTestingController.expectOne('https://cdn.example.test/assets/config.json');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not attach credentials to lookalike API origins or paths', () => {
    tokenService.setAccessToken(createJwt(createJwtPayload()));

    http.get('https://api.example.test/apiary/products').subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/apiary/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});

    http.get('/apiary/products').subscribe();
    request = httpTestingController.expectOne('/apiary/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('clears expired tokens and sends the request without authorization', () => {
    tokenService.setAccessToken(
      createJwt(
        createJwtPayload({
          iat: nowInSeconds() - 7200,
          exp: nowInSeconds() - 3600,
        }),
      ),
    );

    http.get('https://api.example.test/api/products').subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(storage.getItem('badran_store_access_token')).toBeNull();
    request.flush({});
  });

  it('refreshes an expired token and retries the original request with the new authorization header', () => {
    const refreshedToken = createJwt(
      createJwtPayload({
        userId: 42,
      }),
    );
    tokenService.setAccessToken(
      createJwt(
        createJwtPayload({
          iat: nowInSeconds() - 7200,
          exp: nowInSeconds() - 3600,
        }),
      ),
    );
    tokenService.setRefreshToken('valid-refresh-token');
    vi.spyOn(authService, 'refreshSession').mockImplementation(() => {
      tokenService.setAccessToken(refreshedToken);

      return of({
        userId: 42,
        email: 'customer@example.com',
        name: 'Customer User',
        role: 'customer',
      });
    });

    http.get('https://api.example.test/api/products').subscribe();

    expect(authService.refreshSession).toHaveBeenCalledTimes(1);
    const request = httpTestingController.expectOne('https://api.example.test/api/products');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    expect(request.request.headers.get('X-User-Id')).toBe('42');
    request.flush({});
  });

  it('clears the session when refreshing an expired token fails and sends a session-scoped request anonymously', () => {
    tokenService.setAccessToken(
      createJwt(
        createJwtPayload({
          iat: nowInSeconds() - 7200,
          exp: nowInSeconds() - 3600,
        }),
      ),
    );
    tokenService.setRefreshToken('valid-refresh-token');
    vi.spyOn(authService, 'refreshSession').mockReturnValue(
      throwError(() => new Error('Unable to refresh session.')),
    );
    vi.spyOn(authService, 'clearSession');

    http.get('https://api.example.test/api/v1/cart').subscribe();

    expect(authService.refreshSession).toHaveBeenCalledTimes(1);
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
    expect(storage.getItem('badran_store_access_token')).toBeNull();
    expect(sessionStorage.getItem('badran_store_refresh_token')).toBeNull();
    const request = httpTestingController.expectOne('https://api.example.test/api/v1/cart');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.headers.get('X-Session-Id')).toBeTruthy();
    request.flush({});
  });

  it('clears stale authenticated state when the stored token expires before an API request', () => {
    authService.startSession({
      token: createJwt(createJwtPayload()),
      email: 'customer@example.com',
      name: 'Customer User',
      role: 'customer',
    });
    tokenService.setAccessToken(
      createJwt(
        createJwtPayload({
          iat: nowInSeconds() - 7200,
          exp: nowInSeconds() - 3600,
        }),
      ),
    );

    http.get('https://api.example.test/api/products').subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(authService.user()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(storage.getItem('badran_store_access_token')).toBeNull();
    request.flush({});
  });
});
