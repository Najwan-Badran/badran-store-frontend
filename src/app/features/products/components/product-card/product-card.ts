import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProductDto } from '../../../../core/models/product.models';
import { getPrimaryProductImageUrl } from '../../../../core/utils/product-image-url';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ProductImage } from '../../../../shared/components/product-image/product-image';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule, ProductImage, TranslatePipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<ProductDto>();
  readonly pending = input(false);
  readonly priority = input(false);
  readonly idSuffix = input('');
  readonly cartLabel = input<string | null>(null);
  readonly pendingLabel = input('Adding');
  readonly wishlistIcon = input('favorite');
  readonly wishlistAriaLabel = input<string | null>(null);
  readonly addToCart = output<ProductDto>();
  readonly addToWishlist = output<ProductDto>();

  protected readonly productTitleId = computed(() => {
    const suffix = this.idSuffix().trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
    return `product-title-${this.product().productId}${suffix ? `-${suffix}` : ''}`;
  });
  protected readonly primaryImage = computed(() => getPrimaryImage(this.product()));
  protected readonly discountPrice = computed(() => getDiscountPrice(this.product()));
  protected readonly hasDiscount = computed(() => {
    const discountPrice = this.discountPrice();

    return discountPrice !== null && discountPrice < Number(this.product().basePrice);
  });
  protected readonly discountPercent = computed(() => {
    const discountPrice = this.discountPrice();
    const basePrice = Number(this.product().basePrice);

    if (discountPrice === null || discountPrice >= basePrice || basePrice <= 0) {
      return null;
    }

    return Math.round(((basePrice - discountPrice) / basePrice) * 100);
  });
  protected readonly stockLabel = computed(() => getStockLabel(this.product()));
  protected readonly stockState = computed(() => getStockState(this.product()));
  protected readonly effectiveWishlistAriaLabel = computed(() => {
    return this.wishlistAriaLabel() ?? `Add ${this.product().nameEn} to wishlist`;
  });
}

function getPrimaryImage(product: ProductDto): string | null {
  return getPrimaryProductImageUrl(product);
}

function getDiscountPrice(product: ProductDto): number | null {
  const discountPrice = product.discountPrice ?? product.salePrice ?? null;

  if (discountPrice === null || !Number.isFinite(Number(discountPrice))) {
    return null;
  }

  return Number(discountPrice);
}

function getStockLabel(product: ProductDto): string {
  if (product.stockQuantity <= 0) {
    return 'Out of stock';
  }

  if (product.stockQuantity <= product.reorderThreshold) {
    return `${product.stockQuantity} left`;
  }

  return 'In stock';
}

function getStockState(product: ProductDto): 'available' | 'low' | 'out' {
  if (product.stockQuantity <= 0) {
    return 'out';
  }

  return product.stockQuantity <= product.reorderThreshold ? 'low' : 'available';
}
