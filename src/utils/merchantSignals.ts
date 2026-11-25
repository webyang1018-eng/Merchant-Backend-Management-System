import type { Locale, TranslationKey } from '../i18n/translations';
import { DICTIONARIES, translateContent } from '../i18n/translations';
import type { CurrencyCode, MerchantState, NavSection } from '../types/merchant';
import { formatCurrency } from './format';

export type PetAlertKind = 'unfulfilled' | 'refund' | 'low_stock' | 'payout';

export interface OperationalAlert {
  id: string;
  kind: PetAlertKind;
  title: string;
  detail: string;
  unread: boolean;
  action:
    | { type: 'order_filter'; filter: string }
    | { type: 'product_filter'; filter: string }
    | { type: 'section'; section: NavSection };
}

export type PetMood = 'idle' | 'alert' | 'urgent' | 'celebrating' | 'sleeping';

export interface PetFeedbackSignal {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  timestamp: number;
}

export interface PetSignalSnapshot {
  rev: number;
  updatedAt: string;
  locale: Locale;
  currency: CurrencyCode;
  storeName: string;
  storefrontLive: boolean;
  availableBalance: number;
  unfulfilledCount: number;
  refundRequestCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  unreadAlertCount: number;
  mood: PetMood;
  alerts: OperationalAlert[];
  latestFeedback: PetFeedbackSignal | null;
}

export type PetToMainIntent =
  | { type: 'OPEN_MAIN_SECTION'; section: NavSection }
  | { type: 'OPEN_ORDER_FILTER'; filter: string }
  | { type: 'OPEN_PRODUCT_FILTER'; filter: string }
  | { type: 'INSPECT_ORDER'; orderId: string }
  | { type: 'TRIGGER_QUICK_ACTION'; action: 'new_order' | 'new_product' | 'new_promo' | 'request_payout' }
  | { type: 'MARK_ALERTS_READ'; alertIds: string[] }
  | { type: 'SET_LOCALE'; locale: Locale };

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export function deriveOperationalAlerts(
  state: MerchantState,
  locale: Locale
): OperationalAlert[] {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.en;
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dict[key] ?? DICTIONARIES.en[key] ?? key, params);
  const tc = (text: string) => translateContent(text, locale);
  const readSet = new Set(state.readAlertIds);

  const items: OperationalAlert[] = [];

  const unfulfilled = state.orders.filter((o) => o.status === 'to_fulfill');
  if (unfulfilled.length > 0 && state.settings.notifications.newOrders) {
    const id = `alert-unfulfilled-${unfulfilled.length}`;
    items.push({
      id,
      kind: 'unfulfilled',
      title: t(
        unfulfilled.length === 1
          ? 'topbar.alertUnfulfilledTitleOne'
          : 'topbar.alertUnfulfilledTitleOther',
        { count: unfulfilled.length }
      ),
      detail: t('topbar.alertUnfulfilledDetail', {
        orderNumber: unfulfilled[0].orderNumber,
        customer: unfulfilled[0].customerName,
      }),
      unread: !readSet.has(id),
      action: { type: 'order_filter', filter: 'to_fulfill' },
    });
  }

  const refunds = state.orders.filter((o) => o.status === 'refund_requested');
  if (refunds.length > 0 && state.settings.notifications.refundRequests) {
    const id = `alert-refunds-${refunds.length}`;
    items.push({
      id,
      kind: 'refund',
      title: t('topbar.alertRefundTitle', { count: refunds.length }),
      detail: `${refunds[0].orderNumber} · ${formatCurrency(refunds[0].total, state.settings.currency)}`,
      unread: !readSet.has(id),
      action: { type: 'order_filter', filter: 'refund_cancelled' },
    });
  }

  const lowStock = state.products.filter(
    (p) => p.status === 'active' && p.stock <= p.lowStockThreshold
  );
  if (lowStock.length > 0 && state.settings.notifications.lowStockAlerts) {
    const oos = lowStock.filter((p) => p.stock === 0).length;
    const id = `alert-lowstock-${lowStock.length}-${oos}`;
    items.push({
      id,
      kind: 'low_stock',
      title: t(
        lowStock.length === 1
          ? 'topbar.alertLowStockTitleOne'
          : 'topbar.alertLowStockTitleOther',
        { count: lowStock.length }
      ),
      detail:
        oos > 0
          ? t('topbar.alertLowStockOos', { count: oos })
          : t('topbar.alertLowStockIncludes', { name: tc(lowStock[0].name) }),
      unread: !readSet.has(id),
      action: { type: 'product_filter', filter: 'low_stock' },
    });
  }

  const activePayout = state.payouts.find(
    (p) => p.status === 'in_transit' || p.status === 'processing'
  );
  if (activePayout && state.settings.notifications.payoutConfirmations) {
    const id = `alert-payout-${activePayout.id}`;
    items.push({
      id,
      kind: 'payout',
      title: t(
        activePayout.status === 'in_transit'
          ? 'topbar.alertPayoutInTransit'
          : 'topbar.alertPayoutProcessing',
        { ref: activePayout.reference }
      ),
      detail: t('topbar.alertPayoutDetail', {
        amount: formatCurrency(activePayout.netAmount, state.settings.currency),
        date: activePayout.arrivalDate,
      }),
      unread: !readSet.has(id),
      action: { type: 'section', section: 'finance' },
    });
  }

  return items;
}

