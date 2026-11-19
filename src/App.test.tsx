// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { en, translateContent, zh, type TranslationKey } from './i18n/translations';

describe('Merchant Backend Console UI integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Overview KPIs, switches date ranges & chart mode, and navigates action queues', () => {
    render(<App />);

    expect(screen.getAllByText('Harbor & Loom').length).toBeGreaterThan(0);
    expect(screen.getByText('Gross Revenue')).toBeTruthy();
    expect(screen.getByText('Completed Orders')).toBeTruthy();
    expect(screen.getByText('Available Payout')).toBeTruthy();

    // Switch range to 7D and 12M
    fireEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(screen.getByText('vs. previous 7D period')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '12M' }));
    expect(screen.getByText('vs. previous 12M period')).toBeTruthy();

    // Open Action Queue -> Orders to fulfill
    fireEvent.click(screen.getByRole('button', { name: /Orders to fulfill/i }));
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeTruthy();
    expect(screen.getByText('#HL-1048')).toBeTruthy();
  });

  it('fulfills an order from the Order Detail Drawer and supports global Ctrl+K search', () => {
    render(<App />);

    // Click order #HL-1048 in Recent Orders
    fireEvent.click(screen.getByText('#HL-1048'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Fulfill & Dispatch Shipment/i)).toBeTruthy();

    // Auto-generate tracking & ship
    fireEvent.click(within(dialog).getByRole('button', { name: /Generate/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Mark as Shipped/i }));
    expect(within(dialog).getByText(/In Transit via DHL Express/i)).toBeTruthy();

    // Mark delivered
    fireEvent.click(within(dialog).getByRole('button', { name: /Mark Delivered/i }));
    expect(within(dialog).getByText('Delivered')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close panel' }));

    // Open Command Palette via Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(
      screen.getByPlaceholderText(/Search orders \(#HL-1048\), products, SKUs/i)
    ).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('navigates across Products, Customers, Promotions, Finance, and Settings workflows', () => {
    render(<App />);

    // Products: add product
    fireEvent.click(screen.getByRole('button', { name: /^Products/i }));
    expect(screen.getByRole('heading', { name: 'Products & Inventory' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add Product/i }));
    const prodModal = screen.getByRole('dialog');
    fireEvent.change(
      within(prodModal).getByPlaceholderText(/Cashmere Ribbed Beanie/i),
      { target: { value: 'Selvedge Denim Apron' } }
    );
    fireEvent.click(within(prodModal).getByRole('button', { name: 'Create Product' }));
    expect(screen.getByText('Selvedge Denim Apron')).toBeTruthy();

    // Customers: inspect VIP profile
    fireEvent.click(screen.getByRole('button', { name: 'Customers' }));
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeTruthy();
    fireEvent.click(screen.getByText('Marcus Vance'));
    expect(screen.getByText('Corporate Gifting')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

    // Promotions: view codes and toggle
    fireEvent.click(screen.getByRole('button', { name: 'Promotions' }));
    expect(screen.getByText('AUTUMN20')).toBeTruthy();
    expect(screen.getByText('BFCM25')).toBeTruthy();

    // Finance: request payout
    fireEvent.click(screen.getByRole('button', { name: 'Finance & Payouts' }));
    expect(screen.getByText('Available to Pay Out')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Request Payout' }));
    const poModal = screen.getByRole('dialog');
    fireEvent.click(within(poModal).getByRole('button', { name: /Withdraw \$5,000\.00/i }));
    expect(screen.getByText('$9,820.50')).toBeTruthy();

    // Settings: update store currency to SGD and inspect Team tab
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByDisplayValue('USD ($) — US Dollar'), {
      target: { value: 'SGD' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Store Profile' }));
    expect(screen.getByText(/ID: MCH-88412 · SGD/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Team & Roles' }));
    expect(screen.getByText('Aaron Koh')).toBeTruthy();
  });

  it('maintains 100% key and placeholder parity between English and Chinese dictionaries', () => {
    const enKeys = Object.keys(en).sort() as TranslationKey[];
    const zhKeys = Object.keys(zh).sort() as TranslationKey[];
    expect(zhKeys).toEqual(enKeys);

    const extractTokens = (str: string) =>
      Array.from(str.matchAll(/\{(\w+)\}/g))
        .map((m) => m[1])
        .sort();

    for (const key of enKeys) {
      expect(zh[key].trim().length).toBeGreaterThan(0);
      expect(extractTokens(zh[key])).toEqual(extractTokens(en[key]));
    }

    expect(translateContent('Order placed via Online Store', 'zh')).toBe('通过官方商城提交订单');
    expect(translateContent('Order placed via Online Store', 'en')).toBe(
      'Order placed via Online Store'
    );
  });

  it('switches cleanly between English and Simplified Chinese across all modules and persists preference', () => {
    const { unmount } = render(<App />);

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Mercato — Merchant Backend Console');

    // Click 中文 in the top bar language switcher
    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.title).toBe('Mercato — 商户后台管理系统');
    expect(localStorage.getItem('mercato_locale_v1')).toBe('zh');

    // Overview localized
    expect(screen.getByRole('heading', { name: '经营总览' })).toBeTruthy();
    expect(screen.getByText('总交易额 (GMV)')).toBeTruthy();
    expect(screen.getByText('可提现余额')).toBeTruthy();
    expect(screen.getByText('头层牛皮短途旅行袋')).toBeTruthy();

    // Notifications popover localized
    fireEvent.click(screen.getByRole('button', { name: '消息通知' }));
    expect(screen.getByText(/待办运营提醒/)).toBeTruthy();

    // Orders + Order Detail Drawer localized
    fireEvent.click(screen.getByRole('button', { name: /^订单管理/ }));
    expect(screen.getByRole('heading', { name: '订单管理' })).toBeTruthy();
    fireEvent.click(screen.getByText('#HL-1048'));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('录入物流并安排发货')).toBeTruthy();
    expect(within(drawer).getByText('通过官方商城提交订单')).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: '关闭侧栏' }));

    // Products, Customers, Promotions, Finance, Settings localized
    fireEvent.click(screen.getByRole('button', { name: /^商品库存/ }));
    expect(screen.getByRole('heading', { name: '商品与库存管理' })).toBeTruthy();
    expect(screen.getByText('库存零售总货值')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '客户管理' }));
    expect(screen.getByText('客户复购率')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '营销优惠' }));
    expect(screen.getByText('秋季焕新精选 — 8 折特惠')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '财务与结算' }));
    expect(screen.getByText('待结算货款')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /资金收支明细/ }));
    expect(screen.getByText(/Apple Pay 订单收款 — Clara Tan/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '店铺设置' }));
    expect(screen.getByText('店铺资料与语言区域')).toBeTruthy();

    // Verify persistence after remount, then switch back to English via Settings selector
    unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: '经营总览' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '店铺设置' }));
    fireEvent.change(screen.getByLabelText('后台界面语言'), { target: { value: 'en' } });
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('heading', { name: 'Store Settings' })).toBeTruthy();
  });
});
