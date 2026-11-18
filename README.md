# Merchant Backend Management System

A full-featured merchant backend console built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Features

- **Executive Overview**: Time-range analytics (`7D`, `30D`, `90D`, `12M`), interactive SVG revenue and order volume chart, channel attribution breakdown, operational action queue, recent orders, and top products.
- **Order Management & Fulfillment**: Status filtering, search, batch shipping, CSV export, manual order creation (with live promo code & inventory deduction), and an order inspection drawer supporting payment capture, shipment tracking, delivery confirmation, refunds/cancellations (with optional restock), and staff timeline notes.
- **Products & Inventory**: Catalog CRUD with SKU auto-generation, real-time gross margin and unit profit calculation, low/out-of-stock filtering, quick inventory adjustments, bulk actions, and CSV export.
- **Customer CRM**: Segment filtering (`VIP`, `Returning`, `New`, `At Risk`), lifetime spend & order metrics, new customer creation, editable tags & account notes, and linked order history.
- **Promotions & Coupons**: Percentage, fixed-amount, and free-shipping discount codes with redemption progress bars, validity dates, pause/resume controls, and one-click code copy.
- **Finance & Payouts**: Available balance, pending settlement tracking, standard and instant bank withdrawal workflow, payout history, transaction ledger, and CSV statement export.
- **Bilingual Internationalization (中文 / English)**: Instant `EN` / `中文` switching from the top bar, store settings, or command palette (`⌘K`), strongly typed translation dictionaries with full placeholder parity, browser language detection, `localStorage` persistence, `<html lang>` & page title updates, and locale-aware dates, compact currency units, chart labels, CSV headers, and operational statuses.
- **Store Settings & RBAC**: Store profile, console language (`English` / `简体中文`) & currency localization (`USD`, `CNY`, `SGD`, `EUR`, `GBP`), storefront live/maintenance toggle, configurable tax and regional shipping zones, staff invites & role management, operational alert toggles, and demo data reset.
- **Global Productivity**: Command palette (`⌘K` / `Ctrl+K`), actionable header alert center, and automatic `localStorage` persistence.

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Start development server on port `5173`
- `npm run build` — Type-check and build production bundle
- `npm run preview` — Preview production build
- `npm test` — Run Vitest unit tests
- `npm run typecheck` — Run TypeScript compiler checks
