import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Download, Zap } from 'lucide-react';
import { LedgerTypeBadge, PayoutStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useI18n } from '../i18n/I18nContext';
import { getLedgerTypeKey, getPayoutStatusKey } from '../i18n/translations';
import { useMerchant } from '../store/MerchantContext';
import type { CurrencyCode } from '../types/merchant';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  getCurrencySymbol,
} from '../utils/format';

export function FinancePage() {
  const { state, dispatch, quickAction, setQuickAction, pushToast } = useMerchant();
  const { locale, t, tc } = useI18n();
  const currency = state.settings.currency;

  const [tab, setTab] = useState<'payouts' | 'ledger'>('payouts');
  const [ledgerType, setLedgerType] = useState<'all' | 'charge' | 'refund' | 'payout'>('all');
  const [payoutOpen, setPayoutOpen] = useState(false);

  useEffect(() => {
    if (quickAction === 'request_payout') {
      setPayoutOpen(true);
      setQuickAction(null);
    }
  }, [quickAction, setQuickAction]);

  const metrics = useMemo(() => {
    const pendingSettlement = state.ledger
      .filter((e) => e.type === 'charge' && e.status === 'pending')
      .reduce((s, e) => s + e.net, 0);
    const paidOutTotal = state.payouts
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.netAmount, 0);
    const inTransitTotal = state.payouts
      .filter((p) => p.status === 'in_transit' || p.status === 'processing')
      .reduce((s, p) => s + p.netAmount, 0);
    return { pendingSettlement, paidOutTotal, inTransitTotal };
  }, [state.ledger, state.payouts]);

  const visibleLedger = useMemo(
    () => state.ledger.filter((e) => ledgerType === 'all' || e.type === ledgerType),
    [state.ledger, ledgerType]
  );

  const handleExport = () => {
    if (tab === 'payouts') {
      downloadCsv(
        'payout-history-2026-11-18.csv',
        [
          t('finance.colRef'),
          t('finance.colInitiated'),
          t('common.date'),
          t('finance.colDestMethod'),
          t('finance.colGross'),
          t('finance.colFee'),
          t('finance.colNetAmount'),
          t('common.status'),
        ],
        state.payouts.map((p) => [
          p.reference,
          p.initiatedAt,
          p.arrivalDate,
          `${p.destination} (${t(`payoutMethod.${p.method}`)})`,
          p.grossAmount.toFixed(2),
          p.fee.toFixed(2),
          p.netAmount.toFixed(2),
          t(getPayoutStatusKey(p.status)),
        ])
      );
    } else {
      downloadCsv(
        'transaction-ledger-2026-11-18.csv',
        [
          t('common.date'),
          t('finance.colType'),
          t('finance.colRef'),
          t('finance.colRefDesc'),
          t('finance.colGross'),
          t('finance.colFee'),
          t('finance.colNetImpact'),
        ],
        visibleLedger.map((e) => [
          e.createdAt,
          t(getLedgerTypeKey(e.type)),
          e.reference,
          tc(e.description),
          e.gross.toFixed(2),
          e.fee.toFixed(2),
          e.net.toFixed(2),
        ])
      );
    }
    pushToast(t('finance.toastExportTitle'), t('finance.toastExportDesc'), 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{t('finance.subtitle')}</p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t('finance.exportStatement')}
          </button>
          <button
            type="button"
            disabled={state.availableBalance <= 0}
            onClick={() => setPayoutOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800 disabled:opacity-50"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t('finance.requestPayout')}
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">{t('finance.kpiAvailable')}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(state.availableBalance, currency)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{state.settings.settlementBank}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">{t('finance.kpiPending')}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(metrics.pendingSettlement, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">{t('finance.kpiPendingHint')}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">{t('finance.kpiInTransit')}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-blue-700 tabular-nums">
            {formatCurrency(metrics.inTransitTotal, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('finance.kpiAutoCadence', {
              schedule: t(`schedule.${state.settings.autoPayoutSchedule}`),
            })}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">{t('finance.kpiPaidOut')}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700 tabular-nums">
            {formatCurrency(metrics.paidOutTotal, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            {t('finance.kpiPaidCount', {
              count: state.payouts.filter((p) => p.status === 'paid').length,
            })}
          </p>
        </div>
      </div>

      {/* Payouts & Ledger Tabs */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 pt-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab('payouts')}
              className={`border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === 'payouts'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('finance.tabPayouts', { count: state.payouts.length })}
            </button>
            <button
              type="button"
              onClick={() => setTab('ledger')}
              className={`border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === 'ledger'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('finance.tabLedger', { count: state.ledger.length })}
            </button>
          </div>

          {tab === 'ledger' && (
            <div className="pb-2">
              <select
                aria-label={t('finance.filterLedgerAria')}
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value as typeof ledgerType)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
              >
                <option value="all">{t('finance.ledgerAll')}</option>
                <option value="charge">{t('finance.ledgerCharges')}</option>
                <option value="refund">{t('finance.ledgerRefunds')}</option>
                <option value="payout">{t('finance.ledgerPayouts')}</option>
              </select>
            </div>
          )}
        </div>

        {tab === 'payouts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-3">{t('finance.colRef')}</th>
                  <th className="px-4 py-3">{t('finance.colInitiated')}</th>
                  <th className="px-4 py-3">{t('finance.colDestMethod')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">
                    {t('finance.colFee')}
                  </th>
                  <th className="px-5 py-3 text-right">{t('finance.colNetAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.payouts.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {po.reference}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                      <div className="text-slate-700">
                        {formatDate(po.initiatedAt, false, locale)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('finance.estArrival', { date: po.arrivalDate })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800">{po.destination}</div>
                      <div className="text-[11px] text-slate-400">
                        {t(`payoutMethod.${po.method}`)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <PayoutStatusBadge status={po.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-slate-500 whitespace-nowrap tabular-nums sm:table-cell">
                      {po.fee === 0 ? t('common.free') : formatCurrency(po.fee, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(po.netAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-3">{t('common.date')}</th>
                  <th className="px-4 py-3">{t('finance.colType')}</th>
                  <th className="px-4 py-3">{t('finance.colRefDesc')}</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">
                    {t('finance.colGross')}
                  </th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">
                    {t('finance.colFee')}
                  </th>
                  <th className="px-5 py-3 text-right">{t('finance.colNetImpact')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDate(entry.createdAt, true, locale)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <LedgerTypeBadge type={entry.type} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 tabular-nums">
                        {entry.reference}
                      </div>
                      <div className="text-[11px] text-slate-500">{tc(entry.description)}</div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-slate-600 whitespace-nowrap tabular-nums sm:table-cell">
                      {formatCurrency(entry.gross, currency, { signed: true })}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-slate-500 whitespace-nowrap tabular-nums md:table-cell">
                      {entry.fee > 0 ? `-${formatCurrency(entry.fee, currency)}` : '—'}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums ${
                        entry.net >= 0 ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(entry.net, currency, { signed: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      <RequestPayoutModal
        open={payoutOpen}
        available={state.availableBalance}
        bank={state.settings.settlementBank}
        currency={currency}
        onClose={() => setPayoutOpen(false)}
        onSubmit={(amount, method) => {
          dispatch({ type: 'REQUEST_PAYOUT', payload: { amount, method } });
          pushToast(
            t('finance.toastPayoutTitle'),
            t('finance.toastPayoutDesc', {
              amount: formatCurrency(amount, currency),
              method: t(`payoutMethod.${method}`),
            })
          );
          setPayoutOpen(false);
        }}
      />
    </div>
  );
}

function RequestPayoutModal({
  open,
  available,
  bank,
  currency,
  onClose,
  onSubmit,
}: {
  open: boolean;
  available: number;
  bank: string;
  currency: CurrencyCode;
  onClose: () => void;
  onSubmit: (amount: number, method: 'Standard ACH' | 'Instant Transfer') => void;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'Standard ACH' | 'Instant Transfer'>('Standard ACH');

  useEffect(() => {
    if (open) {
      setAmount(Math.min(5000, available).toFixed(2));
      setMethod('Standard ACH');
    }
  }, [open, available]);

  const numAmount = Math.max(0, Number(amount) || 0);
  const fee = method === 'Instant Transfer' ? Number((numAmount * 0.01).toFixed(2)) : 0;
  const net = Math.max(0, Number((numAmount - fee).toFixed(2)));
  const valid = numAmount > 0 && numAmount <= available;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payoutModal.title')}
      subtitle={t('payoutModal.subtitle', { bank })}
      maxWidth="sm"
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
            type="button"
            disabled={!valid}
            onClick={() => onSubmit(numAmount, method)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {t('payoutModal.submit', { amount: formatCurrency(net, currency) })}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-slate-700">
              {t('payoutModal.amountLabel', { sym: getCurrencySymbol(currency) })}
            </label>
            <button
              type="button"
              onClick={() => setAmount(available.toFixed(2))}
              className="text-[11px] font-medium text-teal-700 tabular-nums hover:underline"
            >
              {t('payoutModal.maxBtn', { amount: formatCurrency(available, currency) })}
            </button>
          </div>
          <input
            type="number"
            min="1"
            max={available}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
          />
          {numAmount > available && (
            <p className="mt-1 text-[11px] text-rose-600">{t('payoutModal.errExceed')}</p>
          )}
        </div>

        <div className="space-y-2">
          <span className="block font-medium text-slate-700">{t('payoutModal.speedLabel')}</span>
          <button
            type="button"
            onClick={() => setMethod('Standard ACH')}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
              method === 'Standard ACH'
                ? 'border-teal-600 bg-teal-50/40'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="font-semibold text-slate-900">{t('payoutModal.stdTitle')}</div>
              <div className="text-[11px] text-slate-500">{t('payoutModal.stdDesc')}</div>
            </div>
            <span className="font-semibold text-emerald-700">{t('common.free')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('Instant Transfer')}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
              method === 'Instant Transfer'
                ? 'border-teal-600 bg-teal-50/40'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {t('payoutModal.instTitle')}
              </div>
              <div className="text-[11px] text-slate-500">{t('payoutModal.instDesc')}</div>
            </div>
            <span className="font-medium text-slate-700 tabular-nums">
              {t('payoutModal.instFee')}
            </span>
          </button>
        </div>

        <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3 tabular-nums">
          <div className="flex justify-between text-slate-600">
            <span>{t('payoutModal.transferFee')}</span>
            <span>{fee === 0 ? t('common.free') : formatCurrency(fee, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <span>{t('payoutModal.netDeposit')}</span>
            <span>{formatCurrency(net, currency)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
