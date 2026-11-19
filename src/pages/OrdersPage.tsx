import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2, Truck } from 'lucide-react';
import { OrderStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useI18n } from '../i18n/I18nContext';
import {
  getChannelKey,
  getOrderStatusKey,
  getPaymentKey,
  getPromoStatusKey,
} from '../i18n/translations';
import { useMerchant } from '../store/MerchantContext';
import type { PaymentMethod, SalesChannel } from '../types/merchant';
import {
  computePromoDiscount,
  downloadCsv,
  formatCurrency,
  formatDate,
} from '../utils/format';

type OrderTab =
  | 'all'
  | 'to_fulfill'
  | 'pending_payment'
  | 'shipped'
  | 'delivered'
  | 'refund_cancelled';

const CHANNELS: SalesChannel[] = ['Online Store', 'POS Retail', 'Mobile App', 'Wholesale B2B'];
const PAYMENTS: PaymentMethod[] = [
  'Visa •••• 4242',
  'Mastercard •••• 8910',
  'Apple Pay',
  'PayNow',
  'Bank Transfer',
];

export function OrdersPage() {
  const {
    state,
    dispatch,
    setInspectOrderId,
    quickAction,
    setQuickAction,
    pushToast,
  } = useMerchant();
  const { locale, t, tc } = useI18n();

  const currency = state.settings.currency;
  const [tab, setTab] = useState<OrderTab>('all');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Respect navigation filter presets from Overview or Alerts
  useEffect(() => {
    if (state.orderFilterPreset) {
      setTab(state.orderFilterPreset as OrderTab);
      dispatch({ type: 'SET_ORDER_FILTER_PRESET', payload: null });
    }
  }, [state.orderFilterPreset, dispatch]);

  // Respect quick action trigger
  useEffect(() => {
    if (quickAction === 'new_order') {
      setCreateOpen(true);
      setQuickAction(null);
    }
  }, [quickAction, setQuickAction]);

  const counts = useMemo(() => {
    const c = {
      all: state.orders.length,
      to_fulfill: 0,
      pending_payment: 0,
      shipped: 0,
      delivered: 0,
      refund_cancelled: 0,
    };
    for (const o of state.orders) {
      if (o.status === 'to_fulfill') c.to_fulfill++;
      else if (o.status === 'pending_payment') c.pending_payment++;
      else if (o.status === 'shipped') c.shipped++;
      else if (o.status === 'delivered') c.delivered++;
      else c.refund_cancelled++;
    }
    return c;
  }, [state.orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = state.orders.filter((o) => {
      if (tab === 'to_fulfill' && o.status !== 'to_fulfill') return false;
      if (tab === 'pending_payment' && o.status !== 'pending_payment') return false;
      if (tab === 'shipped' && o.status !== 'shipped') return false;
      if (tab === 'delivered' && o.status !== 'delivered') return false;
      if (
        tab === 'refund_cancelled' &&
        o.status !== 'refund_requested' &&
        o.status !== 'refunded' &&
        o.status !== 'cancelled'
      ) {
        return false;
      }
      if (channelFilter !== 'all' && o.channel !== channelFilter) return false;
      if (q) {
        const hitOrder =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.items.some(
            (i) =>
              i.sku.toLowerCase().includes(q) ||
              i.name.toLowerCase().includes(q) ||
              tc(i.name).toLowerCase().includes(q)
          );
        if (!hitOrder) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'highest') return b.total - a.total;
      return a.total - b.total;
    });
  }, [state.orders, tab, channelFilter, search, sortBy, tc]);

  const selectedFulfillable = useMemo(
    () =>
      selectedIds.filter((id) => {
        const ord = state.orders.find((o) => o.id === id);
        return ord?.status === 'to_fulfill';
      }),
    [selectedIds, state.orders]
  );

  const toggleAllVisible = () => {
    const visibleIds = filteredOrders.map((o) => o.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkShip = () => {
    if (selectedFulfillable.length === 0) return;
    dispatch({
      type: 'BULK_SHIP_ORDERS',
      payload: { orderIds: selectedFulfillable, carrier: 'DHL Express' },
    });
    pushToast(
      t(
        selectedFulfillable.length === 1
          ? 'orders.toastBatchShipTitleOne'
          : 'orders.toastBatchShipTitleOther',
        { count: selectedFulfillable.length }
      ),
      t('orders.toastBatchShipDesc')
    );
    setSelectedIds([]);
  };

  const handleExport = () => {
    const headers = [
      t('orders.csvOrderNum'),
      t('orders.csvCreatedAt'),
      t('orders.csvCustomer'),
      t('orders.csvEmail'),
      t('orders.csvChannel'),
      t('orders.csvPayment'),
      t('orders.csvStatus'),
      t('orders.csvItems'),
      t('orders.csvSubtotal'),
      t('orders.csvDiscount'),
      t('orders.csvShipping'),
      t('orders.csvTax'),
      t('orders.csvTotal'),
      t('orders.csvTracking'),
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.customerName,
      o.customerEmail,
      t(getChannelKey(o.channel)),
      t(getPaymentKey(o.paymentMethod)),
      t(getOrderStatusKey(o.status)),
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.subtotal.toFixed(2),
      o.discount.toFixed(2),
      o.shippingFee.toFixed(2),
      o.tax.toFixed(2),
      o.total.toFixed(2),
      o.trackingNumber ?? '',
    ]);
    downloadCsv(`orders-${tab}-2026-11-18.csv`, headers, rows);
    pushToast(
      t('orders.toastCsvTitle'),
      t('orders.toastCsvDesc', { count: rows.length }),
      'info'
    );
  };

  const tabs: { key: OrderTab; label: string; count: number }[] = [
    { key: 'all', label: t('orders.tabAll'), count: counts.all },
    { key: 'to_fulfill', label: t('orders.tabToFulfill'), count: counts.to_fulfill },
    { key: 'pending_payment', label: t('orders.tabPending'), count: counts.pending_payment },
    { key: 'shipped', label: t('orders.tabShipped'), count: counts.shipped },
    { key: 'delivered', label: t('orders.tabDelivered'), count: counts.delivered },
    {
      key: 'refund_cancelled',
      label: t('orders.tabRefundCancelled'),
      count: counts.refund_cancelled,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{t('orders.subtitle')}</p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t('common.exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('orders.createOrder')}
          </button>
        </div>
      </div>

      {/* Main Orders Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-4 pt-2">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setSelectedIds([]);
                }}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                    active ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('orders.filterChannelAria')}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">{t('orders.allChannels')}</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(getChannelKey(c))}
                </option>
              ))}
            </select>
            <select
              aria-label={t('orders.sortAria')}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="newest">{t('orders.sortNewest')}</option>
              <option value="oldest">{t('orders.sortOldest')}</option>
              <option value="highest">{t('orders.sortHighest')}</option>
              <option value="lowest">{t('orders.sortLowest')}</option>
            </select>
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/60 px-4 py-2.5 text-xs">
            <span className="font-medium text-teal-900 tabular-nums">
              {t(
                selectedIds.length === 1 ? 'orders.selectedOne' : 'orders.selectedOther',
                { count: selectedIds.length }
              )}
            </span>
            <div className="flex items-center gap-2">
              {selectedFulfillable.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkShip}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t('orders.batchShip', { count: selectedFulfillable.length })}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
              >
                {t('common.clear')}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={t('orders.selectAllAria')}
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every((o) => selectedIds.includes(o.id))
                    }
                    onChange={toggleAllVisible}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                </th>
                <th className="px-3 py-3">{t('overview.colOrder')}</th>
                <th className="px-3 py-3">{t('common.date')}</th>
                <th className="px-3 py-3">{t('common.customer')}</th>
                <th className="hidden px-3 py-3 md:table-cell">{t('common.channel')}</th>
                <th className="px-3 py-3">{t('common.status')}</th>
                <th className="hidden px-3 py-3 text-right sm:table-cell">{t('common.items')}</th>
                <th className="px-3 py-3 text-right">{t('common.total')}</th>
                <th className="px-4 py-3 text-right">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-xs text-slate-500">
                    {t('orders.empty')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const qty = order.items.reduce((s, i) => s + i.quantity, 0);
                  const checked = selectedIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setInspectOrderId(order.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/90 ${
                        checked ? 'bg-teal-50/25' : ''
                      }`}
                    >
                      <td
                        className="px-4 py-3.5"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={t('orders.selectOrderAria', {
                            orderNumber: order.orderNumber,
                          })}
                          checked={checked}
                          onChange={() => toggleRow(order.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                        />
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {order.orderNumber}
                        </span>
                        {order.promoCode && (
                          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {order.promoCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDate(order.createdAt, false, locale)}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-medium text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                      </td>
                      <td className="hidden px-3 py-3.5 text-slate-600 whitespace-nowrap md:table-cell">
                        <div>{t(getChannelKey(order.channel))}</div>
                        <div className="text-[11px] text-slate-400">
                          {t(getPaymentKey(order.paymentMethod))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="hidden px-3 py-3.5 text-right text-slate-600 whitespace-nowrap tabular-nums sm:table-cell">
                        {qty}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(order.total, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectOrderId(order.id);
                          }}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            order.status === 'to_fulfill'
                              ? 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                              : order.status === 'refund_requested'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {order.status === 'to_fulfill'
                            ? t('orders.actionFulfill')
                            : order.status === 'refund_requested'
                              ? t('orders.actionReview')
                              : t('orders.actionInspect')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Manual Order Modal */}
      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, pushToast } = useMerchant();
  const { t, tc } = useI18n();
  const currency = state.settings.currency;
  const activeProducts = useMemo(
    () => state.products.filter((p) => p.status === 'active'),
    [state.products]
  );

  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [channel, setChannel] = useState<SalesChannel>('Online Store');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Visa •••• 4242');
  const [markPaid, setMarkPaid] = useState(true);
  const [shippingFee, setShippingFee] = useState('12');
  const [promoCode, setPromoCode] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<{ productId: string; quantity: number }[]>([]);

  useEffect(() => {
    if (open) {
      const firstCust = state.customers[0];
      const firstProd = activeProducts.find((p) => p.stock > 0) ?? activeProducts[0];
      setCustomerId(firstCust?.id ?? '');
      setShippingAddress(firstCust ? `${tc(firstCust.city)}, ${tc(firstCust.country)}` : '');
      setChannel('Online Store');
      setPaymentMethod('Visa •••• 4242');
      setMarkPaid(true);
      setShippingFee('12');
      setPromoCode('');
      setNote('');
      setLines(firstProd ? [{ productId: firstProd.id, quantity: 1 }] : []);
    }
  }, [open, state.customers, activeProducts, tc]);

  const summary = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = state.products.find((pr) => pr.id === l.productId);
      return sum + (p ? p.price * Math.max(1, l.quantity) : 0);
    }, 0);
    const rawShip = Math.max(0, Number(shippingFee) || 0);
    const baseShip = subtotal >= state.settings.freeShippingThreshold ? 0 : rawShip;
    const code = promoCode.trim().toUpperCase();
    const matched = code
      ? state.promotions.find((pr) => pr.code.toUpperCase() === code)
      : undefined;

    let discount = 0;
    let adjustedShipping = baseShip;
    let promoError: string | undefined;

    if (code) {
      if (!matched) {
        promoError = t('createOrder.promoUnknown', { code });
      } else {
        const res = computePromoDiscount(matched, subtotal, baseShip);
        discount = res.discount;
        adjustedShipping = res.adjustedShipping;
        if (res.errorMeta) {
          if (res.errorMeta.kind === 'inactive') {
            promoError = t('createOrder.promoInactive', {
              code: res.errorMeta.code,
              status: t(getPromoStatusKey(res.errorMeta.status)),
            });
          } else if (res.errorMeta.kind === 'limit') {
            promoError = t('createOrder.promoLimit', { code: res.errorMeta.code });
          } else {
            promoError = t('createOrder.promoMin', {
              amount: formatCurrency(res.errorMeta.minAmount, currency),
            });
          }
        }
      }
    }

    const taxable = Math.max(0, subtotal - discount);
    const tax = Number(((taxable * state.settings.taxRate) / 100).toFixed(2));
    const total = Number((taxable + adjustedShipping + tax).toFixed(2));
    return {
      subtotal,
      discount,
      shipping: adjustedShipping,
      tax,
      total,
      promoError,
      promoApplied: Boolean(code && !promoError),
    };
  }, [
    lines,
    state.products,
    shippingFee,
    state.settings.freeShippingThreshold,
    state.settings.taxRate,
    promoCode,
    state.promotions,
    currency,
    t,
  ]);

  const handleAddLine = () => {
    const candidate =
      activeProducts.find((p) => !lines.some((l) => l.productId === p.id)) ?? activeProducts[0];
    if (!candidate) return;
    setLines((prev) => [...prev, { productId: candidate.id, quantity: 1 }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || lines.length === 0) return;
    dispatch({
      type: 'CREATE_ORDER',
      payload: {
        customerId,
        shippingAddress,
        channel,
        paymentMethod,
        markPaid,
        items: lines,
        promoCode: summary.promoApplied ? promoCode : undefined,
        shippingFee: Math.max(0, Number(shippingFee) || 0),
        note,
      },
    });
    pushToast(
      t('createOrder.toastTitle'),
      t('createOrder.toastDesc', { total: formatCurrency(summary.total, currency) })
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('createOrder.title')}
      subtitle={t('createOrder.subtitle')}
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="create-order-form"
            disabled={lines.length === 0 || !customerId}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {t('createOrder.submit', { total: formatCurrency(summary.total, currency) })}
          </button>
        </>
      }
    >
      <form id="create-order-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">{t('common.customer')}</label>
            <select
              value={customerId}
              onChange={(e) => {
                const cid = e.target.value;
                setCustomerId(cid);
                const c = state.customers.find((x) => x.id === cid);
                if (c) setShippingAddress(`${tc(c.city)}, ${tc(c.country)}`);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.shippingDest')}
            </label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder={t('createOrder.shippingPlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-medium text-slate-700">{t('createOrder.lineItems')}</label>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('createOrder.addItem')}
            </button>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.productId}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, productId: e.target.value } : l))
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {tc(p.name)} — {formatCurrency(p.price, currency)} (
                      {t('common.inStockCount', { count: p.stock })})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) }
                          : l
                      )
                    )
                  }
                  className="w-18 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={t('createOrder.removeItemAria')}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.salesChannel')}
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as SalesChannel)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(getChannelKey(c))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.paymentMethod')}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {PAYMENTS.map((pm) => (
                <option key={pm} value={pm}>
                  {t(getPaymentKey(pm))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.baseShippingFee')}
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.promoLabel')}
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder={t('createOrder.promoPlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 uppercase placeholder:normal-case focus:border-teal-600 focus:outline-none"
            />
            {summary.promoError && (
              <p className="mt-1 text-[11px] text-rose-600">{summary.promoError}</p>
            )}
            {summary.promoApplied && (
              <p className="mt-1 text-[11px] text-emerald-700">{t('createOrder.promoApplied')}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('createOrder.internalNote')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('createOrder.notePlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={markPaid}
            onChange={(e) => setMarkPaid(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          {t('createOrder.markPaidLabel')}
        </label>

        {/* Live Totals Box */}
        <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 tabular-nums">
          <div className="flex justify-between text-slate-600">
            <span>{t('common.subtotal')}</span>
            <span>{formatCurrency(summary.subtotal, currency)}</span>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>{t('common.discount')}</span>
              <span>-{formatCurrency(summary.discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>{t('common.shipping')}</span>
            <span>
              {summary.shipping === 0
                ? t('common.free')
                : formatCurrency(summary.shipping, currency)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t('common.taxWithRate', { rate: state.settings.taxRate })}</span>
            <span>{formatCurrency(summary.tax, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-semibold text-slate-900">
            <span>{t('createOrder.orderTotal')}</span>
            <span>{formatCurrency(summary.total, currency)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
