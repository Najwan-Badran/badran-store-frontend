import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { CreateOrderRequest, OrderDto } from '../../core/models/order.models';
import { ProductDto } from '../../core/models/product.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { OrderApiService } from '../../core/services/order-api.service';
import { ProductCacheService } from '../../core/services/product-cache.service';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import {
  buildOrderTimeline,
  getOrderStatusLabel,
  getOrderStatusTone,
  getOrderTax,
  getPaymentStatusLabel,
} from './order-ui';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-order-details-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './order-details-page.html',
  styleUrl: './order-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly orderApiService = inject(OrderApiService);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly order = signal<OrderDto | null>(null);
  protected readonly productsById = signal<ReadonlyMap<number, ProductDto>>(new Map());
  protected readonly isLoading = signal(true);
  protected readonly isPaying = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly paymentErrorMessage = signal<string | null>(null);
  protected readonly paymentSuccessMessage = signal<string | null>(null);
  protected readonly cancelMessage = signal<string | null>(null);
  protected readonly paymentMethod = signal<CreateOrderRequest['paymentMethod']>('cod');
  protected readonly timeline = computed(() => {
    const order = this.order();
    return buildOrderTimeline(order?.status ?? 'pending', order?.fulfillmentMethod ?? '');
  });
  protected readonly tax = computed(() => {
    const order = this.order();
    return order ? getOrderTax(order) : 0;
  });
  protected readonly canCancel = computed(() => {
    const status = this.order()?.status;
    return status === 'pending' || status === 'pending_verification' || status === 'confirmed';
  });

  constructor() {
    this.loadOrder();
  }

  protected loadOrder(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(orderId) || orderId <= 0) {
      this.errorMessage.set('The requested order route is invalid.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderApiService
      .getOrder(orderId)
      .pipe(
        map((response) => response.data),
        switchMap((order) => this.enrichOrder(order)),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ order, products }) => {
          this.order.set(order);
          this.productsById.set(new Map(products.map((product) => [product.productId, product])));
        },
        error: (error: unknown) => this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }

  protected setPaymentMethod(value: string): void {
    if (value === 'card' || value === 'bank_transfer') {
      this.paymentMethod.set(value);
      return;
    }

    this.paymentMethod.set('cod');
  }

  protected pay(): void {
    const order = this.order();

    if (!order) {
      return;
    }

    this.isPaying.set(true);
    this.paymentErrorMessage.set(null);
    this.paymentSuccessMessage.set(null);
    this.orderApiService
      .pay(order.orderId, this.paymentMethod())
      .pipe(
        finalize(() => this.isPaying.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.paymentSuccessMessage.set('Payment completed.');
          this.snackBar.open('Payment completed', 'Close', { duration: 2500 });
          this.loadOrder();
        },
        error: (error: unknown) => {
          const message = this.apiErrorService.getErrorDetails(error).message;
          this.paymentErrorMessage.set(message);
          this.snackBar.open(message, 'Close', { duration: 3500 });
        },
      });
  }

  protected cancelOrder(): void {
    const order = this.order();

    if (!order || !this.canCancel()) {
      return;
    }

    this.dialog
      .open(ConfirmationDialog, {
        autoFocus: 'dialog',
        restoreFocus: true,
        data: {
          title: 'Cancel order?',
          message: `Order ${order.orderNumber} will be cancelled if the backend approves the request.`,
          confirmLabel: 'Cancel Order',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.isCancelling.set(true);
        this.cancelMessage.set(null);
        this.orderApiService
          .cancelOrder(order.orderId)
          .pipe(
            finalize(() => this.isCancelling.set(false)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
            next: (response) => {
              this.order.set(response.data);
              this.cancelMessage.set('Order cancelled.');
              this.snackBar.open('Order cancelled', 'Close', { duration: 2500 });
            },
            error: (error: unknown) => {
              this.cancelMessage.set(this.apiErrorService.getErrorDetails(error).message);
            },
          });
      });
  }

  protected statusLabel(status: string): string {
    return getOrderStatusLabel(status);
  }

  protected statusTone(status: string): string {
    return getOrderStatusTone(status);
  }

  protected paymentStatus(order: OrderDto): string {
    return getPaymentStatusLabel(order);
  }

  private enrichOrder(order: OrderDto) {
    const requests = order.items.map((item) => {
      const cachedProduct = this.productCacheService.getCached(item.productId);
      return cachedProduct ? of(cachedProduct) : this.productCacheService.getProduct(item.productId).pipe(map((response) => response.data));
    });

    return requests.length ? forkJoin(requests).pipe(map((products) => ({ order, products }))) : of({ order, products: [] });
  }
}
