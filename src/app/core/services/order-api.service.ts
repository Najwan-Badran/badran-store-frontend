import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { CreateOrderRequest, OrderDto, PaymentDto } from '../models/order.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class OrderApiService extends BaseApiService {
  createOrder(request: CreateOrderRequest): Observable<ApiResponse<OrderDto>> {
    return this.post<ApiResponse<OrderDto>, CreateOrderRequest>('v1/orders', request);
  }

  getOrders(): Observable<ApiResponse<readonly OrderDto[]>> {
    return this.get<ApiResponse<readonly OrderDto[]>>('v1/orders');
  }

  getOrder(orderId: number): Observable<ApiResponse<OrderDto>> {
    return this.get<ApiResponse<OrderDto>>(`v1/orders/${orderId}`);
  }

  pay(orderId: number, paymentMethod: CreateOrderRequest['paymentMethod']): Observable<ApiResponse<PaymentDto>> {
    return this.post<ApiResponse<PaymentDto>, null>(`v1/orders/${orderId}/payment`, null, {
      params: {
        paymentMethod,
      },
    });
  }

  cancelOrder(orderId: number): Observable<ApiResponse<OrderDto>> {
    return this.post<ApiResponse<OrderDto>, null>(`v1/orders/${orderId}/cancel`, null);
  }
}
