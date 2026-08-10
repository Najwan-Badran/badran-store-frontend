import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { CouponValidationRequest, CouponValidationResponse } from '../models/coupon.models';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class CouponApiService extends BaseApiService {
  validateCoupon(request: CouponValidationRequest): Observable<ApiResponse<CouponValidationResponse>> {
    return this.post<ApiResponse<CouponValidationResponse>, CouponValidationRequest>('v1/coupons/validate', request);
  }
}
