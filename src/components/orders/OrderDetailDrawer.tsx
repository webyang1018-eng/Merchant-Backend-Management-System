import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
  Truck,
  User,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { getChannelKey, getPaymentKey } from '../../i18n/translations';
import { useMerchant } from '../../store/MerchantContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { OrderStatusBadge } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { ProductSwatch } from '../ui/ProductSwatch';

const CARRIERS = [
  'DHL Express',
  'FedEx International',
  'Ninja Van SG',
  'SingPost Speedpost',
  'UPS Worldwide',
];

export function OrderDetailDrawer() {
  const {
    state,
    dispatch,
    inspectOrderId,
    setInspectOrderId,
    setActiveSection,
    setInspectCustomerId,
    pushToast,
  } = useMerchant();
  const { locale, t, tc } = useI18n();

  const order = state.orders.find((o) => o.id === inspectOrderId) ?? null;
  const currency = state.settings.currency;

  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [restockItems, setRestockItems] = useState(true);

  useEffect(() => {
    if (order) {
      setCarrier(order.carrier ?? CARRIERS[0]);
      setTrackingNumber(order.trackingNumber ?? '');
      setNoteText('');
      setShowRefundForm(order.status === 'refund_requested');
      setRefundReason(order.refundReason ? tc(order.refundReason) : '');
      setRestockItems(order.status !== 'refund_requested');
    }
  }, [order?.id, order?.status, locale]);

  if (!order) return null;

  const generateTracking = () => {
    const prefix = carrier.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase();
    const digits = Math.floor(1_000_000_000 + Math.random() * 8_999_999_999);
    setTrackingNumber(`${prefix}${digits}`);
  };

  const handleShip = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      pushToast(
        t('orderDrawer.toastTrackingReqTitle'),
        t('orderDrawer.toastTrackingReqDesc'),
        'warning'
      );
      return;
    }
    dispatch({
      type: 'SHIP_ORDER',
      payload: { orderId: order.id, carrier, trackingNumber: trimmed },
    });
    pushToast(
      t('orderDrawer.toastDispatchedTitle', { orderNumber: order.orderNumber }),
      t('orderDrawer.toastDispatchedDesc', { carrier, tracking: trimmed })
    );
  };

  const handleDeliver = () => {
    dispatch({ type: 'DELIVER_ORDER', payload: { orderId: order.id } });
    pushToast(
      t('orderDrawer.toastDeliveredTitle', { orderNumber: order.orderNumber }),
      t('orderDrawer.toastDeliveredDesc')
    );
  };

  const handleMarkPaid = () => {
    dispatch({ type: 'MARK_ORDER_PAID', payload: { orderId: order.id } });
    pushToast(
      t('orderDrawer.toastPaidTitle', { orderNumber: order.orderNumber }),
      t('orderDrawer.toastPaidDesc')
    );
  };

  const handleRefundOrCancel = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStatus =
      order.status === 'pending_payment' || order.status === 'to_fulfill'
        ? 'cancelled'
        : 'refunded';
    dispatch({
      type: 'REFUND_OR_CANCEL_ORDER',
      payload: {
        orderId: order.id,
        targetStatus,
        reason: refundReason,
        restock: restockItems,
      },
    });
    setShowRefundForm(false);
    pushToast(
      targetStatus === 'refunded'
        ? t('orderDrawer.toastRefundTitle', { orderNumber: order.orderNumber })
        : t('orderDrawer.toastCancelledTitle', { orderNumber: order.orderNumber }),
      restockItems ? t('orderDrawer.toastRestocked') : t('orderDrawer.toastUnrestocked'),
      'info'
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    dispatch({
      type: 'ADD_ORDER_NOTE',
      payload: { orderId: order.id, note: noteText },
    });
    setNoteText('');
    pushToast(
      t('orderDrawer.toastNoteTitle'),
      t('orderDrawer.toastNoteDesc', { orderNumber: order.orderNumber })
    );
  };

  const canCancelOrRefund =
    order.status !== 'refunded' && order.status !== 'cancelled';

  const paymentLabel = t(getPaymentKey(order.paymentMethod));
  const channelLabel = t(getChannelKey(order.channel));

  return (
    <Drawer
      open={Boolean(order)}
      onClose={() => setInspectOrderId(null)}
      title={
        <>
          <span className="tabular-nums">{order.orderNumber}</span>
          <OrderStatusBadge status={order.status} />
        </>
      }
      subtitle={`${formatDate(order.createdAt, true, locale)} · ${channelLabel}`}
    >
      <div className="space-y-6">
        {/* Pending Payment Action Banner */}
        {order.status === 'pending_payment' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-amber-900">
                  {t('orderDrawer.awaitingPaymentTitle')}
                </h3>
                <p className="mt-0.5 text-xs text-amber-700">
                  {t('orderDrawer.awaitingPaymentDesc', { method: paymentLabel })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkPaid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('orderDrawer.confirmPayment')}
              </button>
            </div>
          </div>
        )}

        {/* Fulfillment Workflow Box */}
        {order.status === 'to_fulfill' && (
          <form
            onSubmit={handleShip}
            className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
              <Truck className="h-4 w-4 text-teal-700" />
              {t('orderDrawer.fulfillHeading')}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  {t('orderDrawer.shippingCarrier')}
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-600">
                    {t('orderDrawer.trackingNumber')}
                  </label>
                  <button
                    type="button"
                    onClick={generateTracking}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('orderDrawer.generate')}
                  </button>
                </div>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={t('orderDrawer.trackingPlaceholder')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Truck className="h-3.5 w-3.5" />
                {t('orderDrawer.markShipped')}
              </button>
            </div>
          </form>
        )}

        {/* Shipped In-Transit Box */}
        {order.status === 'shipped' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-blue-900">
                  {t('orderDrawer.inTransitVia', {
                    carrier: order.carrier ?? t('orderDrawer.carrierFallback'),
                  })}
                </div>
                <div className="mt-0.5 text-xs text-blue-700 tabular-nums">
                  {t('orderDrawer.trackingLabel', { tracking: order.trackingNumber ?? '—' })}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeliver}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('orderDrawer.markDelivered')}
              </button>
            </div>
          </div>
        )}

        {/* Refund / Cancellation Panel */}
        {canCancelOrRefund && showRefundForm && (
          <form
            onSubmit={handleRefundOrCancel}
            className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-900">
                <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                {order.status === 'refund_requested'
                  ? t('orderDrawer.reviewRefund')
                  : order.status === 'pending_payment' || order.status === 'to_fulfill'
                    ? t('orderDrawer.cancelOrder')
                    : t('orderDrawer.issueFullRefund')}
              </span>
              <span className="text-xs font-semibold text-rose-800 tabular-nums">
                {formatCurrency(order.total, currency)}
              </span>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                {t('orderDrawer.reasonLabel')}
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('orderDrawer.reasonPlaceholder')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={restockItems}
                onChange={(e) => setRestockItems(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              {t('orderDrawer.restockCheckbox')}
            </label>
            <div className="flex justify-end gap-2">
              {order.status !== 'refund_requested' && (
                <button
                  type="button"
                  onClick={() => setShowRefundForm(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t('common.dismiss')}
                </button>
              )}
              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {order.status === 'pending_payment' || order.status === 'to_fulfill'
                  ? t('orderDrawer.confirmCancel')
                  : t('orderDrawer.approveRefund', {
                      amount: formatCurrency(order.total, currency),
                    })}
              </button>
            </div>
          </form>
        )}

        {/* Line Items & Financial Summary */}
        <div>
          <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {t('orderDrawer.lineItemsCount', {
              count: order.items.reduce((s, i) => s + i.quantity, 0),
            })}
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200/80">
            <ul className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <li
                  key={`${item.productId}-${idx}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductSwatch color={item.swatchColor} label={item.name} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{tc(item.name)}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {item.sku} · {formatCurrency(item.unitPrice, currency)} × {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(item.unitPrice * item.quantity, currency)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>{t('common.subtotal')}</span>
                <span>{formatCurrency(order.subtotal, currency)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    {t('common.discount')} {order.promoCode ? `(${order.promoCode})` : ''}
                  </span>
                  <span>-{formatCurrency(order.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>
                  {t('common.shipping')}{' '}
                  {order.promoCode && order.shippingFee === 0 && order.discount === 0
                    ? `(${order.promoCode})`
                    : ''}
                </span>
                <span>
                  {order.shippingFee === 0
                    ? t('common.free')
                    : formatCurrency(order.shippingFee, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('common.tax')}</span>
                <span>{formatCurrency(order.tax, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-2 text-sm font-semibold text-slate-900">
                <span>{t('common.total')}</span>
                <span>{formatCurrency(order.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer, Shipping & Payment Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 p-3.5 text-xs">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {t('common.customer')}
            </div>
            <button
              type="button"
              onClick={() => {
                const cid = order.customerId;
                setInspectOrderId(null);
                setActiveSection('customers');
                setInspectCustomerId(cid);
              }}
              className="font-medium text-teal-700 hover:underline"
            >
              {order.customerName}
            </button>
            <div className="mt-0.5 truncate text-slate-500">{order.customerEmail}</div>
            <div className="mt-2.5 flex items-start gap-1.5 border-t border-slate-100 pt-2 text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{order.shippingAddress}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 p-3.5 text-xs">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              {t('orderDrawer.paymentFulfillment')}
            </div>
            <div className="text-slate-700">{paymentLabel}</div>
            <div className="mt-0.5 text-slate-500">
              {t('orderDrawer.channelValue', { channel: channelLabel })}
            </div>
            {order.trackingNumber && (
              <div className="mt-2.5 border-t border-slate-100 pt-2 text-slate-600 tabular-nums">
                <div className="font-medium text-slate-800">{order.carrier}</div>
                <div className="text-[11px] text-slate-500">#{order.trackingNumber}</div>
              </div>
            )}
            {canCancelOrRefund && !showRefundForm && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundForm(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  {order.status === 'pending_payment' || order.status === 'to_fulfill'
                    ? t('orderDrawer.cancelOrderBtn')
                    : t('orderDrawer.issueRefundBtn')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order Activity Timeline & Merchant Note */}
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {t('orderDrawer.timelineHeading')}
          </h3>
          <ol className="relative ml-2 space-y-3.5 border-l border-slate-200 pl-5">
            {order.events.map((ev) => (
              <li key={ev.id} className="relative text-xs">
                <span
                  className={`absolute top-1 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                    ev.type === 'refund'
                      ? 'bg-rose-500'
                      : ev.type === 'fulfillment'
                        ? 'bg-teal-600'
                        : ev.type === 'payment'
                          ? 'bg-emerald-500'
                          : ev.type === 'note'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                  }`}
                />
                <div className="font-medium text-slate-900">{tc(ev.title)}</div>
                {ev.detail && <div className="mt-0.5 text-slate-600">{tc(ev.detail)}</div>}
                <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                  {formatDate(ev.timestamp, true, locale)}
                  {ev.actor ? ` · ${ev.actor}` : ''}
                </div>
              </li>
            ))}
          </ol>

          <form onSubmit={handleAddNote} className="mt-4 flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t('orderDrawer.notePlaceholder')}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {t('common.post')}
            </button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
