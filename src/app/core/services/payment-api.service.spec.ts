import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { PaymentApiService } from './payment-api.service';

describe('PaymentApiService', () => {
  let service: PaymentApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig({ baseUrl: 'https://api.example.test/api' }),
      ],
    });

    service = TestBed.inject(PaymentApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('synchronizes Stripe success, failure, and refund requests', () => {
    service.syncStripeSuccess({ orderId: 7, providerPaymentId: 'cs_test' }).subscribe();
    let request = httpTestingController.expectOne('https://api.example.test/api/v1/payments/stripe/success');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ orderId: 7, providerPaymentId: 'cs_test' });
    request.flush({ success: true, message: 'OK', data: null });

    service.syncStripeFailure({ orderId: 7, providerPaymentId: 'cs_test', failureReason: 'cancelled' }).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/payments/stripe/failure');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ orderId: 7, providerPaymentId: 'cs_test', failureReason: 'cancelled' });
    request.flush({ success: true, message: 'OK', data: null });

    service.refundStripePayment({ orderId: 7, amount: 12.5 }).subscribe();
    request = httpTestingController.expectOne('https://api.example.test/api/v1/payments/stripe/refunds');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ orderId: 7, amount: 12.5 });
    request.flush({ success: true, message: 'OK', data: null });
  });
});
