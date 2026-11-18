import { useEffect, useState } from 'react';
import { Copy, Edit3, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { PromoStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useMerchant } from '../store/MerchantContext';
import type { Promotion, PromotionStatus, PromotionType } from '../types/merchant';
import { formatCurrency, formatNumber, getCurrencySymbol } from '../utils/format';

export function PromotionsPage() {
  const { state, dispatch, quickAction, setQuickAction, pushToast } = useMerchant();
  const currency = state.settings.currency;

  const [statusFilter, setStatusFilter] = useState<'all' | PromotionStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  useEffect(() => {
    if (quickAction === 'new_promo') {
      setEditing(null);
      setModalOpen(true);
      setQuickAction(null);
    }
  }, [quickAction, setQuickAction]);

  const visible = state.promotions.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter
  );

  const activeCount = state.promotions.filter((p) => p.status === 'active').length;
  const totalRedemptions = state.promotions.reduce((s, p) => s + p.usageCount, 0);

  const formatBenefit = (p: Promotion) => {
    if (p.type === 'percentage') return `${p.value}% off`;
    if (p.type === 'fixed') return `${formatCurrency(p.value, currency)} off`;
    return 'Free shipping';
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback ignored in restricted sandboxes
    }
    pushToast(`Copied "${code}"`, 'Ready to share or apply in manual orders.', 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Configure coupon codes, minimum cart thresholds, and seasonal campaign caps.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Discount
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Active Codes</div>
          <div className="mt-1 text-xl font-semibold text-emerald-700 tabular-nums">
            {activeCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Total Redemptions</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {formatNumber(totalRedemptions)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Scheduled Campaigns</div>
          <div className="mt-1 text-xl font-semibold text-blue-700 tabular-nums">
            {state.promotions.filter((p) => p.status === 'scheduled').length}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-4 pt-2">
          {(['all', 'active', 'scheduled', 'paused', 'expired'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'all' ? 'All Codes' : st}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3">Code &amp; Campaign</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Usage</th>
                <th className="hidden px-4 py-3 md:table-cell">Valid Window</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No discount codes in this state.
                  </td>
                </tr>
              ) : (
                visible.map((promo) => {
                  const pct = promo.usageLimit
                    ? Math.min(100, Math.round((promo.usageCount / promo.usageLimit) * 100))
                    : null;
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-900">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(promo.code)}
                            aria-label={`Copy ${promo.code}`}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{promo.title}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-slate-900">{formatBenefit(promo)}</div>
                        <div className="text-[11px] text-slate-400">
                          Min. {formatCurrency(promo.minOrderAmount, currency)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PromoStatusBadge status={promo.status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                        <div className="text-slate-700">
                          {formatNumber(promo.usageCount)}
                          {promo.usageLimit ? ` / ${formatNumber(promo.usageLimit)}` : ' (unlimited)'}
                        </div>
                        {pct !== null && (
                          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3.5 text-slate-500 whitespace-nowrap tabular-nums md:table-cell">
                        {promo.startsAt} → {promo.endsAt}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'TOGGLE_PROMOTION', payload: { id: promo.id } });
                              pushToast(
                                promo.status === 'active'
                                  ? `Paused ${promo.code}`
                                  : `Activated ${promo.code}`
                              );
                            }}
                            title={promo.status === 'active' ? 'Pause code' : 'Activate code'}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            {promo.status === 'active' ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5 text-teal-700" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(promo);
                              setModalOpen(true);
                            }}
                            title="Edit promotion"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'DELETE_PROMOTION', payload: { id: promo.id } });
                              pushToast(`Deleted ${promo.code}`, undefined, 'info');
                            }}
                            title="Delete promotion"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PromoEditorModal
        open={modalOpen}
        promotion={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function PromoEditorModal({
  open,
  promotion,
  onClose,
}: {
  open: boolean;
  promotion: Promotion | null;
  onClose: () => void;
}) {
  const { state, dispatch, pushToast } = useMerchant();
  const sym = getCurrencySymbol(state.settings.currency);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PromotionType>('percentage');
  const [value, setValue] = useState('15');
  const [minOrderAmount, setMinOrderAmount] = useState('100');
  const [usageLimit, setUsageLimit] = useState('200');
  const [status, setStatus] = useState<PromotionStatus>('active');
  const [startsAt, setStartsAt] = useState('2026-11-18');
  const [endsAt, setEndsAt] = useState('2026-12-31');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (promotion) {
      setCode(promotion.code);
      setTitle(promotion.title);
      setType(promotion.type);
      setValue(String(promotion.value));
      setMinOrderAmount(String(promotion.minOrderAmount));
      setUsageLimit(promotion.usageLimit !== null ? String(promotion.usageLimit) : '');
      setStatus(promotion.status);
      setStartsAt(promotion.startsAt);
      setEndsAt(promotion.endsAt);
    } else {
      setCode('');
      setTitle('');
      setType('percentage');
      setValue('15');
      setMinOrderAmount('100');
      setUsageLimit('200');
      setStatus('active');
      setStartsAt('2026-11-18');
      setEndsAt('2026-12-31');
    }
  }, [open, promotion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode || !title.trim()) {
      setError('Coupon code and campaign title are required.');
      return;
    }
    const numVal = type === 'free_shipping' ? 0 : Math.max(0, Number(value) || 0);
    if (type === 'percentage' && (numVal <= 0 || numVal > 95)) {
      setError('Percentage discount must be between 1% and 95%.');
      return;
    }
    const base = {
      code: cleanCode,
      title: title.trim(),
      type,
      value: numVal,
      minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
      usageLimit: usageLimit.trim() ? Math.max(1, Math.floor(Number(usageLimit))) : null,
      status,
      startsAt,
      endsAt,
    };

    if (promotion) {
      dispatch({ type: 'UPDATE_PROMOTION', payload: { ...promotion, ...base } });
      pushToast(`Updated ${cleanCode}`, 'Promotion rules saved.');
    } else {
      dispatch({ type: 'ADD_PROMOTION', payload: base });
      pushToast(`Created ${cleanCode}`, 'Code is now ready for checkout.');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={promotion ? 'Edit Discount Code' : 'Create Discount Code'}
      subtitle="Define redemption rules and eligibility dates."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="promo-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {promotion ? 'Save Changes' : 'Create Discount'}
          </button>
        </>
      }
    >
      <form id="promo-form" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Coupon Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HOLIDAY20"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono uppercase text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PromotionStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">Campaign Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Winter Gifting Preview — 20% Off"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Discount Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromotionType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="percentage">Percentage off (%)</option>
              <option value="fixed">Fixed amount off ({sym})</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {type === 'percentage'
                ? 'Discount (%)'
                : type === 'fixed'
                  ? `Discount Amount (${sym})`
                  : 'Value'}
            </label>
            <input
              type="number"
              min="0"
              disabled={type === 'free_shipping'}
              value={type === 'free_shipping' ? '0' : value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Minimum Order ({sym})
            </label>
            <input
              type="number"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Usage Limit (leave blank for unlimited)
            </label>
            <input
              type="number"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Start Date</label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">End Date</label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
