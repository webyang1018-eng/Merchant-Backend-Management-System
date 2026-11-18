import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Download, Zap } from 'lucide-react';
import { Badge, PayoutStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useMerchant } from '../store/MerchantContext';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  getCurrencySymbol,
} from '../utils/format';

export function FinancePage() {
  const { state, dispatch, quickAction, setQuickAction, pushToast } = useMerchant();
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
        ['Reference', 'Initiated', 'Arrival Date', 'Destination', 'Method', 'Gross', 'Fee', 'Net', 'Status'],
        state.payouts.map((p) => [
          p.reference,
          p.initiatedAt,
          p.arrivalDate,
          p.destination,
          p.method,
          p.grossAmount.toFixed(2),
          p.fee.toFixed(2),
          p.netAmount.toFixed(2),
          p.status,
        ])
      );
    } else {
      downloadCsv(
        'transaction-ledger-2026-11-18.csv',
        ['Timestamp', 'Type', 'Reference', 'Description', 'Gross', 'Fee', 'Net', 'Status'],
        visibleLedger.map((e) => [
          e.createdAt,
          e.type,
          e.reference,
          e.description,
          e.gross.toFixed(2),
          e.fee.toFixed(2),
          e.net.toFixed(2),
          e.status,
        ])
      );
    }
    pushToast('Financial statement exported', 'CSV downloaded to your device.', 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Monitor merchant balances, settlement schedules, processing fees, and bank payouts.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Statement
          </button>
          <button
            type="button"
            disabled={state.availableBalance <= 0}
            onClick={() => setPayoutOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800 disabled:opacity-50"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Request Payout
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Available to Pay Out</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(state.availableBalance, currency)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{state.settings.settlementBank}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Pending Settlement</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(metrics.pendingSettlement, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Clears automatically on order delivery
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Payouts In Transit</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-blue-700 tabular-nums">
            {formatCurrency(metrics.inTransitTotal, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 capitalize">
            Auto-payout cadence: {state.settings.autoPayoutSchedule}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Recent Settled Payouts</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700 tabular-nums">
            {formatCurrency(metrics.paidOutTotal, currency)}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            Across {state.payouts.filter((p) => p.status === 'paid').length} completed transfers
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
              Bank Payouts ({state.payouts.length})
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
              Transaction Ledger ({state.ledger.length})
            </button>
          </div>

          {tab === 'ledger' && (
            <div className="pb-2">
              <select
                aria-label="Filter ledger entry type"
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value as typeof ledgerType)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
              >
                <option value="all">All entry types</option>
                <option value="charge">Charges</option>
                <option value="refund">Refunds</option>
                <option value="payout">Payouts</option>
              </select>
            </div>
          )}
        </div>

        {tab === 'payouts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-4 py-3">Initiated</th>
                  <th className="px-4 py-3">Destination &amp; Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Fee</th>
                  <th className="px-5 py-3 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.payouts.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {po.reference}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                      <div className="text-slate-700">{formatDate(po.initiatedAt)}</div>
                      <div className="text-[11px] text-slate-400">Est. arrival {po.arrivalDate}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800">{po.destination}</div>
                      <div className="text-[11px] text-slate-400">{po.method}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <PayoutStatusBadge status={po.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-slate-500 whitespace-nowrap tabular-nums sm:table-cell">
                      {po.fee === 0 ? 'Free' : formatCurrency(po.fee, currency)}
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
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reference &amp; Description</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Gross</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">Fee</th>
                  <th className="px-5 py-3 text-right">Net Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDate(entry.createdAt, true)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge
                        tone={
                          entry.type === 'charge'
                            ? 'emerald'
                            : entry.type === 'refund'
                              ? 'rose'
                              : 'blue'
                        }
                      >
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 tabular-nums">
                        {entry.reference}
                      </div>
                      <div className="text-[11px] text-slate-500">{entry.description}</div>
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
            'Payout initiated',
            `${formatCurrency(amount, currency)} sent via ${method}.`
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
  currency: 'USD' | 'SGD' | 'EUR' | 'GBP';
  onClose: () => void;
  onSubmit: (amount: number, method: 'Standard ACH' | 'Instant Transfer') => void;
}) {
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
      title="Withdraw Available Balance"
      subtitle={`Settle funds to ${bank}`}
      maxWidth="sm"
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
            type="button"
            disabled={!valid}
            onClick={() => onSubmit(numAmount, method)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            Withdraw {formatCurrency(net, currency)}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-slate-700">
              Payout Amount ({getCurrencySymbol(currency)})
            </label>
            <button
              type="button"
              onClick={() => setAmount(available.toFixed(2))}
              className="text-[11px] font-medium text-teal-700 hover:underline tabular-nums"
            >
              Max: {formatCurrency(available, currency)}
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
            <p className="mt-1 text-[11px] text-rose-600">
              Amount exceeds available merchant balance.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <span className="block font-medium text-slate-700">Transfer Speed</span>
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
              <div className="font-semibold text-slate-900">Standard Bank Transfer</div>
              <div className="text-[11px] text-slate-500">Arrives in 1–2 business days</div>
            </div>
            <span className="font-semibold text-emerald-700">Free</span>
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
                Instant Settlement
              </div>
              <div className="text-[11px] text-slate-500">Arrives within 30 minutes</div>
            </div>
            <span className="font-medium text-slate-700 tabular-nums">1.0% fee</span>
          </button>
        </div>

        <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3 tabular-nums">
          <div className="flex justify-between text-slate-600">
            <span>Transfer fee</span>
            <span>{fee === 0 ? 'Free' : formatCurrency(fee, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <span>Net bank deposit</span>
            <span>{formatCurrency(net, currency)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
