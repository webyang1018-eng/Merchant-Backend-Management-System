# Mercato — Merchant Backend Management System

A merchant backend operations console and desktop companion application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Tauri v2**.

Mercato provides a single-page store operations workspace—covering executive analytics, order fulfillment, inventory, customer CRM, promotions, payouts, and bilingual (`EN` / `中文`) store settings—paired with an optional lightweight desktop pet companion window (`pet.html`) synchronized in real time via Tauri v2 window-targeted IPC events (with a `BroadcastChannel` fallback when running in a browser).

---

## Key Features

### Merchant Operations Console (`index.html`)
- **Executive Overview**: Time-range analytics (`7D`, `30D`, `90D`, `12M`), interactive SVG revenue and order volume chart, channel attribution breakdown, operational action queue, recent orders, and top products.
- **Order Management & Fulfillment**: Status filtering, search, batch shipping, CSV export, manual order creation (with live promo validation and inventory deduction), and an order inspection drawer supporting payment capture, shipment tracking, delivery confirmation, refunds/cancellations (with optional restock), and timeline notes.
- **Products & Inventory**: Catalog CRUD with SKU auto-generation, real-time gross margin and unit profit calculation, low/out-of-stock filtering, quick inventory adjustments, bulk status actions, and CSV export.
- **Customer CRM**: Segment filtering (`VIP`, `Returning`, `New`, `At Risk`), lifetime spend & order metrics, customer creation, editable tags & account notes, and linked order history.
- **Promotions & Coupons**: Percentage, fixed-amount, and free-shipping discount codes with redemption progress bars, validity dates, pause/resume controls, and one-click code copy.
- **Finance & Payouts**: Available balance, pending settlement tracking, standard and instant bank withdrawal workflows, payout history, transaction ledger, and CSV statement export.
- **Store Settings & RBAC**: Store profile, console language (`English` / `简体中文`) & currency localization (`USD`, `CNY`, `SGD`, `EUR`, `GBP`), storefront live/maintenance toggle, configurable tax and regional shipping zones, staff invites & role management, operational alert toggles, and demo data reset.
- **Bilingual Internationalization (中文 / English)**: Instant `EN` / `中文` switching from the top bar, store settings, or command palette (`⌘K` / `Ctrl+K`), strongly typed translation dictionaries (`src/i18n/translations.ts`) with verified key/placeholder parity, `localStorage` persistence (`mercato_locale_v1`), automatic `<html lang>` and document title updates, and localized content rules.
- **Global Productivity**: Command palette (`⌘K` / `Ctrl+K`), actionable header alert center, toast notifications, and automatic `localStorage` persistence (`mercato_merchant_state_v1`).

### Desktop Pet Companion & Multi-Window Architecture (`pet.html` & `src-tauri/`)
- **Single-Source-of-Truth Sync**: The `main` console window holds the canonical `MerchantContext` state and projects lightweight `PetSignalSnapshot` diffs via Tauri v2 `emitTo` (`mercato://pet-snapshot`) to the independent `pet` companion window.
- **Mood-Reactive Mascot**: Expressive inline SVG storefront mascot reacting across five states (`idle`, `alert`, `urgent`, `celebrating`, and `sleeping`) driven by unread alerts, storefront live/maintenance status, and transient toast feedback (`latestFeedback`).
- **Two-Way Action Routing**: Clicking KPIs, unread alerts, or quick actions inside the pet popover dispatches `PetToMainIntent` events (`mercato://pet-intent`) back to `main` (opening sections/order filters/product filters, marking alerts read, or triggering quick actions) and unminimizes/focuses the console window.
- **Transparent Always-On-Top Window & System Tray**: Frameless transparent `pet` window (`320×360`) with pointer-threshold drag vs. click toggling, plus a Tauri system tray (`Open Mercato Console`, `Toggle Desktop Pet`, `Quit Mercato`) that hides closed windows to the tray so background state stays alive until explicitly quit.
- **Web Fallback Transport**: When running outside Tauri in a regular browser or tests, `createSyncTransport()` automatically falls back to `BroadcastChannel` (`mercato_pet_sync_v1`).

