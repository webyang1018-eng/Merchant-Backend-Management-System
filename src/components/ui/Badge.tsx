import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
  getLedgerTypeKey,
  getOrderStatusKey,
  getPayoutStatusKey,
  getProductStatusKey,
  getPromoStatusKey,
  getSegmentKey,
} from '../../i18n/translations';
import type {
  CustomerSegment,
  LedgerType,
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

const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending_payment: 'amber',
  to_fulfill: 'blue',
  shipped: 'violet',
  delivered: 'emerald',
  refund_requested: 'rose',
  refunded: 'slate',
  cancelled: 'slate',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Badge tone={ORDER_STATUS_TONES[status]}>{t(getOrderStatusKey(status))}</Badge>;
}

const PRODUCT_STATUS_TONES: Record<ProductStatus, BadgeTone> = {
  active: 'emerald',
  draft: 'amber',
  archived: 'slate',
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useI18n();
  return <Badge tone={PRODUCT_STATUS_TONES[status]}>{t(getProductStatusKey(status))}</Badge>;
}

const PROMO_STATUS_TONES: Record<PromotionStatus, BadgeTone> = {
  active: 'emerald',
  scheduled: 'blue',
  paused: 'amber',
  expired: 'slate',
};

export function PromoStatusBadge({ status }: { status: PromotionStatus }) {
  const { t } = useI18n();
  return <Badge tone={PROMO_STATUS_TONES[status]}>{t(getPromoStatusKey(status))}</Badge>;
}

const PAYOUT_STATUS_TONES: Record<PayoutStatus, BadgeTone> = {
  paid: 'emerald',
  in_transit: 'blue',
  processing: 'amber',
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const { t } = useI18n();
  return <Badge tone={PAYOUT_STATUS_TONES[status]}>{t(getPayoutStatusKey(status))}</Badge>;
}

const LEDGER_TYPE_TONES: Record<LedgerType, BadgeTone> = {
  charge: 'emerald',
  refund: 'rose',
  payout: 'blue',
};

export function LedgerTypeBadge({ type }: { type: LedgerType }) {
  const { t } = useI18n();
  return <Badge tone={LEDGER_TYPE_TONES[type]}>{t(getLedgerTypeKey(type))}</Badge>;
}

const SEGMENT_TONES: Record<CustomerSegment, BadgeTone> = {
  VIP: 'violet',
  Returning: 'emerald',
  New: 'blue',
  'At Risk': 'amber',
};

export function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const { t } = useI18n();
  return <Badge tone={SEGMENT_TONES[segment]}>{t(getSegmentKey(segment))}</Badge>;
}
