export interface CreateOrderRequest {
  readonly fulfillmentMethod: 'home_delivery' | 'pickup';
  readonly guestName?: string;
  readonly guestPhone?: string;
  readonly guestEmail?: string;
  readonly deliveryAddressId?: number;
  readonly deliveryCity?: string;
  readonly deliveryZone?: string;
  readonly deliveryAddressLine?: string;
  readonly couponCode?: string;
  readonly paymentMethod: 'cod' | 'card' | 'bank_transfer';
}

export interface OrderDto {
  readonly orderId: number;
  readonly publicId: string;
  readonly orderNumber: string;
  readonly userId: number | null;
  readonly guestName: string | null;
  readonly guestPhone: string | null;
  readonly guestEmail: string | null;
  readonly fulfillmentMethod: string;
  readonly deliveryAddressId: number | null;
  readonly deliveryCity: string | null;
  readonly deliveryZone: string | null;
  readonly deliveryAddressLine: string | null;
  readonly deliveryFee: number;
  readonly status: string;
  readonly paymentMethod?: string | null;
  readonly paymentStatus?: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly createdAt: string;
  readonly items: readonly OrderItemDto[];
}

export interface OrderItemDto {
  readonly orderItemId: number;
  readonly productId: number;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface PaymentDto {
  readonly paymentId: number;
  readonly orderId: number;
  readonly method: string;
  readonly status: string;
  readonly transactionRef: string | null;
  readonly receiptUrl: string | null;
  readonly verifiedAt: string | null;
  readonly createdAt: string;
}
