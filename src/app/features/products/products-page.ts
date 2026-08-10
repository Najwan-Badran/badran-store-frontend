import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, distinctUntilChanged, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { PageResponse } from '../../core/models/page.model';
import { BrandDto, CategoryDto, ProductDto } from '../../core/models/product.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { WishlistApiService } from '../../core/services/wishlist-api.service';
import { ProductEmptyState } from './components/product-empty-state/product-empty-state';
import { ProductGrid } from './components/product-grid/product-grid';
import { ProductPagination } from './components/product-pagination/product-pagination';
import { ProductSkeletonLoader } from './components/product-skeleton-loader/product-skeleton-loader';
import { ProductToolbar } from './components/product-toolbar/product-toolbar';
import { LocalStorageService } from '../../core/services/local-storage.service';
import {
  DEFAULT_PRODUCT_LIST_STATE,
  ProductFilterPatch,
  ProductListState,
  ProductSortValue,
  parseProductListState,
  productListStatesEqual,
  toProductQuery,
  toQueryParams,
} from './product-list-state';

interface ProductLoadResult {
  readonly page: PageResponse<ProductDto> | null;
  readonly errorMessage: string | null;
}

@Component({
  selector: 'app-products-page',
  imports: [ProductEmptyState, ProductGrid, ProductPagination, ProductSkeletonLoader, ProductToolbar],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly wishlistApiService = inject(WishlistApiService);
  private readonly localStorageService = inject(LocalStorageService);

  protected readonly state = signal<ProductListState>(DEFAULT_PRODUCT_LIST_STATE);
  protected readonly page = signal<PageResponse<ProductDto> | null>(null);
  protected readonly categories = signal<readonly CategoryDto[]>([]);
  protected readonly brands = signal<readonly BrandDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly filterOptionsLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filterOptionsError = signal<string | null>(null);
  protected readonly pendingProductId = signal<number | null>(null);
  protected readonly products = computed(() => this.page()?.content ?? []);
  protected readonly totalPages = computed(() => this.page()?.totalPages ?? 0);
  protected readonly totalElements = computed(() => this.page()?.totalElements ?? 0);
  protected readonly currentPage = computed(() => this.page()?.number ?? this.state().page);
  protected readonly hasActiveFilters = computed(() => !productListStatesEqual(this.state(), DEFAULT_PRODUCT_LIST_STATE));
  protected readonly searchDraft = signal('');
  protected readonly recentSearches = signal<readonly string[]>(this.readRecentSearches());
  protected readonly searchSuggestions = computed(() => {
    const term = this.searchDraft().trim().toLowerCase();
    if (!term) {
      return [];
    }

    return this.products()
      .map((product) => product.nameEn)
      .filter((name, index, names) => name.toLowerCase().includes(term) && names.indexOf(name) === index)
      .slice(0, 5);
  });

  constructor() {
    this.loadFilterOptions();
    this.bindProductResults();
  }

  protected retryProducts(): void {
    this.loadProducts(this.state());
  }

  protected retryFilterOptions(): void {
    this.loadFilterOptions();
  }

  protected onSearchChanged(search: string): void {
    const normalized = search.trim();
    this.searchDraft.set(normalized);
    if (normalized) {
      this.recentSearches.update((recent) => {
        const next = [normalized, ...recent.filter((term) => term.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
        this.localStorageService.setItem('badran_store_recent_searches', JSON.stringify(next));
        return next;
      });
    }
    this.navigateToState({ search: normalized, page: 0 });
  }

  protected onSearchInput(search: string): void {
    this.searchDraft.set(search);
  }

  protected onSortChanged(sort: ProductSortValue): void {
    this.navigateToState({ sort, page: 0 });
  }

  protected onFiltersChanged(patch: ProductFilterPatch): void {
    this.navigateToState({ ...patch, page: 0 });
  }

  protected onPageChanged(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.navigateToState({ page });
  }

  protected clearFilters(): void {
    this.navigateToState(DEFAULT_PRODUCT_LIST_STATE);
  }

  protected addToCart(product: ProductDto): void {
    this.pendingProductId.set(product.productId);
    this.cartApiService
      .addItem({ productId: product.productId, quantity: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingProductId.set(null);
          this.snackBar.open(`${product.nameEn} added to cart`, 'Close', { duration: 2500 });
        },
        error: (error: unknown) => {
          this.pendingProductId.set(null);
          this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 });
        },
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingProductId.set(null);
          this.snackBar.open(`${product.nameEn} saved to wishlist`, 'Close', { duration: 2500 });
        },
        error: (error: unknown) => {
          this.pendingProductId.set(null);
          this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 });
        },
      });
  }

  private bindProductResults(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => normalizeState(parseProductListState(params))),
        distinctUntilChanged(productListStatesEqual),
        tap((state) => {
          this.state.set(state);
          this.searchDraft.set(state.search);
        }),
        switchMap((state) => this.loadProductsRequest(state)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyProductLoadResult(result));
  }

  private loadProducts(state: ProductListState): void {
    this.loadProductsRequest(state)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.applyProductLoadResult(result));
  }

  private loadProductsRequest(state: ProductListState) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.catalogApiService.getProducts(toProductQuery(state)).pipe(
      map((response): ProductLoadResult => ({ page: response.data, errorMessage: null })),
      catchError((error: unknown) =>
        of({
          page: null,
          errorMessage: this.apiErrorService.getErrorDetails(error).message,
        }),
      ),
    );
  }

  private applyProductLoadResult(result: ProductLoadResult): void {
    this.isLoading.set(false);

    if (result.errorMessage) {
      this.page.set(null);
      this.errorMessage.set(result.errorMessage);
      return;
    }

    this.errorMessage.set(null);
    this.page.set(result.page);

    if (result.page) {
      this.productCacheService.remember(result.page.content);
    }
  }

  private loadFilterOptions(): void {
    this.filterOptionsLoading.set(true);
    this.filterOptionsError.set(null);

    forkJoin({
      categories: this.catalogApiService.getCategories().pipe(map((response) => response.data.content)),
      brands: this.catalogApiService.getBrands().pipe(map((response) => response.data.content)),
    })
      .pipe(
        catchError((error: unknown) => {
          this.filterOptionsError.set(this.apiErrorService.getErrorDetails(error).message);
          return of({ categories: [] as readonly CategoryDto[], brands: [] as readonly BrandDto[] });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ categories, brands }) => {
        this.filterOptionsLoading.set(false);
        this.categories.set(categories);
        this.brands.set(brands);
      });
  }

  private navigateToState(patch: Partial<ProductListState>): void {
    const nextState = normalizeState({ ...this.state(), ...patch });

    if (productListStatesEqual(nextState, this.state())) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(nextState),
    });
  }

  private readRecentSearches(): readonly string[] {
    try {
      const stored = JSON.parse(this.localStorageService.getItem('badran_store_recent_searches') ?? '[]');
      return Array.isArray(stored) ? stored.filter((term): term is string => typeof term === 'string').slice(0, 5) : [];
    } catch {
      return [];
    }
  }
}

function normalizeState(state: ProductListState): ProductListState {
  return {
    ...state,
    page: Math.max(0, Math.floor(state.page)),
    size: Math.max(1, Math.floor(state.size)),
    search: state.search.trim(),
  };
}
