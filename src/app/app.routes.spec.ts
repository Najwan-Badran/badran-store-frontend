import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideApiConfig } from './core/config/api.config';
import {
  createJwt,
  createJwtPayload,
  installMemoryStorage,
  uninstallMemoryStorage,
} from './core/testing/auth-test-utils';
import { routes } from './app.routes';

describe('app routes', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = installMemoryStorage();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideApiConfig({
          baseUrl: '/api',
        }),
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    uninstallMemoryStorage();
  });

  it('renders public lazy routes', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/home');
    expect(harness.routeNativeElement?.textContent).toContain('Home');

    await harness.navigateByUrl('/products');
    expect(harness.routeNativeElement?.textContent).toContain('Products');
  });

  it('redirects protected customer routes to login when unauthenticated', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/cart');

    expect(router.url).toBe('/login?returnUrl=%2Fcart');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in');
  });

  it('renders protected customer routes with a valid customer token', async () => {
    storage.setItem(
      'badran_store_access_token',
      createJwt(
        createJwtPayload({
          role: 'customer',
        }),
      ),
    );
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/cart');

    expect(TestBed.inject(Router).url).toBe('/cart');
    expect(harness.routeNativeElement?.textContent).toContain('Cart');
  });

  it('renders the admin route only for a valid admin token', async () => {
    storage.setItem(
      'badran_store_access_token',
      createJwt(
        createJwtPayload({
          role: 'admin',
        }),
      ),
    );
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/admin');

    expect(TestBed.inject(Router).url).toBe('/admin');
    expect(harness.routeNativeElement?.textContent).toContain('Admin');
  });
});
