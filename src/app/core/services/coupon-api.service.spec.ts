import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { CouponApiService } from './coupon-api.service';

describe('CouponApiService', () => {
  let service: CouponApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig({ baseUrl: 'https://api.example.test/api' }),
      ],
    });

    service = TestBed.inject(CouponApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('validates coupons against the storefront backend endpoint', () => {
    const body = { code: 'SAVE10', subtotal: 100, productIds: [1], categoryIds: [2] };

    service.validateCoupon(body).subscribe();

    const request = httpTestingController.expectOne('https://api.example.test/api/v1/coupons/validate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ success: true, message: 'OK', data: { valid: true, discountAmount: 10, message: 'Applied' } });
  });
});
