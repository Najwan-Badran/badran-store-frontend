import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, forkJoin, map } from 'rxjs';
import { BrandDto, CategoryDto, ProductDto } from '../../core/models/product.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { WishlistApiService } from '../../core/services/wishlist-api.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProductImage } from '../../shared/components/product-image/product-image';
import { CategoryCircle } from '../../shared/components/category-circle/category-circle';
import { ProductCard } from '../products/components/product-card/product-card';
import { resolveBrandLogoUrl } from '../../core/utils/brand-logo-url';

@Component({
  selector: 'app-home-page',
  imports: [CategoryCircle, ProductCard, ProductImage, RouterLink, TranslatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly uiPreferences = inject(UiPreferencesService);
  private readonly wishlistApiService = inject(WishlistApiService);

  protected readonly products = signal<readonly ProductDto[]>([]);
  protected readonly categories = signal<readonly CategoryDto[]>([]);
  protected readonly brands = signal<readonly BrandDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pendingProductId = signal<number | null>(null);
  protected readonly failedBrandLogoUrls = signal<ReadonlySet<string>>(new Set());
  protected readonly currentHeroSlide = signal(0);
  protected readonly heroTrackTransform = computed(() => {
    const offset = this.currentHeroSlide() * 100;
    return `translateX(${this.uiPreferences.direction() === 'rtl' ? offset : -offset}%)`;
  });
  protected readonly homeCategories = computed(() => this.categories().slice(0, 10));
  protected readonly featuredProducts = computed(() => this.products().slice(0, 8));
  protected readonly popularBrands = computed(() => this.brands().slice(0, 6));

  constructor() {
    this.loadFeaturedProducts();
  }

  protected showPreviousHeroSlide(): void {
    this.currentHeroSlide.update((slide) => (slide === 0 ? 2 : slide - 1));
  }

  protected showNextHeroSlide(): void {
    this.currentHeroSlide.update((slide) => (slide === 2 ? 0 : slide + 1));
  }

  protected selectHeroSlide(slide: number): void {
    this.currentHeroSlide.set(slide);
  }

  protected loadFeaturedProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      products: this.catalogApiService
        .getFeaturedProducts({
          page: 0,
          size: 8,
          sortBy: 'productId',
          sortDir: 'asc',
        })
        .pipe(map((response) => response.data.content)),
      categories: this.catalogApiService.getCategories().pipe(map((response) => response.data.content)),
      brands: this.catalogApiService.getBrands().pipe(map((response) => response.data.content)),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ products, categories, brands }) => {
          this.productCacheService.remember(products);
          this.products.set(products);
          this.categories.set(categories);
          this.brands.set(brands);
        },
        error: (error: unknown) => this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }

  protected addToCart(product: ProductDto): void {
    this.pendingProductId.set(product.productId);
    this.cartApiService
      .addItem({ productId: product.productId, quantity: 1 })
      .pipe(
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackBar.open(`${product.nameEn} added to cart`, 'Close', { duration: 2500 }),
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  protected addToWishlist(product: ProductDto): void {
    if (!this.authService.hasValidSession()) {
      this.snackBar.open('Sign in to save products to your wishlist.', 'Close', { duration: 3000 });
      return;
    }

    this.pendingProductId.set(product.productId);
    this.wishlistApiService
      .add(product.productId)
      .pipe(
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackBar.open(`${product.nameEn} saved to wishlist`, 'Close', { duration: 2500 }),
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  protected brandLogoUrl(brand: BrandDto): string | null {
    const logoUrl = resolveBrandLogoUrl(brand.logoUrl);

    return logoUrl && !this.failedBrandLogoUrls().has(logoUrl) ? logoUrl : null;
  }

  protected markBrandLogoFailed(url: string | null): void {
    if (!url) {
      return;
    }

    this.failedBrandLogoUrls.update((failedUrls) => new Set(failedUrls).add(url));
  }
}
