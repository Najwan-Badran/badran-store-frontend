import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import {
  PaymentProviderDto,
  PaymentProviderRequest,
  PaymentStatusSyncRequest,
  RefundRequest,
} from '../models/payment.models';
import { PaymentDto } from '../models/order.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentApiService extends BaseApiService {
  createStripeCheckoutSession(request: PaymentProviderRequest): Observable<ApiResponse<PaymentProviderDto>> {
    return this.post<ApiResponse<PaymentProviderDto>, PaymentProviderRequest>('v1/payments/stripe/checkout-sessions', request);
  }

  createStripePaymentIntent(request: PaymentProviderRequest): Observable<ApiResponse<PaymentProviderDto>> {
    return this.post<ApiResponse<PaymentProviderDto>, PaymentProviderRequest>('v1/payments/stripe/payment-intents', request);
  }

  syncStripeSuccess(request: PaymentStatusSyncRequest): Observable<ApiResponse<PaymentDto>> {
    return this.post<ApiResponse<PaymentDto>, PaymentStatusSyncRequest>('v1/payments/stripe/success', request);
  }

  syncStripeFailure(request: PaymentStatusSyncRequest): Observable<ApiResponse<PaymentDto>> {
    return this.post<ApiResponse<PaymentDto>, PaymentStatusSyncRequest>('v1/payments/stripe/failure', request);
  }

  createPayPalPayment(request: PaymentProviderRequest): Observable<ApiResponse<PaymentProviderDto>> {
    return this.post<ApiResponse<PaymentProviderDto>, PaymentProviderRequest>('v1/payments/paypal/payments', request);
  }

  capturePayPalPayment(request: PaymentStatusSyncRequest): Observable<ApiResponse<PaymentDto>> {
    return this.post<ApiResponse<PaymentDto>, PaymentStatusSyncRequest>('v1/payments/paypal/capture', request);
  }

  refundStripePayment(request: RefundRequest): Observable<ApiResponse<PaymentDto>> {
    return this.post<ApiResponse<PaymentDto>, RefundRequest>('v1/payments/stripe/refunds', request);
  }
}
