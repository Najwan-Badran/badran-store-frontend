import { ProductDto } from './product.models';

export interface CartDto {
  readonly cartId: number;
  readonly userId: number | null;
  readonly sessionId: string | null;
  readonly items: readonly CartItemDto[];
}

export interface CartItemDto {
  readonly cartItemId: number;
  readonly productId: number;
  readonly quantity: number;
}

export interface AddToCartRequest {
  readonly productId: number;
  readonly quantity: number;
}

export interface CartLine {
  readonly cartItemId: number;
  readonly productId: number;
  readonly quantity: number;
  readonly product: ProductDto | null;
  readonly lineTotal: number;
}

export interface CartSummary {
  readonly subtotal: number;
  readonly shippingCost: number;
  readonly tax: number;
  readonly total: number;
  readonly itemCount: number;
}