---

## Tech Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 6 (multi-entry Rollup build with `index.html` and `pet.html`), Tailwind CSS 4 (`@tailwindcss/vite`), `lucide-react`, `@fontsource-variable/inter`
- **Desktop Host**: Tauri v2 (`@tauri-apps/api` optional dependency, Rust `tauri` v2 crate with `tray-icon`, `macos-private-api`, and `image-png`)
- **Testing**: Vitest 3, `@testing-library/react`, `jsdom`

---

## Project Structure

```text
├── index.html                        # Main merchant console entry HTML
├── pet.html                          # Transparent desktop pet window entry HTML
├── vite.config.ts                    # Multi-entry Vite build & manual chunk config
├── package.json                      # Dependencies and npm scripts
├── src/
│   ├── App.tsx                       # Console shell & useMainWindowPetSync mount
│   ├── main.tsx                      # Main console React root
│   ├── components/
│   │   ├── charts/RevenueChart.tsx   # Interactive SVG revenue & order chart
│   │   ├── layout/                   # Sidebar, TopBar, CommandPalette, ToastViewport
│   │   ├── orders/                   # OrderDetailDrawer
│   │   └── ui/                       # Modal, Drawer, Badge, ProductSwatch
│   ├── data/seedData.ts              # Initial catalog, orders, customers, payouts & analytics
│   ├── i18n/                         # I18nContext & EN/ZH dictionaries + content localization
│   ├── pages/                        # Overview, Orders, Products, Customers, Promotions, Finance, Settings
│   ├── pet/                          # PetCompanionView & pet-main React root
│   ├── store/                        # MerchantContext, merchantReducer & reducer tests
│   ├── sync/                         # tauriPetBridge, useMainWindowPetSync, usePetWindowSync & tests
│   ├── types/merchant.ts             # Domain types
│   └── utils/
│       ├── format.ts                 # Currency, date, margin, promo & CSV helpers
│       └── merchantSignals.ts        # Shared operational counts, alerts, mood & snapshot projection
└── src-tauri/                        # Tauri v2 desktop crate
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json               # Window definitions (`main` & `pet`) and CSP config
    ├── capabilities/                 # Per-window ACL permissions (`main.json`, `pet.json`)
    └── src/
        ├── main.rs                   # Desktop entrypoint
        └── lib.rs                    # Tray menu & close-to-tray lifecycle
```

---

## Getting Started

### Prerequisites
- **Node.js** (v20+ recommended) and **npm**
- *(Optional, for native desktop builds)* **Rust** toolchain (`rustc` / `cargo`), OS WebView/Tauri system libraries, and `@tauri-apps/cli` (`2.12.x`)

### Web Development

```bash
npm install
npm run dev
```

Vite serves both entries on `http://localhost:5173`:
- Main console: `http://localhost:5173/`
- Pet companion view: `http://localhost:5173/pet.html`

### Tauri Desktop Development

For a full desktop build with `src-tauri/`, install `@tauri-apps/cli` (`^2.12.6` matching `@tauri-apps/api`), ensure Rust and platform Tauri prerequisites are installed, generate app icons under `src-tauri/icons/` (for example from `public/favicon.svg`), and launch Tauri:

```bash
npm run tauri dev
```

---

## Scripts

- `npm run dev` — Start Vite development server (`0.0.0.0:5173`, `strictPort: true`)
- `npm run build` — Run TypeScript project build (`tsc -b`) and build `dist/index.html` + `dist/pet.html`
- `npm run preview` — Preview production build (`0.0.0.0:4173`)
- `npm test` — Run the Vitest test suite (`16` tests across `App.test.tsx`, `merchantReducer.test.ts`, and `petSync.test.tsx`)
- `npm run typecheck` — Run `tsc` type checks for both `tsconfig.app.json` and `tsconfig.node.json`
- `npm run tauri` — Invoke the Tauri CLI (`tauri`)
