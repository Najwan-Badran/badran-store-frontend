import { PaymentDto } from './order.models';

export interface PaymentProviderRequest {
  readonly orderId: number;
}

export interface PaymentStatusSyncRequest {
  readonly orderId: number;
  readonly providerPaymentId: string;
  readonly failureReason?: string;
}

export interface RefundRequest {
  readonly orderId: number;
  readonly amount: number;
}

export interface PaymentProviderDto {
  readonly orderId: number;
  readonly provider: string;
  readonly providerPaymentId: string | null;
  readonly clientSecret: string | null;
  readonly checkoutUrl: string | null;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
}

export interface PaymentFailureRecovery {
  readonly orderId: number;
  readonly providerPaymentId?: string;
  readonly reason?: string;
}

export type PaymentSyncResponse = PaymentDto;
