import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { AddToCartRequest, CartDto } from '../models/cart.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class CartApiService extends BaseApiService {
  getCart(): Observable<ApiResponse<CartDto>> {
    return this.get<ApiResponse<CartDto>>('v1/cart');
  }

  addItem(request: AddToCartRequest): Observable<ApiResponse<CartDto>> {
    return this.post<ApiResponse<CartDto>, AddToCartRequest>('v1/cart/items', request);
  }

  removeItem(productId: number): Observable<ApiResponse<CartDto>> {
    return this.delete<ApiResponse<CartDto>>(`v1/cart/items/${productId}`);
  }

  clearCart(): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>('v1/cart');
  }
}
