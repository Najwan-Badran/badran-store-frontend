import { OrderDto } from '../../core/models/order.models';

export type OrderStatusTone = 'neutral' | 'warning' | 'info' | 'success' | 'danger';

export interface OrderTimelineStep {
  readonly key: string;
  readonly label: string;
  readonly active: boolean;
  readonly current: boolean;
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Pending',
  pending_verification: 'Pending verification',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  ready_for_pickup: 'Ready for pickup',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_TONES: Readonly<Record<string, OrderStatusTone>> = {
  pending: 'warning',
  pending_verification: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  out_for_delivery: 'info',
  ready_for_pickup: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
};

const TIMELINE = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'out_for_delivery', label: 'Fulfillment' },
  { key: 'completed', label: 'Completed' },
] as const;

export function getOrderStatusLabel(status: string): string {
  const normalizedStatus = normalizeStatus(status);
  return STATUS_LABELS[normalizedStatus] ?? toTitleCase(status);
}

export function getOrderStatusTone(status: string): OrderStatusTone {
  return STATUS_TONES[normalizeStatus(status)] ?? 'neutral';
}

export function buildOrderTimeline(status: string, fulfillmentMethod = ''): readonly OrderTimelineStep[] {
  const normalizedStatus = normalizeStatus(status);
  const timeline = fulfillmentMethod === 'pickup'
    ? TIMELINE.map((step) => (step.key === 'out_for_delivery' ? { ...step, label: 'Ready for pickup' } : step))
    : TIMELINE;
  const currentIndex = normalizedStatus === 'cancelled'
    ? 0
    : Math.max(0, timeline.findIndex((step) => step.key === normalizeTimelineStatus(normalizedStatus)));

  return timeline.map((step, index) => ({
    key: step.key,
    label: step.label,
    active: normalizedStatus !== 'cancelled' && index <= currentIndex,
    current: normalizedStatus !== 'cancelled' && index === currentIndex,
  }));
}

export function getPaymentStatusLabel(order: OrderDto): string {
  if (order.status === 'completed' || order.status === 'delivered') {
    return 'Payment complete';
  }

  if (order.paymentStatus) {
    return toTitleCase(order.paymentStatus);
  }

  return order.paymentMethod ? `${toTitleCase(order.paymentMethod)} pending` : 'Payment pending';
}

export function getOrderTax(order: OrderDto): number {
  return Math.max(0, Number(order.total) - Number(order.subtotal) - Number(order.deliveryFee) + Number(order.discountAmount));
}

function normalizeStatus(status: string): string {
  return status.toLowerCase().trim();
}

function normalizeTimelineStatus(status: string): string {
  if (status === 'ready_for_pickup') {
    return 'out_for_delivery';
  }

  if (status === 'delivered') {
    return 'completed';
  }

  if (status === 'pending_verification') {
    return 'pending';
  }

  return status;
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
