import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Observable, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { CartDto, CartLine } from '../../core/models/cart.models';
import { CreateOrderRequest } from '../../core/models/order.models';
import { PaymentProviderDto } from '../../core/models/payment.models';
import { ProductDto } from '../../core/models/product.models';
import { AddressDto } from '../../core/models/user.models';
import { getPrimaryProductImageUrl } from '../../core/utils/product-image-url';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CouponApiService } from '../../core/services/coupon-api.service';
import { OrderApiService } from '../../core/services/order-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { ProductImage } from '../../shared/components/product-image/product-image';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type CouponState = 'idle' | 'loading' | 'invalid' | 'success';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, FormsModule, ProductImage, RouterLink, TranslatePipe],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly cartApiService = inject(CartApiService);
  private readonly couponApiService = inject(CouponApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly orderApiService = inject(OrderApiService);
  private readonly paymentApiService = inject(PaymentApiService);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly cart = signal<CartDto | null>(null);
  protected readonly addresses = signal<readonly AddressDto[]>([]);
  protected readonly productsById = signal<ReadonlyMap<number, ProductDto>>(new Map());
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pendingProductId = signal<number | null>(null);
  protected readonly isCheckingOut = signal(false);
  protected readonly fulfillmentMethod = signal<CreateOrderRequest['fulfillmentMethod']>('home_delivery');
  protected readonly paymentMethod = signal<CreateOrderRequest['paymentMethod']>('cod');
  protected readonly deliveryCity = signal('');
  protected readonly deliveryZone = signal('');
  protected readonly deliveryAddressLine = signal('');
  protected readonly couponCode = signal('');
  protected readonly couponMessage = signal<string | null>(null);
  protected readonly couponState = signal<CouponState>('idle');
  protected readonly couponDiscount = signal(0);
  protected readonly selectedAddressId = signal<number | null>(null);
  protected readonly deliveryAttempted = signal(false);
  protected readonly freeShippingThreshold = 200;

  protected readonly lines = computed<readonly CartLine[]>(() =>
    (this.cart()?.items ?? []).map((item) => {
      const product = this.productsById().get(item.productId) ?? null;
      return {
        cartItemId: item.cartItemId,
        productId: item.productId,
        quantity: item.quantity,
        product,
        lineTotal: product ? Number(product.basePrice) * item.quantity : 0,
      };
    }),
  );
  protected readonly summary = computed(() => {
    const subtotal = this.lines().reduce((total, line) => total + line.lineTotal, 0);
    const shippingCost = this.fulfillmentMethod() === 'home_delivery' && subtotal > 0 ? 10 : 0;
    const discount = Math.min(this.couponDiscount(), subtotal);
    const tax = 0;

    return {
      subtotal,
      shippingCost,
      discount,
      tax,
      total: subtotal + shippingCost + tax - discount,
      itemCount: this.lines().reduce((total, line) => total + line.quantity, 0),
    };
  });
  protected readonly requiresDeliveryAddress = computed(() => this.fulfillmentMethod() === 'home_delivery');
  protected readonly hasDeliveryAddress = computed(() => {
    if (!this.requiresDeliveryAddress()) {
      return true;
    }

    if (this.selectedAddressId() !== null) {
      return true;
    }

    return Boolean(
      this.deliveryCity().trim() &&
        this.deliveryZone().trim() &&
        this.deliveryAddressLine().trim(),
    );
  });
  protected readonly checkoutDisabled = computed(
    () => this.isCheckingOut() || !this.lines().length || !this.hasDeliveryAddress(),
  );
  protected readonly shippingRemaining = computed(() => Math.max(0, this.freeShippingThreshold - this.summary().subtotal));
  protected readonly shippingProgress = computed(() => Math.min(100, (this.summary().subtotal / this.freeShippingThreshold) * 100));
  protected readonly checkoutStep = computed(() => (this.isCheckingOut() ? 3 : this.deliveryAttempted() ? 2 : 1));

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCouponValidationTimer());
    this.loadCart();
  }

  private couponValidationTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

  protected loadCart(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      cart: this.cartApiService.getCart().pipe(map((response) => response.data), switchMap((cart) => this.enrichCart(cart))),
      addresses: this.profileApiService.getAddresses().pipe(map((response) => response.data)),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cart: { cart, products }, addresses }) => {
          this.cart.set(cart);
          this.addresses.set(addresses);
          this.productsById.set(new Map(products.map((product) => [product.productId, product])));
          this.applyDefaultAddress(addresses);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message);
        },
      });
  }

  protected productImage(product: ProductDto | null): string | null {
    return product ? getPrimaryProductImageUrl(product) : null;
  }

  protected updateQuantity(line: CartLine, value: string | number): void {
    const maxQuantity = line.product?.stockQuantity ?? Number.POSITIVE_INFINITY;
    const nextQuantity = Math.min(maxQuantity, Math.max(0, Math.floor(Number(value) || 0)));
    const currentQuantity = line.quantity;

    if (nextQuantity === currentQuantity) {
      return;
    }

    this.applyOptimisticQuantity(line.productId, nextQuantity);
    this.pendingProductId.set(line.productId);

    const request =
      nextQuantity <= 0
        ? this.cartApiService.removeItem(line.productId)
        : nextQuantity > currentQuantity
          ? this.cartApiService.addItem({ productId: line.productId, quantity: nextQuantity - currentQuantity })
          : this.cartApiService.removeItem(line.productId).pipe(
              switchMap(() => this.cartApiService.addItem({ productId: line.productId, quantity: nextQuantity })),
            );

    request
      .pipe(
        map((response) => response.data),
        switchMap((cart) => this.enrichCart(cart)),
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cart, products }) => {
          this.cart.set(cart);
          this.productsById.set(new Map(products.map((product) => [product.productId, product])));
        },
        error: (error: unknown) => {
          this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 });
          this.loadCart();
        },
      });
  }

  protected removeItem(line: CartLine): void {
    this.pendingProductId.set(line.productId);
    this.cartApiService
      .removeItem(line.productId)
      .pipe(
        map((response) => response.data),
        switchMap((cart) => this.enrichCart(cart)),
        finalize(() => this.pendingProductId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cart, products }) => {
          this.cart.set(cart);
          this.productsById.set(new Map(products.map((product) => [product.productId, product])));
          this.snackBar.open('Item removed from cart', 'Close', { duration: 2200 });
        },
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  protected clearCart(): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      data: {
        title: 'Clear cart?',
        message: 'This removes every item from your cart.',
        confirmLabel: 'Clear Cart',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.executeClearCart();
        }
      });
  }

  protected createOrder(): void {
    if (!this.lines().length) {
      return;
    }

    if (!this.hasDeliveryAddress()) {
      this.deliveryAttempted.set(true);
      this.snackBar.open('Enter a delivery city, zone, and address before creating the order.', 'Close', {
        duration: 3500,
      });
      return;
    }

    this.isCheckingOut.set(true);
    const request: CreateOrderRequest = {
      fulfillmentMethod: this.fulfillmentMethod(),
      paymentMethod: this.paymentMethod(),
      deliveryAddressId: this.selectedAddressId() ?? undefined,
      deliveryCity: this.deliveryCity().trim() || undefined,
      deliveryZone: this.deliveryZone().trim() || undefined,
      deliveryAddressLine: this.deliveryAddressLine().trim() || undefined,
      couponCode: this.couponCode().trim() || undefined,
    };

    this.orderApiService
      .createOrder(request)
      .pipe(
        map((response) => response.data),
        switchMap((order) =>
          this.startPayment(order.orderId).pipe(
            map((payment) => ({ order, payment })),
            catchError((error: unknown) => {
              const message = this.apiErrorService.getErrorDetails(error).message;
              this.snackBar.open(message, 'Close', { duration: 4000 });
              void this.router.navigate(['/checkout/failure'], {
                queryParams: {
                  orderId: order.orderId,
                  orderNumber: order.orderNumber,
                  reason: message,
                },
              });
              return EMPTY;
            }),
          ),
        ),
        finalize(() => this.isCheckingOut.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ order, payment }) => {
          if (isExternalCheckout(payment)) {
            globalThis.location.assign(payment.checkoutUrl);
            return;
          }

          this.snackBar.open(`Order ${order.orderNumber} created`, 'Close', { duration: 3500 });
          void this.router.navigate(['/checkout/success'], {
            queryParams: {
              orderId: order.orderId,
              orderNumber: order.orderNumber,
              paymentStatus: payment?.status ?? order.paymentStatus ?? 'pending',
            },
          });
        },
        error: (error: unknown) => {
          const message = this.apiErrorService.getErrorDetails(error).message;
          this.snackBar.open(message, 'Close', { duration: 4000 });
          void this.router.navigate(['/checkout/failure'], {
            queryParams: {
              reason: message,
            },
          });
        },
      });
  }

  protected setFulfillmentMethod(value: string): void {
    this.fulfillmentMethod.set(value === 'pickup' ? 'pickup' : 'home_delivery');
    if (value === 'pickup') {
      this.deliveryAttempted.set(false);
    }
  }

  protected setPaymentMethod(value: string): void {
    if (value === 'card' || value === 'bank_transfer') {
      this.paymentMethod.set(value);
      return;
    }

    this.paymentMethod.set('cod');
  }

  protected selectAddress(addressId: string | number | null): void {
    const normalizedAddressId = Number(addressId);
    const address = this.addresses().find((item) => item.addressId === normalizedAddressId);
    this.selectedAddressId.set(address?.addressId ?? null);
    if (address) {
      this.deliveryCity.set(address.city);
      this.deliveryZone.set(address.zone);
      this.deliveryAddressLine.set(address.addressLine);
      this.deliveryAttempted.set(false);
    }
  }

  protected updateDeliveryCity(value: string): void {
    this.deliveryCity.set(value);
    this.clearDeliveryAttemptWhenComplete();
  }

  protected updateDeliveryZone(value: string): void {
    this.deliveryZone.set(value);
    this.clearDeliveryAttemptWhenComplete();
  }

  protected updateDeliveryAddressLine(value: string): void {
    this.deliveryAddressLine.set(value);
    this.clearDeliveryAttemptWhenComplete();
  }

  protected deliveryFieldError(field: 'city' | 'zone' | 'addressLine'): string {
    if (!this.deliveryAttempted() || !this.requiresDeliveryAddress()) {
      return '';
    }

    const value =
      field === 'city'
        ? this.deliveryCity()
        : field === 'zone'
          ? this.deliveryZone()
          : this.deliveryAddressLine();

    return value.trim() ? '' : 'Required for home delivery.';
  }

  protected updateCouponCode(value: string): void {
    const code = value.toUpperCase().replace(/\s+/g, '');
    this.couponCode.set(code);
    this.couponDiscount.set(0);
    this.clearCouponValidationTimer();

    if (!code) {
      this.couponState.set('idle');
      this.couponMessage.set(null);
      return;
    }

    if (!isValidCouponFormat(code)) {
      this.couponState.set('invalid');
      this.couponMessage.set('Coupon codes can use letters, numbers, hyphen, or underscore.');
      return;
    }

    this.couponState.set('success');
    this.couponMessage.set('Coupon format accepted. Backend validation is checked before checkout.');
    this.couponValidationTimer = globalThis.setTimeout(() => this.validateCouponWithBackend(), 350);
  }

  protected applyCoupon(): void {
    if (!this.couponCode().trim()) {
      this.couponState.set('invalid');
      this.couponMessage.set('Enter a coupon code before applying.');
      return;
    }

    this.validateCouponWithBackend();
  }

  protected couponStatusClass(): string {
    return `coupon-${this.couponState()}`;
  }

  private executeClearCart(): void {
    this.isLoading.set(true);
    this.cartApiService
      .clearCart()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cart.update((cart) => (cart ? { ...cart, items: [] } : cart));
          this.snackBar.open('Cart cleared', 'Close', { duration: 2200 });
        },
        error: (error: unknown) => this.snackBar.open(this.apiErrorService.getErrorDetails(error).message, 'Close', { duration: 3500 }),
      });
  }

  private enrichCart(cart: CartDto) {
    const productRequests = cart.items.map((item) => {
      const cachedProduct = this.productCacheService.getCached(item.productId);
      return cachedProduct ? of(cachedProduct) : this.productCacheService.getProduct(item.productId).pipe(map((response) => response.data));
    });

    return productRequests.length ? forkJoin(productRequests).pipe(map((products) => ({ cart, products }))) : of({ cart, products: [] });
  }

  private applyDefaultAddress(addresses: readonly AddressDto[]): void {
    if (this.selectedAddressId() !== null || this.deliveryCity() || this.deliveryZone() || this.deliveryAddressLine()) {
      return;
    }
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (defaultAddress) {
      this.selectAddress(defaultAddress.addressId);
    }
  }

  private applyOptimisticQuantity(productId: number, quantity: number): void {
    this.cart.update((cart) => {
      if (!cart) {
        return cart;
      }

      return {
        ...cart,
        items:
          quantity <= 0
            ? cart.items.filter((item) => item.productId !== productId)
            : cart.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
      };
    });
  }

  private startPayment(orderId: number): Observable<PaymentProviderDto | null> {
    if (this.paymentMethod() !== 'card') {
      return of(null);
    }

    return this.paymentApiService.createStripeCheckoutSession({ orderId }).pipe(map((response) => response.data));
  }

  private validateCouponWithBackend(): void {
    const code = this.couponCode().trim();

    if (!code || !isValidCouponFormat(code)) {
      return;
    }

    this.couponState.set('loading');
    this.couponMessage.set('Validating coupon...');
    this.couponApiService
      .validateCoupon({
        code,
        subtotal: this.summary().subtotal,
        productIds: this.lines().map((line) => line.productId),
        categoryIds: Array.from(
          new Set(
            this.lines()
              .map((line) => line.product?.category.categoryId)
              .filter((categoryId): categoryId is number => typeof categoryId === 'number'),
          ),
        ),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.couponDiscount.set(response.data.discountAmount);
          this.couponState.set(response.data.valid ? 'success' : 'invalid');
          this.couponMessage.set(response.data.message);
        },
        error: (error: unknown) => {
          this.couponDiscount.set(0);
          this.couponState.set('invalid');
          this.couponMessage.set(this.apiErrorService.getErrorDetails(error).message);
        },
      });
  }

  private clearDeliveryAttemptWhenComplete(): void {
    if (this.hasDeliveryAddress()) {
      this.deliveryAttempted.set(false);
    }
  }

  private clearCouponValidationTimer(): void {
    if (!this.couponValidationTimer) {
      return;
    }

    globalThis.clearTimeout(this.couponValidationTimer);
    this.couponValidationTimer = null;
  }
}

function isValidCouponFormat(code: string): boolean {
  return /^[A-Z0-9_-]{3,32}$/.test(code);
}

function isExternalCheckout(payment: PaymentProviderDto | null): payment is PaymentProviderDto & { readonly checkoutUrl: string } {
  return Boolean(payment?.checkoutUrl);
}
