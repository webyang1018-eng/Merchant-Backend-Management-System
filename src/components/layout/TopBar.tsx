import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Languages,
  Menu,
  RotateCcw,
  Search,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { getSectionTitleKey } from '../../i18n/translations';
import { useMerchant } from '../../store/MerchantContext';
import { deriveOperationalAlerts, type PetAlertKind } from '../../utils/merchantSignals';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

const ALERT_META: Record<PetAlertKind, { icon: typeof ShoppingBag; tone: string }> = {
  unfulfilled: { icon: ShoppingBag, tone: 'text-blue-600 bg-blue-50' },
  refund: { icon: RotateCcw, tone: 'text-rose-600 bg-rose-50' },
  low_stock: { icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50' },
  payout: { icon: Wallet, tone: 'text-emerald-600 bg-emerald-50' },
};

export function TopBar({ onOpenMobileMenu, onOpenSearch }: TopBarProps) {
  const {
    state,
    dispatch,
    activeSection,
    setActiveSection,
    navigateWithOrderFilter,
    navigateWithProductFilter,
  } = useMerchant();
  const { locale, setLocale, t } = useI18n();
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

  const alerts = useMemo(
    () => deriveOperationalAlerts(state, locale),
    [state, locale]
  );

  const unreadCount = alerts.filter((a) => a.unread).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label={t('app.openMenu')}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">
          {t(getSectionTitleKey(activeSection))}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Global Command Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700 sm:w-56 sm:justify-between sm:px-3"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="hidden truncate sm:inline">{t('topbar.searchPlaceholder')}</span>
          </span>
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Chinese / English Language Switcher */}
        <div
          role="group"
          aria-label={t('app.switchLanguage')}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 text-[11px] font-medium"
        >
          <Languages className="ml-1.5 mr-1 hidden h-3.5 w-3.5 text-slate-400 xl:block" />
          <button
            type="button"
            onClick={() => setLocale('en')}
            aria-pressed={locale === 'en'}
            className={`rounded-md px-2 py-1 transition-colors ${
              locale === 'en'
                ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale('zh')}
            aria-pressed={locale === 'zh'}
            className={`rounded-md px-2 py-1 transition-colors ${
              locale === 'zh'
                ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            中文
          </button>
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            aria-label={t('topbar.notificationsLabel')}
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
                  {t('topbar.alertsHeading', { count: alerts.length })}
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
                    {t('topbar.markAllRead')}
                  </button>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  {t('topbar.allCaughtUp')}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {alerts.map((alert) => {
                    const meta = ALERT_META[alert.kind];
                    const Icon = meta.icon;
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'MARK_ALERTS_READ', payload: [alert.id] });
                            if (alert.action.type === 'order_filter') {
                              navigateWithOrderFilter(alert.action.filter);
                            } else if (alert.action.type === 'product_filter') {
                              navigateWithProductFilter(alert.action.filter);
                            } else {
                              setActiveSection(alert.action.section);
                            }
                            setAlertsOpen(false);
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                            alert.unread ? 'bg-teal-50/25' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
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
          title={t('app.accountSettingsTitle')}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
            ER
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-xs font-medium leading-tight text-slate-800">
              Elena Rostova
            </span>
            <span className="block text-[10px] leading-tight text-slate-500">
              {t('role.Owner')}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