export function derivePetMood(
  state: MerchantState,
  alerts: OperationalAlert[],
  latestFeedback: PetFeedbackSignal | null
): PetMood {
  if (latestFeedback && latestFeedback.kind === 'success') {
    return 'celebrating';
  }
  if (!state.settings.storefrontLive) {
    return 'sleeping';
  }
  const hasUrgentUnread = alerts.some(
    (a) => a.unread && (a.kind === 'refund' || a.kind === 'unfulfilled')
  );
  if (hasUrgentUnread) {
    return 'urgent';
  }
  if (alerts.some((a) => a.unread)) {
    return 'alert';
  }
  return 'idle';
}

export function deriveOperationalCounts(state: MerchantState): {
  unfulfilledCount: number;
  refundRequestCount: number;
  actionableOrderCount: number;
  lowStockCount: number;
  outOfStockCount: number;
} {
  const unfulfilledCount = state.orders.filter((o) => o.status === 'to_fulfill').length;
  const refundRequestCount = state.orders.filter((o) => o.status === 'refund_requested').length;
  const lowStockItems = state.products.filter(
    (p) => p.status === 'active' && p.stock <= p.lowStockThreshold
  );
  const outOfStockCount = lowStockItems.filter((p) => p.stock === 0).length;
  return {
    unfulfilledCount,
    refundRequestCount,
    actionableOrderCount: unfulfilledCount + refundRequestCount,
    lowStockCount: lowStockItems.length,
    outOfStockCount,
  };
}

export function derivePetSignalSnapshot(
  state: MerchantState,
  locale: Locale,
  rev: number,
  latestFeedback: PetFeedbackSignal | null = null,
  updatedAt: string = new Date().toISOString()
): PetSignalSnapshot {
  const alerts = deriveOperationalAlerts(state, locale);
  const { unfulfilledCount, refundRequestCount, lowStockCount, outOfStockCount } =
    deriveOperationalCounts(state);
  const unreadAlertCount = alerts.filter((a) => a.unread).length;

  return {
    rev,
    updatedAt,
    locale,
    currency: state.settings.currency,
    storeName: state.settings.storeName,
    storefrontLive: state.settings.storefrontLive,
    availableBalance: state.availableBalance,
    unfulfilledCount,
    refundRequestCount,
    lowStockCount,
    outOfStockCount,
    unreadAlertCount,
    mood: derivePetMood(state, alerts, latestFeedback),
    alerts,
    latestFeedback,
  };
}

/**
 * Computes a deterministic structural signature excluding volatile timestamps (`updatedAt`)
 * so sync publishers only emit when observable snapshot content actually changes.
 */
export function getSnapshotContentKey(
  snapshot: Omit<PetSignalSnapshot, 'rev' | 'updatedAt'>
): string {
  return JSON.stringify({
    locale: snapshot.locale,
    currency: snapshot.currency,
    storeName: snapshot.storeName,
    storefrontLive: snapshot.storefrontLive,
    availableBalance: snapshot.availableBalance,
    unfulfilledCount: snapshot.unfulfilledCount,
    refundRequestCount: snapshot.refundRequestCount,
    lowStockCount: snapshot.lowStockCount,
    outOfStockCount: snapshot.outOfStockCount,
    unreadAlertCount: snapshot.unreadAlertCount,
    mood: snapshot.mood,
    alerts: snapshot.alerts,
    latestFeedback: snapshot.latestFeedback,
  });
}
