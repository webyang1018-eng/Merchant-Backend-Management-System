import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMerchant } from '../../store/MerchantContext';
import { formatCurrency } from '../../utils/format';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const {
    state,
    setActiveSection,
    setInspectOrderId,
    setInspectCustomerId,
    setQuickAction,
  } = useMerchant();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const orders = state.orders
      .filter(
        (o) =>
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      )
      .slice(0, q ? 5 : 3);

    const products = state.products
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, q ? 5 : 3);

    const customers = q
      ? state.customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              c.city.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    return { orders, products, customers };
  }, [state.orders, state.products, state.customers, q]);

  if (!open) return null;

  const quickActions = [
    {
      label: 'Create manual order',
      icon: Plus,
      run: () => {
        setActiveSection('orders');
        setQuickAction('new_order');
        onClose();
      },
    },
    {
      label: 'Add new product',
      icon: Package,
      run: () => {
        setActiveSection('products');
        setQuickAction('new_product');
        onClose();
      },
    },
    {
      label: 'Create discount code',
      icon: Tag,
      run: () => {
        setActiveSection('promotions');
        setQuickAction('new_promo');
        onClose();
      },
    },
    {
      label: 'Request balance payout',
      icon: Wallet,
      run: () => {
        setActiveSection('finance');
        setQuickAction('request_payout');
        onClose();
      },
    },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  const isEmpty =
    quickActions.length === 0 &&
    results.orders.length === 0 &&
    results.products.length === 0 &&
    results.customers.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders (#HL-1048), products, SKUs, customers, or actions..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto p-3">
          {isEmpty && (
            <div className="py-10 text-center text-sm text-slate-500">
              No results matching &ldquo;{query}&rdquo;
            </div>
          )}

          {quickActions.length > 0 && (
            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Quick Actions
              </div>
              <div className="space-y-0.5">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.label}
                      type="button"
                      onClick={act.run}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-800"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-teal-700" />
                        {act.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {results.orders.length > 0 && (
            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Orders
              </div>
              <div className="space-y-0.5">
                {results.orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setActiveSection('orders');
                      setInspectOrderId(order.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {order.orderNumber}
                      </span>
                      <span className="text-slate-500">{order.customerName}</span>
                    </span>
                    <span className="font-medium text-slate-700 tabular-nums">
                      {formatCurrency(order.total, state.settings.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.products.length > 0 && (
            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Products
              </div>
              <div className="space-y-0.5">
                {results.products.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setActiveSection('products');
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-slate-900">{prod.name}</span>
                      <span className="shrink-0 text-slate-400 tabular-nums">{prod.sku}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-slate-600 tabular-nums">
                      {prod.stock} in stock
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.customers.length > 0 && (
            <div>
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Customers
              </div>
              <div className="space-y-0.5">
                {results.customers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setActiveSection('customers');
                      setInspectCustomerId(cust.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-900">{cust.name}</span>
                      <span className="text-slate-400">{cust.email}</span>
                    </span>
                    <span className="text-slate-500">{cust.city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
