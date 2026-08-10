import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorService } from '../../core/services/api-error.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-checkout-result-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './checkout-result-page.html',
  styleUrl: './checkout-result-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutResultPage {
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly paymentApiService = inject(PaymentApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly status = computed(() => this.route.snapshot.data['status'] as 'success' | 'failure');
  protected readonly orderId = computed(() => this.route.snapshot.queryParamMap.get('orderId'));
  protected readonly orderNumber = computed(() => this.route.snapshot.queryParamMap.get('orderNumber'));
  protected readonly paymentStatus = signal<string | null>(this.route.snapshot.queryParamMap.get('paymentStatus'));
  protected readonly reason = computed(() => this.route.snapshot.queryParamMap.get('reason'));
  protected readonly isSuccess = computed(() => this.status() === 'success');
  protected readonly isSyncingPayment = signal(false);
  protected readonly paymentSyncError = signal<string | null>(null);

  constructor() {
    this.syncProviderResult();
  }

  private syncProviderResult(): void {
    const orderId = Number(this.orderId());
    const providerPaymentId =
      this.route.snapshot.queryParamMap.get('providerPaymentId') ||
      this.route.snapshot.queryParamMap.get('session_id') ||
      this.route.snapshot.queryParamMap.get('payment_intent');

    if (!Number.isFinite(orderId) || orderId <= 0 || !providerPaymentId) {
      return;
    }

    this.isSyncingPayment.set(true);
    this.paymentSyncError.set(null);
    const request = {
      orderId,
      providerPaymentId,
      failureReason: this.reason() ?? undefined,
    };
    const action = this.isSuccess()
      ? this.paymentApiService.syncStripeSuccess(request)
      : this.paymentApiService.syncStripeFailure(request);

    action
      .pipe(
        finalize(() => this.isSyncingPayment.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.paymentStatus.set(response.data.status),
        error: (error: unknown) => this.paymentSyncError.set(this.apiErrorService.getErrorDetails(error).message),
      });
  }
}
