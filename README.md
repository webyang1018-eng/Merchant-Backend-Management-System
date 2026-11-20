# Merchant Backend Management System

**Mercato** is a browser-based back office for **Harbor & Loom**, a sample store. It uses React 19, TypeScript, Vite, and Tailwind CSS 4. You can manage inventory, fulfill orders, and see how each sale affects the store's balance.

This is a front-end demo, not a backend service. There is no backend API, database, or sign-in. Recording a payment, generating a tracking number, requesting a payout, or inviting a staff member changes local demo data only.

## Run locally

Use npm and a Node.js version supported by the locked jsdom test dependency: 22.22.2 or later on 22.x, 24.15.0 or later on 24.x, or 26+. From the repository root:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (default: <http://localhost:5173>). On first launch you'll see the store's **Overview**, already populated with sample orders and products.

## Try it: fulfill a sample order

1. In **Overview → Recent Orders**, open `#HL-1048`. The order is already paid and its status is **To Fulfill**.
2. Select **Generate** to fill in a tracking number, then **Mark as Shipped**. In the same drawer, select **Mark Delivered**.
3. Close the drawer and open **Finance & Payouts**. Delivery moves this order's net charge of $416.71 from **Pending Settlement** to **Available to Pay Out**. Open **Transaction Ledger** to see the gross charge, fee, and net amount under the same order number.

## Console sections

| Section | What you can do |
| --- | --- |
| Overview | Compare revenue and order volume over 7D, 30D, 90D, or 12M; inspect channel mix, top products, and the action queue. |
| Orders | Create manual orders with automatic stock deductions and optional promo codes. Filter orders by status, record payments, ship in batches, add notes, and optionally restock on cancellation or refund. |
| Products & Inventory | Add products with generated SKUs, check unit profit and margin, adjust stock, find low-stock items, and change catalog status in bulk. |
| Customers | Create profiles, filter by segment (VIP, Returning, New, At Risk), review spend and linked orders, and edit tags and notes. |
| Promotions | Create percentage, fixed-amount, or free-shipping codes. Set minimum spend and usage limits, track redemptions, and pause or resume codes. |
| Finance & Payouts | Inspect balances, payout history, and the ledger. Request a simulated standard ACH payout or an instant transfer with a 1% fee. |
| Settings | Edit the store profile, shipping zones, tax rules, storefront status, and alerts. Staff roles are demo records, not access controls. |

Use **Ctrl+K** (**⌘K** on macOS) to search orders, products, SKUs, or customers and launch quick actions. The header bell links to orders to fulfill, refund requests, low stock, and pending payouts. Export CSVs with localized headers from Orders, Products, Customers, or Finance & Payouts.

## Local data and language

Edits survive reloads in the same browser. The app uses two `localStorage` keys per origin, so the dev server and build preview on different ports have separate data:

- `mercato_merchant_state_v1` holds the merchant records and store settings. To start over, select **Settings → Alerts & Data → Reset Demo Data**. This immediately replaces your edits with the sample store but keeps your language choice.
- `mercato_locale_v1` holds `en` or `zh`. With no saved choice, a browser language starting with `zh` selects Simplified Chinese; otherwise the console uses English. Switch using **EN / 中文** in the top bar, **Settings → Store Profile**, or the command palette.

Store currency is separate from console language. Choosing USD, CNY, SGD, EUR, or GBP changes the displayed currency, not the underlying amounts.

## Checks and production build

```sh
npm test           # Run the Vitest suites once
npm run typecheck  # Check app and Vite config types without building
npm run build      # Type-check and write the static site to dist/
npm run preview    # Serve that build locally (default: http://localhost:4173)
```

## Source guide

- **Interface:** [App.tsx](src/App.tsx) selects the active [page](src/pages) and mounts the shared order drawer and command palette. These, the revenue chart, and layout elements live in [components](src/components).
- **Data flow:** [MerchantContext](src/store/MerchantContext.tsx) loads and persists [merchant state](src/types/merchant.ts). Pages dispatch actions to the [merchant reducer](src/store/merchantReducer.ts), which updates related records together (for example, creating an order reduces stock and counts a coupon redemption if a code was applied). [seedData.ts](src/data/seedData.ts) supplies the initial records and chart baselines.
- **Localization:** Keep keys and `{placeholders}` in sync in the [English and Chinese dictionaries](src/i18n/translations.ts). [I18nContext](src/i18n/I18nContext.tsx) updates the document title and `<html lang>` when the locale changes; [format.ts](src/utils/format.ts) contains date, currency, and CSV helpers.
- **Tests:** [Reducer tests](src/store/merchantReducer.test.ts) exercise commerce calculations and state transitions. [UI tests](src/App.test.tsx) exercise merchant workflows, language switching, and dictionary parity with Vitest and React Testing Library.
