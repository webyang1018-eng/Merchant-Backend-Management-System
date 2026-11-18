import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Package,
  Plus,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { RevenueChart } from '../components/charts/RevenueChart';
import { OrderStatusBadge } from '../components/ui/Badge';
import { ProductSwatch } from '../components/ui/ProductSwatch';
import { getAnalyticsSeries, SEED_ORDERS, type DateRangeKey } from '../data/seedData';
import { useMerchant } from '../store/MerchantContext';
import type { SalesChannel } from '../types/merchant';
import { formatCurrency, formatNumber, formatShortDate } from '../utils/format';

const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '12m', label: '12M' },
];

const SEED_VALID_TOTAL = SEED_ORDERS.filter(
  (o) => o.status !== 'cancelled' && o.status !== 'refunded'
).reduce((s, o) => s + o.total, 0);
const SEED_VALID_COUNT = SEED_ORDERS.filter(
  (o) => o.status !== 'cancelled' && o.status !== 'refunded'
).length;

export function OverviewPage() {
  const {
    state,
    setActiveSection,
    navigateWithOrderFilter,
    navigateWithProductFilter,
    setInspectOrderId,
    setQuickAction,
  } = useMerchant();
  const [range, setRange] = useState<DateRangeKey>('30d');
  const currency = state.settings.currency;

  // Compute live changes made during this session vs baseline seed orders
  const { deltaRevenue, deltaOrders } = useMemo(() => {
    const valid = state.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
    const curTotal = valid.reduce((s, o) => s + o.total, 0);
    return {
      deltaRevenue: Number((curTotal - SEED_VALID_TOTAL).toFixed(2)),
      deltaOrders: valid.length - SEED_VALID_COUNT,
    };
  }, [state.orders]);

  const { points, deltas } = useMemo(
    () => getAnalyticsSeries(range, deltaRevenue, deltaOrders),
    [range, deltaRevenue, deltaOrders]
  );

  const periodRevenue = useMemo(
    () => points.reduce((sum, p) => sum + p.revenue, 0),
    [points]
  );
  const periodOrders = useMemo(
    () => points.reduce((sum, p) => sum + p.orders, 0),
    [points]
  );
  const periodAov = periodOrders > 0 ? periodRevenue / periodOrders : 0;

  // Channel mix derived from active orders scaled to the selected period
  const channelMix = useMemo(() => {
    const channels: SalesChannel[] = ['Online Store', 'Wholesale B2B', 'Mobile App', 'POS Retail'];
    const weights: Record<SalesChannel, number> = {
      'Online Store': 0,
      'Wholesale B2B': 0,
      'Mobile App': 0,
      'POS Retail': 0,
    };
    for (const o of state.orders) {
      if (o.status === 'cancelled' || o.status === 'refunded') continue;
      weights[o.channel] += o.total;
    }
    const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
    return channels
      .map((channel) => {
        const share = (weights[channel] / totalWeight) * 100;
        const amount = (periodRevenue * share) / 100;
        return { channel, share: Number(share.toFixed(1)), amount };
      })
      .sort((a, b) => b.share - a.share);
  }, [state.orders, periodRevenue]);

  const unfulfilledCount = state.orders.filter((o) => o.status === 'to_fulfill').length;
  const refundReqCount = state.orders.filter((o) => o.status === 'refund_requested').length;
  const lowStockItems = state.products.filter(
    (p) => p.status === 'active' && p.stock <= p.lowStockThreshold
  );

  const topProducts = useMemo(() => {
    return [...state.products]
      .filter((p) => p.status === 'active')
      .map((p) => ({ ...p, grossRevenue: p.price * p.soldCount }))
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
      .slice(0, 5);
  }, [state.products]);

  const recentOrders = state.orders.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Store performance for{' '}
            <span className="font-medium text-slate-900">{state.settings.storeName}</span> · Updated
            Nov 18, 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs"
            role="group"
            aria-label="Analytics time range"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors tabular-nums ${
                  range === opt.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSection('orders');
              setQuickAction('new_order');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New Order
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Gross Revenue</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums">
              <TrendingUp className="h-3 w-3" />+{deltas.revenue}%
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(periodRevenue, currency)}
          </div>
          <p className="mt-1 text-xs text-slate-500">vs. previous {range.toUpperCase()} period</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed Orders</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums">
              <TrendingUp className="h-3 w-3" />+{deltas.orders}%
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(periodOrders)}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {unfulfilledCount} awaiting dispatch right now
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg. Order Value</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums">
              <TrendingUp className="h-3 w-3" />+{deltas.aov}%
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(periodAov, currency)}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Free shipping over {formatCurrency(state.settings.freeShippingThreshold, currency)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('finance')}
          className="group rounded-xl border border-slate-200/80 bg-white p-5 text-left shadow-2xs transition-colors hover:border-teal-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Available Payout</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-700" />
          </div>
          <div className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(state.availableBalance, currency)}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            Ready to settle · {state.settings.settlementBank}
          </p>
        </button>
      </div>

      {/* Main Chart + Channel Mix / Operational Queue */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs xl:col-span-2">
          <RevenueChart points={points} currency={currency} />
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          {/* Action Queue */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Action Queue</h2>
            <p className="text-xs text-slate-500">Items requiring merchant attention</p>
            <div className="mt-3.5 space-y-2">
              <button
                type="button"
                onClick={() => navigateWithOrderFilter('to_fulfill')}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5 text-xs font-medium text-slate-800">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                  Orders to fulfill
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 tabular-nums">
                  {unfulfilledCount}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateWithProductFilter('low_stock')}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5 text-xs font-medium text-slate-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Low / out-of-stock SKUs
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 tabular-nums">
                  {lowStockItems.length}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateWithOrderFilter('refund_cancelled')}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5 text-xs font-medium text-slate-800">
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  Open refund requests
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 tabular-nums">
                  {refundReqCount}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </button>
            </div>
          </div>

          {/* Channel Breakdown */}
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Sales by Channel
              </h3>
              <span className="text-[11px] text-slate-400">{range.toUpperCase()} share</span>
            </div>
            <div className="space-y-2.5">
              {channelMix.map((row) => (
                <div key={row.channel}>
                  <div className="mb-1 flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-slate-700">{row.channel}</span>
                    <span className="text-slate-500">
                      <span className="font-medium text-slate-800">
                        {formatCurrency(row.amount, currency, { compact: true })}
                      </span>{' '}
                      ({row.share}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${Math.max(4, row.share)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders + Top Selling Products */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Orders Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Orders</h2>
              <p className="text-xs text-slate-500">Select an order to inspect or dispatch</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('orders')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Channel</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setInspectOrderId(order.id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/90"
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 tabular-nums">
                        {order.orderNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {formatShortDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{order.customerName}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} item
                        {order.items.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 whitespace-nowrap sm:table-cell">
                      {order.channel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(order.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Top Products</h2>
              <p className="text-xs text-slate-500">Ranked by cumulative revenue</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('products')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Catalog
              <Package className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {topProducts.map((prod) => {
              const isLow = prod.stock <= prod.lowStockThreshold;
              return (
                <li
                  key={prod.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductSwatch
                      color={prod.swatchColor}
                      category={prod.category}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-900">
                        {prod.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                        <span>{formatNumber(prod.soldCount)} sold</span>
                        <span>·</span>
                        <span
                          className={
                            prod.stock === 0
                              ? 'font-medium text-rose-600'
                              : isLow
                                ? 'font-medium text-amber-600'
                                : 'text-slate-500'
                          }
                        >
                          {prod.stock === 0 ? 'Out of stock' : `${prod.stock} left`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(prod.grossRevenue, currency, { compact: true })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
