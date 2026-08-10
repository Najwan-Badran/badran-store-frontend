import { ProductDto } from './product.models';

export interface WishlistDto {
  readonly wishlistId: number;
  readonly userId: number;
  readonly product: ProductDto;
  readonly addedAt: string;
}
