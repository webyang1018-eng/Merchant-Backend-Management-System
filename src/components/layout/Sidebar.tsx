import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useMerchant } from '../../store/MerchantContext';
import type { NavSection } from '../../types/merchant';
import { deriveOperationalCounts } from '../../utils/merchantSignals';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { state, activeSection, setActiveSection } = useMerchant();
  const { t } = useI18n();

  const { actionableOrderCount: actionableOrders, lowStockCount } =
    deriveOperationalCounts(state);

  const primaryItems: {
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    badgeTone?: 'teal' | 'amber';
  }[] = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
    {
      id: 'orders',
      label: t('nav.orders'),
      icon: ShoppingBag,
      badge: actionableOrders > 0 ? actionableOrders : undefined,
      badgeTone: 'teal',
    },
    {
      id: 'products',
      label: t('nav.products'),
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeTone: 'amber',
    },
    { id: 'customers', label: t('nav.customers'), icon: Users },
    { id: 'promotions', label: t('nav.promotions'), icon: Tag },
  ];

  const secondaryItems: { id: NavSection; label: string; icon: typeof Wallet }[] = [
    { id: 'finance', label: t('nav.finance'), icon: Wallet },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleSelect = (id: NavSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Merchant Store Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200/80 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-xs">
            <Store className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {state.settings.storeName}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state.settings.storefrontLive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="truncate">
                {state.settings.storefrontLive ? t('app.storefrontLive') : t('app.maintenanceMode')}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t('app.closeNav')}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
        aria-label={t('app.mainNav')}
      >
        <div>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {t('nav.groupCommerce')}
          </div>
          <ul className="space-y-0.5">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50/90 text-teal-800'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-teal-700' : 'text-slate-400'
                        }`}
                        strokeWidth={1.9}
                      />
                      {item.label}
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          item.badgeTone === 'amber'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 ring-inset'
                            : isActive
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {t('nav.groupOperations')}
          </div>
          <ul className="space-y-0.5">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50/90 text-teal-800'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
                      strokeWidth={1.9}
                    />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Merchant Plan / Footer */}
      <div className="border-t border-slate-200/80 p-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70 ring-inset">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{t('app.consoleName')}</span>
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-slate-200">
              PRO
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-500 tabular-nums">
            {t('app.merchantId', { currency: state.settings.currency })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-slate-200/80">
        {navContent}
      </aside>

      {/* Mobile drawer sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 flex w-64 max-w-[82vw] flex-col border-r border-slate-200 shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
