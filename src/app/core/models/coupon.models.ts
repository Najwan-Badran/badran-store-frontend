export interface CouponValidationRequest {
  readonly code: string;
  readonly subtotal: number;
  readonly productIds?: readonly number[];
  readonly categoryIds?: readonly number[];
}

export interface CouponValidationResponse {
  readonly valid: boolean;
  readonly discountAmount: number;
  readonly message: string;
}
