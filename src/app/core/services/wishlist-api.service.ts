import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { WishlistDto } from '../models/wishlist.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class WishlistApiService extends BaseApiService {
  getWishlist(): Observable<ApiResponse<readonly WishlistDto[]>> {
    return this.get<ApiResponse<readonly WishlistDto[]>>('v1/wishlist');
  }

  add(productId: number): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>, null>(`v1/wishlist/${productId}`, null);
  }

  remove(productId: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`v1/wishlist/${productId}`);
  }
}
