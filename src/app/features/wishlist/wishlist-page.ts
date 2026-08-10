import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, switchMap } from 'rxjs';

import { WishlistDto } from '../../core/models/wishlist.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { WishlistApiService } from '../../core/services/wishlist-api.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProductCard } from '../products/components/product-card/product-card';

@Component({
  selector: 'app-wishlist-page',
  imports: [ProductCard, RouterLink, TranslatePipe],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly cartApiService = inject(CartApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly wishlistApiService = inject(WishlistApiService);

  protected readonly items = signal<readonly WishlistDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pendingProductId = signal<number | null>(null);

  constructor() {
    this.loadWishlist();
  }

  protected loadWishlist(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.wishlistApiService
      .getWishlist()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.productCacheService.remember(response.data.map((item) => item.product));
          this.items.set(response.data);
        },
        error: (error: unknown) => this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }

  protected remove(productId: number): void {
    const previousItems = this.items();
    this.items.update((items) => items.filter((item) => item.product.productId !== productId));
    this.pendingProductId.set(productId);

    this.wishlistApiService
      .remove(productId)
      .pipe(
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackBar.open('Removed from wishlist', 'Close', { duration: 2200 }),
        error: (error: unknown) => {
          this.items.set(previousItems);
          this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 });
        },
      });
  }

  protected moveToCart(productId: number): void {
    this.pendingProductId.set(productId);
    this.cartApiService
      .addItem({ productId, quantity: 1 })
      .pipe(
        switchMap(() => this.wishlistApiService.remove(productId)),
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.items.update((items) => items.filter((item) => item.product.productId !== productId));
          this.snackBar.open('Moved to cart', 'Close', { duration: 2500 });
        },
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }
}
