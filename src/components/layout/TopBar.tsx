import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Menu,
  RotateCcw,
  Search,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useMerchant } from '../../store/MerchantContext';
import type { NavSection } from '../../types/merchant';
import { formatCurrency } from '../../utils/format';

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Overview',
  orders: 'Orders',
  products: 'Products & Inventory',
  customers: 'Customers',
  promotions: 'Promotions',
  finance: 'Finance & Payouts',
  settings: 'Store Settings',
};

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export function TopBar({ onOpenMobileMenu, onOpenSearch }: TopBarProps) {
  const {
    state,
    dispatch,
    activeSection,
    setActiveSection,
    navigateWithOrderFilter,
    navigateWithProductFilter,
  } = useMerchant();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!alertsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [alertsOpen]);

  const alerts = useMemo(() => {
    const items: {
      id: string;
      title: string;
      detail: string;
      icon: typeof ShoppingBag;
      tone: string;
      onClick: () => void;
    }[] = [];

    const unfulfilled = state.orders.filter((o) => o.status === 'to_fulfill');
    if (unfulfilled.length > 0 && state.settings.notifications.newOrders) {
      items.push({
        id: `alert-unfulfilled-${unfulfilled.length}`,
        title: `${unfulfilled.length} order${unfulfilled.length > 1 ? 's' : ''} ready to fulfill`,
        detail: `Latest: ${unfulfilled[0].orderNumber} from ${unfulfilled[0].customerName}`,
        icon: ShoppingBag,
        tone: 'text-blue-600 bg-blue-50',
        onClick: () => navigateWithOrderFilter('to_fulfill'),
      });
    }

    const refunds = state.orders.filter((o) => o.status === 'refund_requested');
    if (refunds.length > 0 && state.settings.notifications.refundRequests) {
      items.push({
        id: `alert-refunds-${refunds.length}`,
        title: `${refunds.length} refund request awaiting review`,
        detail: `${refunds[0].orderNumber} · ${formatCurrency(refunds[0].total, state.settings.currency)}`,
        icon: RotateCcw,
        tone: 'text-rose-600 bg-rose-50',
        onClick: () => navigateWithOrderFilter('refund_cancelled'),
      });
    }

    const lowStock = state.products.filter(
      (p) => p.status === 'active' && p.stock <= p.lowStockThreshold
    );
    if (lowStock.length > 0 && state.settings.notifications.lowStockAlerts) {
      const oos = lowStock.filter((p) => p.stock === 0).length;
      items.push({
        id: `alert-lowstock-${lowStock.length}-${oos}`,
        title: `${lowStock.length} active SKU${lowStock.length > 1 ? 's' : ''} below threshold`,
        detail: oos > 0 ? `${oos} out of stock — restock recommended` : `Includes ${lowStock[0].name}`,
        icon: AlertTriangle,
        tone: 'text-amber-600 bg-amber-50',
        onClick: () => navigateWithProductFilter('low_stock'),
      });
    }

    const activePayout = state.payouts.find(
      (p) => p.status === 'in_transit' || p.status === 'processing'
    );
    if (activePayout && state.settings.notifications.payoutConfirmations) {
      items.push({
        id: `alert-payout-${activePayout.id}`,
        title: `Payout ${activePayout.reference} ${activePayout.status === 'in_transit' ? 'in transit' : 'processing'}`,
        detail: `${formatCurrency(activePayout.netAmount, state.settings.currency)} arriving ${activePayout.arrivalDate}`,
        icon: Wallet,
        tone: 'text-emerald-600 bg-emerald-50',
        onClick: () => setActiveSection('finance'),
      });
    }

    return items;
  }, [
    state.orders,
    state.products,
    state.payouts,
    state.settings.currency,
    state.settings.notifications,
    navigateWithOrderFilter,
    navigateWithProductFilter,
    setActiveSection,
  ]);

  const unreadCount = alerts.filter((a) => !state.readAlertIds.includes(a.id)).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-slate-900">
          {SECTION_TITLES[activeSection]}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Command Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700 sm:w-60 sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search orders, SKUs...</span>
          </span>
          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-xs font-semibold text-slate-900">
                  Operational Alerts ({alerts.length})
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'MARK_ALERTS_READ', payload: alerts.map((a) => a.id) })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  All caught up — no pending operational alerts.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {alerts.map((alert) => {
                    const Icon = alert.icon;
                    const unread = !state.readAlertIds.includes(alert.id);
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'MARK_ALERTS_READ', payload: [alert.id] });
                            alert.onClick();
                            setAlertsOpen(false);
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                            unread ? 'bg-teal-50/25' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${alert.tone}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-900">
                              <span className="truncate">{alert.title}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                              {alert.detail}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Merchant User Profile Chip */}
        <button
          type="button"
          onClick={() => setActiveSection('settings')}
          className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-slate-100"
          title="Account & Store Settings"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
            ER
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-xs font-medium leading-tight text-slate-800">
              Elena Rostova
            </span>
            <span className="block text-[10px] leading-tight text-slate-500">Owner</span>
          </span>
        </button>
      </div>
    </header>
  );
}
