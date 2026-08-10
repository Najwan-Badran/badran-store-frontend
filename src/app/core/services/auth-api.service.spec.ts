import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig({ baseUrl: 'https://api.example.test/api' }),
      ],
    });

    service = TestBed.inject(AuthApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('uses real refresh, logout, logout-all, and verify-email endpoints', () => {
    service.refresh({ refreshToken: 'refresh-token' }).subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/api/v1/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });
    request.flush({ success: true, message: 'OK', data: null });

    service.logout({ refreshToken: 'refresh-token' }).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });
    request.flush({ success: true, message: 'OK', data: null });

    service.logoutAll().subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/auth/logout-all');
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, message: 'OK', data: null });

    service.verifyEmail('abc-token').subscribe();
    request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/auth/verify-email' &&
        candidate.params.get('token') === 'abc-token',
    );
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, message: 'OK', data: null });
  });
});
