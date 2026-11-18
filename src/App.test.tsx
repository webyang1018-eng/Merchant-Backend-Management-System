// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

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
});
