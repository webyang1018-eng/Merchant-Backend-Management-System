# Merchant Backend Management System

A merchant back-office console for running an online store — orders, catalog, customers, promotions, payouts, and store settings — built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**. The interface is fully bilingual (English / 简体中文) and is branded **Mercato** in the UI.

> **This is a front-end-only demo.** There is no server, API, or login. The app runs entirely in the browser against seeded data for a fictional store (*Harbor & Loom*) and saves your changes to `localStorage`. See [Demo data and limitations](#demo-data-and-limitations).

## Features

- **Overview** — KPI cards (gross revenue, completed orders, average order value, available payout) for `7D` / `30D` / `90D` / `12M` ranges, an interactive SVG chart that switches between revenue and order volume, sales by channel, an action queue (orders to fulfill, low stock, refund requests), recent orders, and top products.
- **Orders** — Status tabs, search, channel filter, sorting, batch shipping, and CSV export. Manual order creation with live totals, promo-code validation, and stock deduction. An order drawer handles payment confirmation, shipping with carrier and tracking number, delivery, refund or cancellation (with optional restock), and internal notes on the activity timeline.
- **Products & Inventory** — Create, edit, and delete products with SKU generation and duplicate-SKU checks, live unit profit and margin, status / category / stock-level filters, quick stock adjustments, bulk status changes, and CSV export.
- **Customers** — Segment filter (`VIP`, `Returning`, `New`, `At Risk`), lifetime spend and order metrics, an add-customer form, a profile drawer with editable segment, tags, and notes plus linked order history, and CSV export.
- **Promotions** — Percentage, fixed-amount, and free-shipping codes with a minimum order amount, usage limit and redemption progress, validity dates, pause / resume, edit / delete, and copy-to-clipboard.
- **Finance & Payouts** — Available balance, pending settlement, payouts in transit, standard or instant payout requests, payout history, a filterable transaction ledger, and CSV export.
- **Settings** — Store profile, console language, display currency (`USD`, `CNY`, `SGD`, `EUR`, `GBP`), storefront live / maintenance flag, tax rate and free-shipping threshold, shipping zones, team invitations and role assignment, alert toggles, and demo-data reset.
- **Across the console** — Command palette (`⌘K` / `Ctrl+K`) for search and quick actions, a header alert center that jumps to the relevant filtered view, toast notifications, a responsive layout with a mobile navigation drawer, and automatic persistence.
- **English / 简体中文** — Switch from the top bar, Settings, or the command palette. Labels, statuses, dates, compact currency units, chart labels, CSV headers, and the built-in demo content are all localized. See [Internationalization](#internationalization).

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19 (function components and hooks) |
| Language | TypeScript 5.7, `strict` mode |
| Dev server and bundler | Vite 6 with `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` (utility classes inline; no `tailwind.config` file) |
| Icons and font | `lucide-react`; Inter Variable, self-hosted via `@fontsource-variable/inter` |
| State | React Context + `useReducer` — no state library and no router |
| Charts | Hand-written SVG — no chart library |
| Tests | Vitest 3, React Testing Library, jsdom |

## Getting started

**Prerequisites:** Node.js and npm. Use Node.js 22 (22.22.2 or newer) or 24 (24.15 or newer) — the range required by `jsdom`, which the UI tests run on. The dev server and production build on their own need only Node.js 20 or 22+.

```bash
git clone https://github.com/webyang1018-eng/Merchant-Backend-Management-System.git
cd Merchant-Backend-Management-System
npm install
npm run dev
```

Then open <http://localhost:5173>. No environment variables or other setup are needed.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server with hot reload on port `5173` |
| `npm run build` | Type-checks (`tsc -b`), then writes the production bundle to `dist/` |
| `npm run preview` | Serves the built `dist/` on port `4173` (run `npm run build` first) |
| `npm test` | Runs the Vitest suite once |
| `npm run typecheck` | Runs the TypeScript compiler without emitting, for both the app and `vite.config.ts` |

### Deploying

`npm run build` produces a fully static site in `dist/` that can be served by any static host. Asset URLs are root-relative (`/assets/…`), so to serve the app from a sub-path, set Vite's [`base`](https://vite.dev/config/shared-options.html#base) option in `vite.config.ts`.

### Dev server exposure

`vite.config.ts` binds the dev and preview servers to `0.0.0.0` and sets `allowedHosts: true`, which turns off Vite's `Host` header check so the app can be opened through container or cloud-preview URLs. Restrict `allowedHosts` if you run the dev server on a network you don't trust.

## Project structure

```text
.
├── index.html                      # Vite entry HTML
├── package.json                    # Scripts and dependencies
├── vite.config.ts                  # Plugins, dev/preview server, vendor chunk splitting
├── tsconfig.json                   # Project references → tsconfig.app.json (src), tsconfig.node.json (vite.config.ts)
├── public/favicon.svg
└── src/
    ├── main.tsx                    # React root
    ├── App.tsx                     # Providers, console shell, section switching, ⌘K listener
    ├── App.test.tsx                # UI integration tests (jsdom)
    ├── index.css                   # Tailwind import, font stack, base styles
    ├── types/merchant.ts           # Domain types (Product, Order, Customer, Promotion, Payout, …)
    ├── data/seedData.ts            # Demo dataset and the analytics series generator
    ├── store/
    │   ├── merchantReducer.ts      # All business logic, as reducer actions
    │   ├── merchantReducer.test.ts # Reducer and calculation unit tests
    │   └── MerchantContext.tsx     # Provider: state, localStorage sync, navigation, toasts
    ├── i18n/
    │   ├── translations.ts         # en / zh dictionaries, demo-content translation, enum → key helpers
    │   └── I18nContext.tsx         # Provider and the useI18n() hook
    ├── utils/format.ts             # Currency and date formatting, margin and promo math, CSV download
    ├── components/
    │   ├── layout/                 # Sidebar, TopBar, CommandPalette, ToastViewport
    │   ├── orders/                 # OrderDetailDrawer (mounted once, opened from anywhere)
    │   ├── charts/                 # RevenueChart
    │   └── ui/                     # Badge, Drawer, Modal, ProductSwatch
    └── pages/                      # One file per section: Overview, Orders, Products, Customers,
                                    # Promotions, Finance, Settings
```

## Architecture

### Shell and navigation

`App` wraps the console in two providers: `I18nProvider` (locale and translation functions), then `MerchantProvider` (store data and UI coordination). Components read them through the `useI18n()` and `useMerchant()` hooks.

There is no router. The visible page is the `activeSection` value held in `MerchantProvider`, so sections have no URLs and a reload returns to Overview. Cross-page flows go through the same context:

- `navigateWithOrderFilter()` / `navigateWithProductFilter()` — switch page and pre-apply a filter (used by the action queue and header alerts).
- `setInspectOrderId()` / `setInspectCustomerId()` — open the order or customer drawer.
- `setQuickAction()` — open a create dialog on the target page (used by the command palette).

### State

All store data lives in a single `MerchantState` object managed by `useReducer`. Every change is one of the 29 `MerchantAction` types handled in `src/store/merchantReducer.ts`, which has no React dependencies and is unit-tested directly.

| Domain | Actions |
| --- | --- |
| Products | `ADD_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCTS`, `BULK_PRODUCT_STATUS`, `ADJUST_STOCK` |
| Orders | `CREATE_ORDER`, `MARK_ORDER_PAID`, `SHIP_ORDER`, `BULK_SHIP_ORDERS`, `DELIVER_ORDER`, `REFUND_OR_CANCEL_ORDER`, `ADD_ORDER_NOTE` |
| Customers | `ADD_CUSTOMER`, `UPDATE_CUSTOMER` |
| Promotions | `ADD_PROMOTION`, `UPDATE_PROMOTION`, `TOGGLE_PROMOTION`, `DELETE_PROMOTION` |
| Finance | `REQUEST_PAYOUT` |
| Settings and team | `UPDATE_SETTINGS`, `ADD_SHIPPING_ZONE`, `UPDATE_SHIPPING_ZONE`, `INVITE_STAFF`, `UPDATE_STAFF_ROLE`, `REMOVE_STAFF` |
| App | `MARK_ALERTS_READ`, `SET_ORDER_FILTER_PRESET`, `SET_PRODUCT_FILTER_PRESET`, `RESET_DEMO_DATA` |

Transient UI state — the active section, open drawers, pending quick action, and toasts — is kept in `MerchantProvider` with `useState` and is not persisted.

### Persistence

| `localStorage` key | Contents |
| --- | --- |
| `mercato_merchant_state_v1` | The full `MerchantState` as JSON, rewritten after every change |
| `mercato_locale_v1` | The chosen language: `en` or `zh` |

On startup the saved state is merged over fresh seed data, so top-level fields added later pick up their defaults. If the saved value is missing, unparseable, or lacks the product or order lists, the app falls back to the seed data. There is no migration step for other shape changes — when you change the shape of `MerchantState`, bump the key suffix or reset the demo data.

## Domain logic

These rules live in `src/store/merchantReducer.ts` and `src/utils/format.ts`.

### Order lifecycle

| Status | How an order gets there | What can happen next |
| --- | --- | --- |
| `pending_payment` | Created without marking it paid | Confirm payment, or cancel |
| `to_fulfill` | Created as paid, or payment confirmed | Ship (individually or in bulk), or cancel |
| `shipped` | Shipped with a carrier and tracking number | Mark delivered, or refund |
| `delivered` | Marked delivered | Refund |
| `refund_requested` | Present in the seed data only | Refund |
| `refunded`, `cancelled` | Refunded or cancelled | Final |

### Order totals

Creating an order calculates, in this order:

1. **Subtotal** — the sum of each product's current price × quantity.
2. **Shipping** — the fee entered on the form, or `0` once the subtotal reaches the store's free-shipping threshold.
3. **Discount** — an optional promo code, matched case-insensitively. It applies only if the code is `active`, under its usage limit, and the subtotal meets its minimum. Percentage codes take that percentage off the subtotal, fixed codes take their value off (capped at the subtotal), and free-shipping codes set shipping to `0`.
4. **Tax** — (subtotal − discount) × the store's tax rate.
5. **Total** — subtotal − discount + shipping + tax.

Creating the order also reduces stock and raises the sold count for each product, and increments the promo code's usage count. Stock availability is not validated; stock simply stops at `0`.

### Money movement

| Event | Ledger | Available balance |
| --- | --- | --- |
| Order is paid (at creation or later) | Adds a pending `charge` with a processing fee of 2.9% + 0.30 | Unchanged |
| Order is delivered | Marks that order's pending charges as settled | Increases by the charge's net amount (total − fee) |
| Paid order is refunded or cancelled | Adds a `refund` for the order total | Decreases by the order total, never below `0` |
| Payout is requested | Adds a pending `payout` | Decreases by the requested amount |

A payout must be greater than `0` and no more than the available balance. **Standard ACH** is free with an arrival date two days out; **Instant Transfer** charges a 1% fee and arrives the same day.

## Internationalization

The console ships with two locales, `en` and `zh` (Simplified Chinese). The initial language is the saved preference if there is one, otherwise Chinese when the browser language starts with `zh`, otherwise English. Switching also updates `<html lang>` and the page title.

`useI18n()` provides two translation functions:

- **`t(key, params?)`** — looks up a UI string and fills `{placeholder}` tokens. The `en` dictionary in `src/i18n/translations.ts` is the source of truth: its keys define the `TranslationKey` type, and `zh` must supply every one of them, so a missing Chinese string is a compile error.
- **`tc(text)`** — translates demo *content* for display: seed product names, promotion titles, shipping zones, tags, and cities, plus the activity-timeline and ledger lines the reducer generates in English. Anything it doesn't recognize, including everything users type in, is shown unchanged.

Statuses, categories, sales channels, payment methods, and roles are stored as English enum values and mapped to dictionary keys with helpers such as `getOrderStatusKey()`.

Formatting is in `src/utils/format.ts`. Dates follow the locale, and compact amounts use `k` / `M` in English and `万` / `亿` in Chinese. Thousands separators always use the `1,234.56` style.

### Adding a string

1. Add the key and English text to `en` in `src/i18n/translations.ts`.
2. Add the same key to `zh`, using the same `{placeholder}` names.
3. Use it in a component: `t('section.myKey', { count })`.

A test in `src/App.test.tsx` checks that both dictionaries have identical keys and placeholders.

### Adding a language

Language support is not yet table-driven. Beyond adding a dictionary to `DICTIONARIES` and extending the `Locale` type, a new language needs changes to the detection, `toggleLocale()`, and `<html lang>` logic in `I18nContext.tsx`, the switchers in `TopBar.tsx` and `SettingsPage.tsx`, the locale branches in `src/utils/format.ts` and `getAnalyticsSeries()`, and `translateContent()`, which currently only maps content to Chinese.

## Testing

```bash
npm test            # 10 tests in 2 files
npm run typecheck
```

- `src/store/merchantReducer.test.ts` — unit tests for the reducer and the pricing helpers: product changes, the paid-order → ship → deliver → settle flow, refund with restock, payout fees and limits, owner protection, and promo rules.
- `src/App.test.tsx` — integration tests that render the whole app with React Testing Library: Overview ranges and the action queue, fulfilling an order from the drawer, `Ctrl+K` search, a pass through the Products, Customers, Promotions, Finance, and Settings workflows, dictionary parity, and language switching with persistence.

There is no Vitest config file, so tests run in the default Node environment. A test file that needs a DOM must opt in with a first-line `// @vitest-environment jsdom` comment, as `App.test.tsx` does.

No linter, formatter, or CI workflow is configured. `npm run typecheck` (strict mode, plus unused locals and parameters) is the only static check.

## Demo data and limitations

The seed dataset in `src/data/seedData.ts` describes one store, *Harbor & Loom*: 12 products, 12 orders (`#HL-1037` to `#HL-1048`), 10 customers, 6 promo codes, 5 payouts, 8 ledger entries, 5 staff members, and 4 shipping zones. To try discounts when creating an order, the active codes are `AUTUMN20`, `WELCOME15`, `VIP30`, and `FREESHIP120`.

To start over, go to **Settings → Alerts & Data → Reset Demo Data**. This restores the seed data and keeps your language preference.

Because this is a demo, some things are simulated or fixed:

- **No backend or accounts.** Data exists only in the current browser's `localStorage`. The signed-in user is always the owner, Elena Rostova, and actions are recorded under her name.
- **Roles are labels.** Staff roles can be assigned but are not enforced as permissions. The only protection is for the Owner, who cannot be reassigned or removed.
- **Fixed demo date.** Analytics are anchored to 18 November 2026. The chart's baseline figures and the trend percentages are static; only the most recent data point moves as you create, cancel, or refund orders. CSV export filenames also carry that date. Records you create are stamped with the real current time.
- **Nothing happens on its own.** New payouts stay in `processing`, and promotions change status only when you change them — their start and end dates are informational.
- **Currency is a display setting.** Changing it swaps the symbol; amounts are not converted.
- **Some settings are stored but not applied.** Shipping-zone rates are not used when creating an order (the shipping fee is entered by hand), and the time zone and weekly-digest options have no effect.
- **Batch shipping** always uses DHL Express and generates the tracking numbers.
