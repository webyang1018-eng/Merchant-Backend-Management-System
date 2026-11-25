import { useRef, useState } from 'react';
import { Bell, CheckCheck, ExternalLink, PackagePlus, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { usePetWindowSync } from '../sync/usePetWindowSync';
import type { PetMood, PetSignalSnapshot, PetToMainIntent } from '../utils/merchantSignals';
import { formatCurrency } from '../utils/format';

interface PetCopy {
  connecting: string;
  idleStatus: string;
  sleepStatus: string;
  celebrateStatus: string;
  unfulfilledTag: string;
  refundTag: string;
  lowStockTag: string;
  openConsole: string;
  newOrder: string;
  payout: string;
  markRead: string;
  allClear: string;
  balanceLabel: string;
}

const COPY: Record<'en' | 'zh', PetCopy> = {
  en: {
    connecting: 'Syncing with store…',
    idleStatus: 'Store running smoothly',
    sleepStatus: 'Storefront paused',
    celebrateStatus: 'Action completed!',
    unfulfilledTag: 'To fulfill',
    refundTag: 'Refunds',
    lowStockTag: 'Low stock',
    openConsole: 'Open Console',
    newOrder: 'New Order',
    payout: 'Payouts',
    markRead: 'Mark read',
    allClear: 'No unread operational alerts',
    balanceLabel: 'Available',
  },
  zh: {
    connecting: '正在同步店铺状态…',
    idleStatus: '店铺运转正常',
    sleepStatus: '店铺维护中',
    celebrateStatus: '操作已完成！',
    unfulfilledTag: '待发货',
    refundTag: '退款待审',
    lowStockTag: '低库存',
    openConsole: '打开控制台',
    newOrder: '新建订单',
    payout: '财务结算',
    markRead: '全部已读',
    allClear: '暂无未读运营提醒',
    balanceLabel: '可提现',
  },
};

const MOOD_RING: Record<PetMood, string> = {
  idle: 'border-teal-500/80 bg-teal-50',
  alert: 'border-amber-500 bg-amber-50',
  urgent: 'border-rose-500 bg-rose-50',
  celebrating: 'border-emerald-500 bg-emerald-50',
  sleeping: 'border-slate-400 bg-slate-100',
};

function PetAvatar({ mood }: { mood: PetMood }) {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 drop-shadow-sm" aria-hidden="true">
      {/* Store awning ears / roof */}
      <path
        d="M14 24C14 14 22 8 32 8C42 8 50 14 50 24V44C50 51.732 43.732 58 36 58H28C20.268 58 14 51.732 14 44V24Z"
        fill="#0F766E"
      />
      <path
        d="M12 22C12 17 16 12 22 12H42C48 12 52 17 52 22C52 25 49.5 27 47 27C44.8 27 43 25.4 42.3 23.4C41.6 25.4 39.8 27 37.6 27C35.4 27 33.6 25.4 32.9 23.4C32.2 25.4 30.4 27 28.2 27C26 27 24.2 25.4 23.5 23.4C22.8 25.4 21 27 18.8 27C15.8 27 12 24.8 12 22Z"
        fill="#14B8A6"
      />
      {/* Face */}
      <rect x="20" y="30" width="24" height="19" rx="9" fill="#FFFFFF" />
      {mood === 'sleeping' ? (
        <>
          <path d="M24 38H29" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M35 38H40" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="43" r="1.5" fill="#64748B" />
        </>
      ) : mood === 'celebrating' ? (
        <>
          <path d="M24 38Q26.5 34.5 29 38" stroke="#0F766E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M35 38Q37.5 34.5 40 38" stroke="#0F766E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M28 42.5Q32 46 36 42.5" stroke="#0F766E" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="26.5" cy="38" r="2.2" fill="#0F172A" />
          <circle cx="37.5" cy="38" r="2.2" fill="#0F172A" />
          {mood === 'urgent' ? (
            <circle cx="32" cy="43.5" r="2" fill="#E11D48" />
          ) : (
            <path d="M29 43Q32 45.2 35 43" stroke="#0F766E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}

export function PetCompanionView({
  overrideSnapshot,
  onSendIntent,
}: {
  overrideSnapshot?: PetSignalSnapshot | null;
  onSendIntent?: (intent: PetToMainIntent) => void;
} = {}) {
  const syncTarget = usePetWindowSync();
  const snapshot = overrideSnapshot !== undefined ? overrideSnapshot : syncTarget.snapshot;
  const sendIntent = syncTarget.sendIntent;
  const startDragging = syncTarget.startDragging;
  const [panelOpen, setPanelOpen] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);

  const locale = snapshot?.locale ?? 'en';
  const copy = COPY[locale];
  const mood: PetMood = snapshot?.mood ?? 'idle';

  const dispatchIntent = (intent: PetToMainIntent) => {
    if (onSendIntent) {
      onSendIntent(intent);
    } else {
      void sendIntent(intent);
    }
  };

  const badgeCount = snapshot?.unreadAlertCount ?? 0;

  return (
    <div className="pointer-events-none flex h-screen w-screen flex-col items-end justify-end bg-transparent p-2 select-none">
      {/* Speech Bubble / Quick Action Popover */}
      {panelOpen && snapshot && (
        <div
          role="region"
          aria-label={snapshot.storeName}
          className="pointer-events-auto mb-2 w-72 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 text-xs text-slate-800 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">{snapshot.storeName}</div>
              <div className="text-[11px] text-slate-500">
                {snapshot.latestFeedback
                  ? snapshot.latestFeedback.title
                  : !snapshot.storefrontLive
                    ? copy.sleepStatus
                    : copy.idleStatus}
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-[10px] text-slate-400">{copy.balanceLabel}</div>
              <div className="font-semibold text-teal-700">
                {formatCurrency(snapshot.availableBalance, snapshot.currency)}
              </div>
            </div>
          </div>

          {/* Operational KPIs */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center tabular-nums">
            <button
              type="button"
              onClick={() => dispatchIntent({ type: 'OPEN_ORDER_FILTER', filter: 'to_fulfill' })}
              className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-1.5 py-1.5 transition-colors hover:border-blue-300 hover:bg-blue-50/60"
            >
              <div className="text-sm font-semibold text-blue-700">{snapshot.unfulfilledCount}</div>
              <div className="text-[10px] text-slate-500">{copy.unfulfilledTag}</div>
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchIntent({ type: 'OPEN_ORDER_FILTER', filter: 'refund_cancelled' })
              }
              className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-1.5 py-1.5 transition-colors hover:border-rose-300 hover:bg-rose-50/60"
            >
              <div className="text-sm font-semibold text-rose-600">
                {snapshot.refundRequestCount}
              </div>
              <div className="text-[10px] text-slate-500">{copy.refundTag}</div>
            </button>
            <button
              type="button"
              onClick={() => dispatchIntent({ type: 'OPEN_PRODUCT_FILTER', filter: 'low_stock' })}
              className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-1.5 py-1.5 transition-colors hover:border-amber-300 hover:bg-amber-50/60"
            >
              <div className="text-sm font-semibold text-amber-600">{snapshot.lowStockCount}</div>
              <div className="text-[10px] text-slate-500">{copy.lowStockTag}</div>
            </button>
          </div>

          {/* Live Alerts List */}
          <div className="mt-2.5">
            {snapshot.alerts.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center text-[11px] text-slate-500">
                {copy.allClear}
              </div>
            ) : (
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {snapshot.alerts.map((al) => (
                  <li key={al.id}>
                    <button
                      type="button"
                      onClick={() => {
                        dispatchIntent({ type: 'MARK_ALERTS_READ', alertIds: [al.id] });
                        if (al.action.type === 'order_filter') {
                          dispatchIntent({
                            type: 'OPEN_ORDER_FILTER',
                            filter: al.action.filter,
                          });
                        } else if (al.action.type === 'product_filter') {
                          dispatchIntent({
                            type: 'OPEN_PRODUCT_FILTER',
                            filter: al.action.filter,
                          });
                        } else {
                          dispatchIntent({
                            type: 'OPEN_MAIN_SECTION',
                            section: al.action.section,
                          });
                        }
                      }}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 ${
                        al.unread ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <Bell className="mt-0.5 h-3 w-3 shrink-0 text-teal-700" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium text-slate-900">
                          {al.title}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">
                          {al.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => dispatchIntent({ type: 'OPEN_MAIN_SECTION', section: 'overview' })}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-teal-800"
            >
              <ExternalLink className="h-3 w-3" />
              {copy.openConsole}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title={copy.newOrder}
                onClick={() =>
                  dispatchIntent({ type: 'TRIGGER_QUICK_ACTION', action: 'new_order' })
                }
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <ShoppingBag className="h-3 w-3" />
              </button>
              <button
                type="button"
                title={copy.payout}
                onClick={() => dispatchIntent({ type: 'OPEN_MAIN_SECTION', section: 'finance' })}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <Wallet className="h-3 w-3" />
              </button>
              {badgeCount > 0 && (
                <button
                  type="button"
                  title={copy.markRead}
                  onClick={() =>
                    dispatchIntent({
                      type: 'MARK_ALERTS_READ',
                      alertIds: snapshot.alerts.map((a) => a.id),
                    })
                  }
                  className="rounded-lg border border-slate-200 p-1.5 text-teal-700 hover:bg-teal-50"
                >
                  <CheckCheck className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Pet Mascot Button (supports drag + click toggle) */}
      <div className="pointer-events-auto relative flex items-center gap-2">
        {!panelOpen && snapshot?.latestFeedback && (
          <div className="max-w-44 truncate rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-emerald-800 shadow-md">
            <Sparkles className="mr-1 inline h-3 w-3 text-emerald-600" />
            {snapshot.latestFeedback.title}
          </div>
        )}
        {!panelOpen && !snapshot && (
          <div className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
            {copy.connecting}
          </div>
        )}

        <button
          type="button"
          aria-label="Mercato Pet"
          onPointerDown={(e) => {
            if (e.button === 0) {
              dragStartRef.current = { x: e.clientX, y: e.clientY, dragged: false };
            }
          }}
          onPointerMove={(e) => {
            const start = dragStartRef.current;
            if (!start || start.dragged) return;
            if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) {
              start.dragged = true;
              void startDragging();
            }
          }}
          onPointerUp={() => {
            if (dragStartRef.current?.dragged) {
              // Suppress click toggle after a window drag
              window.setTimeout(() => {
                dragStartRef.current = null;
              }, 0);
            }
          }}
          onClick={() => {
            if (dragStartRef.current?.dragged) {
              dragStartRef.current = null;
              return;
            }
            dragStartRef.current = null;
            setPanelOpen((v) => !v);
          }}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-105 ${MOOD_RING[mood]}`}
        >
          <PetAvatar mood={mood} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white tabular-nums">
              {badgeCount}
            </span>
          )}
          {mood === 'celebrating' && (
            <PackagePlus className="absolute -bottom-0.5 -left-0.5 h-4 w-4 text-emerald-600" />
          )}
        </button>
      </div>
    </div>
  );
}
