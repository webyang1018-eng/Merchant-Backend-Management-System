import React from 'react';
import type {
  CustomerSegment,
  OrderStatus,
  PayoutStatus,
  ProductStatus,
  PromotionStatus,
} from '../../types/merchant';

export type BadgeTone = 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'violet';

const TONE_CLASSES: Record<BadgeTone, { wrap: string; dot: string }> = {
  emerald: {
    wrap: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    dot: 'bg-emerald-500',
  },
  amber: {
    wrap: 'bg-amber-50 text-amber-700 ring-amber-600/15',
    dot: 'bg-amber-500',
  },
  blue: {
    wrap: 'bg-blue-50 text-blue-700 ring-blue-600/15',
    dot: 'bg-blue-500',
  },
  rose: {
    wrap: 'bg-rose-50 text-rose-700 ring-rose-600/15',
    dot: 'bg-rose-500',
  },
  slate: {
    wrap: 'bg-slate-100 text-slate-700 ring-slate-500/15',
    dot: 'bg-slate-400',
  },
  violet: {
    wrap: 'bg-violet-50 text-violet-700 ring-violet-600/15',
    dot: 'bg-violet-500',
  },
};

export function Badge({
  tone = 'slate',
  dot = true,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  const styles = TONE_CLASSES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${styles.wrap}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
}

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: 'Pending Payment', tone: 'amber' },
  to_fulfill: { label: 'To Fulfill', tone: 'blue' },
  shipped: { label: 'Shipped', tone: 'violet' },
  delivered: { label: 'Delivered', tone: 'emerald' },
  refund_requested: { label: 'Refund Requested', tone: 'rose' },
  refunded: { label: 'Refunded', tone: 'slate' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'emerald' },
  draft: { label: 'Draft', tone: 'amber' },
  archived: { label: 'Archived', tone: 'slate' },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = PRODUCT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PROMO_STATUS_META: Record<PromotionStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'emerald' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  paused: { label: 'Paused', tone: 'amber' },
  expired: { label: 'Expired', tone: 'slate' },
};

export function PromoStatusBadge({ status }: { status: PromotionStatus }) {
  const meta = PROMO_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'emerald' },
  in_transit: { label: 'In Transit', tone: 'blue' },
  processing: { label: 'Processing', tone: 'amber' },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const meta = PAYOUT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const SEGMENT_META: Record<CustomerSegment, { tone: BadgeTone }> = {
  VIP: { tone: 'violet' },
  Returning: { tone: 'emerald' },
  New: { tone: 'blue' },
  'At Risk': { tone: 'amber' },
};

export function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  return <Badge tone={SEGMENT_META[segment].tone}>{segment}</Badge>;
}
