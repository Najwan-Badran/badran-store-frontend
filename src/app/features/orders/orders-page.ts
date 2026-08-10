import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { OrderDto } from '../../core/models/order.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { OrderApiService } from '../../core/services/order-api.service';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { getOrderStatusLabel, getOrderStatusTone, getPaymentStatusLabel } from './order-ui';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-orders-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly orderApiService = inject(OrderApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly orders = signal<readonly OrderDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cancelMessage = signal<string | null>(null);
  protected readonly cancellingOrderId = signal<number | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<string>('all');
  protected readonly statusOptions = computed(() =>
    Array.from(new Set(this.orders().map((order) => order.status))).sort(),
  );
  protected readonly filteredOrders = computed(() => {
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const statusFilter = this.statusFilter();

    return this.orders().filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm) ||
        String(order.total).includes(searchTerm);

      return matchesStatus && matchesSearch;
    });
  });
  protected readonly totalSpent = computed(() => this.orders().reduce((total, order) => total + Number(order.total), 0));

  constructor() {
    this.loadOrders();
  }

  protected loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderApiService
      .getOrders()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.orders.set(response.data),
        error: (error: unknown) => this.errorMessage.set(this.apiErrorService.getErrorDetails(error).message),
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

  protected canCancel(order: OrderDto): boolean {
    return order.status === 'pending' || order.status === 'pending_verification' || order.status === 'confirmed';
  }

  protected cancelOrder(order: OrderDto): void {
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

        this.cancellingOrderId.set(order.orderId);
        this.cancelMessage.set(null);
        this.orderApiService
          .cancelOrder(order.orderId)
          .pipe(
            finalize(() => this.cancellingOrderId.set(null)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
            next: (response) => {
              this.orders.update((orders) => orders.map((item) => (item.orderId === order.orderId ? response.data : item)));
              this.snackBar.open('Order cancelled', 'Close', { duration: 2500 });
            },
            error: (error: unknown) => {
              this.cancelMessage.set(this.apiErrorService.getErrorDetails(error).message);
            },
          });
      });
  }
}
