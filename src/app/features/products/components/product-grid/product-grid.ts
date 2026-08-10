import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ProductDto } from '../../../../core/models/product.models';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-grid',
  imports: [ProductCard],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGrid {
  readonly products = input.required<readonly ProductDto[]>();
  readonly pendingProductId = input<number | null>(null);
  readonly addToCart = output<ProductDto>();
  readonly addToWishlist = output<ProductDto>();
}
