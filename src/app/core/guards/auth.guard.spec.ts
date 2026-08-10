import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { adminGuard, anonymousGuard, authChildGuard, authGuard } from './auth.guard';

describe('auth guards', () => {
  let authService: Pick<AuthService, 'hasRole' | 'hasValidSession'>;
  let router: Router;

  beforeEach(() => {
    authService = {
      hasRole: vi.fn(),
      hasValidSession: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    router = TestBed.inject(Router);
  });

  it('allows authenticated users through authGuard', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(routeSnapshot(), routeState('/cart')),
    );

    expect(result).toBe(true);
  });

  it('redirects unauthenticated users to login with returnUrl', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(routeSnapshot(), routeState('/cart')),
    );

    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fcart');
  });

  it('uses the same redirect behavior for child routes', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authChildGuard(routeSnapshot(), routeState('/wishlist')),
    );

    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fwishlist');
  });

  it('redirects authenticated users away from anonymous routes', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      anonymousGuard(routeSnapshot(), routeState('/login')),
    );

    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('allows admin users through adminGuard', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(true);
    vi.mocked(authService.hasRole).mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(routeSnapshot(), routeState('/admin')),
    );

    expect(result).toBe(true);
  });

  it('redirects authenticated non-admin users away from admin routes', () => {
    vi.mocked(authService.hasValidSession).mockReturnValue(true);
    vi.mocked(authService.hasRole).mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(routeSnapshot(), routeState('/admin')),
    );

    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });
});

function routeSnapshot(): ActivatedRouteSnapshot {
  return {} as ActivatedRouteSnapshot;
}

function routeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}
