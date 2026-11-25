import { useEffect, useState } from 'react';
import { CommandPalette } from './components/layout/CommandPalette';
import { Sidebar } from './components/layout/Sidebar';
import { ToastViewport } from './components/layout/ToastViewport';
import { TopBar } from './components/layout/TopBar';
import { OrderDetailDrawer } from './components/orders/OrderDetailDrawer';
import { CustomersPage } from './pages/CustomersPage';
import { FinancePage } from './pages/FinancePage';
import { OrdersPage } from './pages/OrdersPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { I18nProvider, type Locale } from './i18n/I18nContext';
import { MerchantProvider, useMerchant } from './store/MerchantContext';
import { useMainWindowPetSync } from './sync/useMainWindowPetSync';

function MerchantConsoleShell() {
  const { activeSection } = useMerchant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useMainWindowPetSync();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-900">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-60">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeSection === 'overview' && <OverviewPage />}
          {activeSection === 'orders' && <OrdersPage />}
          {activeSection === 'products' && <ProductsPage />}
          {activeSection === 'customers' && <CustomersPage />}
          {activeSection === 'promotions' && <PromotionsPage />}
          {activeSection === 'finance' && <FinancePage />}
          {activeSection === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Global Order Inspection Drawer (accessible from Overview, Orders, Customers & Search) */}
      <OrderDetailDrawer />

      {/* Global Command Search (⌘K / Ctrl+K) */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Subtle Toast Notifications */}
      <ToastViewport />
    </div>
  );
}

export default function App({ initialLocale }: { initialLocale?: Locale } = {}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <MerchantProvider>
        <MerchantConsoleShell />
      </MerchantProvider>
    </I18nProvider>
  );
}
