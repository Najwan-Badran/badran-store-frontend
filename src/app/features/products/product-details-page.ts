import { CurrencyPipe, DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, forkJoin, map } from 'rxjs';

import { AddReviewRequest, ProductDto, ReviewDto } from '../../core/models/product.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { getProductGalleryImageUrls } from '../../core/utils/product-image-url';
import { WishlistApiService } from '../../core/services/wishlist-api.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProductImage } from '../../shared/components/product-image/product-image';

@Component({
  selector: 'app-product-details-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, KeyValuePipe, ProductImage, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './product-details-page.html',
  styleUrl: './product-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly wishlistApiService = inject(WishlistApiService);

  protected readonly reviewForm = this.formBuilder.group({
    orderId: [0, [Validators.required, Validators.min(1)]],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.maxLength(5000)]],
  });
  protected readonly product = signal<ProductDto | null>(null);
  protected readonly reviews = signal<readonly ReviewDto[]>([]);
  protected readonly quantity = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly isSavingReview = signal(false);
  protected readonly reviewsLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly reviewErrorMessage = signal<string | null>(null);
  protected readonly reviewSuccessMessage = signal<string | null>(null);
  protected readonly canReview = this.authService.isAuthenticated;
  protected readonly selectedImageIndex = signal(0);
  protected readonly isImageZoomed = signal(false);
  protected readonly galleryImages = computed(() => {
    const product = this.product();

    return product ? getProductGalleryImageUrls(product) : [];
  });
  protected readonly primaryImage = computed(() => {
    return this.galleryImages()[this.selectedImageIndex()] ?? this.galleryImages()[0] ?? null;
  });
  protected readonly specifications = computed(() => this.product()?.specifications ?? {});
  protected readonly canAddToCart = computed(() => {
    const product = this.product();

    return Boolean(product && product.stockQuantity > 0 && this.quantity() <= product.stockQuantity && !this.isSubmitting());
  });

  constructor() {
    this.loadProduct();
  }

  protected loadProduct(): void {
    const productId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(productId) || productId <= 0) {
      this.errorMessage.set('The requested product route is invalid.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      product: this.productCacheService.getProduct(productId).pipe(map((response) => response.data)),
      reviews: this.catalogApiService.getProductReviews(productId).pipe(map((response) => response.data)),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ product, reviews }) => {
          this.product.set(product);
          this.selectedImageIndex.set(0);
          this.isImageZoomed.set(false);
          this.reviews.set(reviews);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message);
        },
      });
  }

  protected selectImage(index: number): void {
    this.selectedImageIndex.set(index);
    this.isImageZoomed.set(false);
  }

  protected setImageZoomed(zoomed: boolean): void {
    this.isImageZoomed.set(zoomed);
  }

  protected setQuantity(value: string | number): void {
    const stockQuantity = this.product()?.stockQuantity ?? Number.POSITIVE_INFINITY;
    const quantity = Math.min(stockQuantity, Math.max(1, Math.floor(Number(value) || 1)));
    this.quantity.set(quantity);
  }

  protected addToCart(): void {
    const product = this.product();

    if (!product) {
      return;
    }

    this.isSubmitting.set(true);
    this.cartApiService
      .addItem({ productId: product.productId, quantity: this.quantity() })
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackBar.open(`${product.nameEn} added to cart`, 'Close', { duration: 2500 }),
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  protected addToWishlist(): void {
    const product = this.product();

    if (!product) {
      return;
    }

    if (!this.authService.hasValidSession()) {
      this.snackBar.open('Sign in to save products to your wishlist.', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    this.wishlistApiService
      .add(product.productId)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackBar.open(`${product.nameEn} saved to wishlist`, 'Close', { duration: 2500 }),
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  protected refreshReviews(): void {
    const product = this.product();

    if (!product) {
      return;
    }

    this.reviewsLoading.set(true);
    this.reviewErrorMessage.set(null);
    this.catalogApiService
      .getProductReviews(product.productId)
      .pipe(
        finalize(() => this.reviewsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.reviews.set(response.data),
        error: (error: unknown) => this.reviewErrorMessage.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }

  protected submitReview(): void {
    const product = this.product();

    this.reviewErrorMessage.set(null);
    this.reviewSuccessMessage.set(null);

    if (!product) {
      return;
    }

    if (!this.authService.hasValidSession()) {
      this.reviewErrorMessage.set('Sign in before adding a review.');
      return;
    }

    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isSavingReview.set(true);
    this.catalogApiService
      .addReview(product.productId, this.toReviewRequest())
      .pipe(
        finalize(() => this.isSavingReview.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.reviewSuccessMessage.set('Review submitted.');
          this.reviewForm.reset({ orderId: 0, rating: 5, comment: '' });
          this.refreshReviews();
        },
        error: (error: unknown) => {
          const details = this.apiErrorService.getErrorDetails(error);
          this.applyReviewFieldErrors(details.fieldErrors);
          this.reviewErrorMessage.set(details.message);
        },
      });
  }

  protected getReviewError(controlName: keyof typeof this.reviewForm.controls): string {
    const control = this.reviewForm.controls[controlName];

    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('min')) return controlName === 'rating' ? 'Rating must be at least 1.' : 'Order ID must be greater than zero.';
    if (control.hasError('max')) return 'Rating cannot exceed 5.';
    if (control.hasError('maxlength')) return 'Comment must not exceed 5000 characters.';
    if (control.hasError('backend')) return String(control.getError('backend'));

    return '';
  }

  private toReviewRequest(): AddReviewRequest {
    const formValue = this.reviewForm.getRawValue();

    return {
      orderId: Number(formValue.orderId),
      rating: Number(formValue.rating),
      comment: formValue.comment.trim() || undefined,
    };
  }

  private applyReviewFieldErrors(fieldErrors: Readonly<Record<string, string>>): void {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === 'orderId' || field === 'rating' || field === 'comment') {
        this.reviewForm.controls[field].setErrors({
          ...this.reviewForm.controls[field].errors,
          backend: message,
        });
        this.reviewForm.controls[field].markAsTouched();
      }
    }
  }
}
