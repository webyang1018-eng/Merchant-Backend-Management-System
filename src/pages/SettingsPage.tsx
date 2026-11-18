import { useState } from 'react';
import {
  Bell,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Store,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { SEED_SETTINGS } from '../data/seedData';
import { useMerchant } from '../store/MerchantContext';
import type { CurrencyCode, StaffRole } from '../types/merchant';
import { formatCurrency, getCurrencySymbol, getInitials } from '../utils/format';

type SettingsTab = 'profile' | 'shipping' | 'team' | 'notifications';

const ROLES: StaffRole[] = [
  'Owner',
  'Store Manager',
  'Fulfillment Specialist',
  'Finance Analyst',
  'Support Agent',
];

export function SettingsPage() {
  const { state, dispatch, pushToast } = useMerchant();
  const [tab, setTab] = useState<SettingsTab>('profile');

  // Local editable form state for store profile
  const [storeName, setStoreName] = useState(state.settings.storeName);
  const [legalName, setLegalName] = useState(state.settings.legalName);
  const [supportEmail, setSupportEmail] = useState(state.settings.supportEmail);
  const [supportPhone, setSupportPhone] = useState(state.settings.supportPhone);
  const [businessAddress, setBusinessAddress] = useState(state.settings.businessAddress);
  const [currency, setCurrency] = useState<CurrencyCode>(state.settings.currency);
  const [timezone, setTimezone] = useState(state.settings.timezone);
  const [storefrontLive, setStorefrontLive] = useState(state.settings.storefrontLive);
  const [settlementBank, setSettlementBank] = useState(state.settings.settlementBank);

  // Tax & shipping
  const [taxRate, setTaxRate] = useState(String(state.settings.taxRate));
  const [freeShipThreshold, setFreeShipThreshold] = useState(
    String(state.settings.freeShippingThreshold)
  );
  const [zoneModalOpen, setZoneModalOpen] = useState(false);

  // Team invite
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        storeName: storeName.trim(),
        legalName: legalName.trim(),
        supportEmail: supportEmail.trim(),
        supportPhone: supportPhone.trim(),
        businessAddress: businessAddress.trim(),
        currency,
        timezone,
        storefrontLive,
        settlementBank: settlementBank.trim(),
      },
    });
    pushToast('Store profile saved', 'Changes are active across your merchant console.');
  };

  const handleSaveTaxShipping = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        taxRate: Math.max(0, Math.min(40, Number(taxRate) || 0)),
        freeShippingThreshold: Math.max(0, Number(freeShipThreshold) || 0),
      },
    });
    pushToast('Shipping & tax settings saved', 'New orders will apply updated rules.');
  };

  const handleResetDemo = () => {
    dispatch({ type: 'RESET_DEMO_DATA' });
    setStoreName(SEED_SETTINGS.storeName);
    setLegalName(SEED_SETTINGS.legalName);
    setSupportEmail(SEED_SETTINGS.supportEmail);
    setSupportPhone(SEED_SETTINGS.supportPhone);
    setBusinessAddress(SEED_SETTINGS.businessAddress);
    setCurrency(SEED_SETTINGS.currency);
    setTimezone(SEED_SETTINGS.timezone);
    setStorefrontLive(SEED_SETTINGS.storefrontLive);
    setSettlementBank(SEED_SETTINGS.settlementBank);
    setTaxRate(String(SEED_SETTINGS.taxRate));
    setFreeShipThreshold(String(SEED_SETTINGS.freeShippingThreshold));
    pushToast('Workspace data reset', 'Restored initial Harbor & Loom sample data.', 'info');
  };

  const navItems: { id: SettingsTab; label: string; icon: typeof Store }[] = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'shipping', label: 'Shipping & Tax', icon: Truck },
    { id: 'team', label: 'Team & Roles', icon: Shield },
    { id: 'notifications', label: 'Alerts & Data', icon: Bell },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Sub-navigation */}
      <div className="lg:col-span-1">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs lg:flex-col"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? 'text-teal-700' : 'text-slate-400'}`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Settings Content */}
      <div className="lg:col-span-3">
        {tab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Store Profile &amp; Localization</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Merchant identity displayed on invoices, packing slips, and settlement statements.
              </p>
            </div>

            <div className="space-y-4 p-6 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Store Display Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Registered Legal Entity</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Customer Support Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Support Phone</label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Primary Warehouse / Business Address
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Store Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="SGD">SGD (S$) — Singapore Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Reporting Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option>Asia/Singapore (UTC+08:00)</option>
                    <option>America/Los_Angeles (UTC-08:00)</option>
                    <option>America/New_York (UTC-05:00)</option>
                    <option>Europe/London (UTC+00:00)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Settlement Account</label>
                  <input
                    type="text"
                    value={settlementBank}
                    onChange={(e) => setSettlementBank(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div>
                  <div className="font-semibold text-slate-900">Online Storefront Availability</div>
                  <div className="mt-0.5 text-slate-500">
                    Temporarily disable public checkout while running inventory audits.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={storefrontLive}
                  onClick={() => setStorefrontLive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    storefrontLive ? 'bg-teal-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                      storefrontLive ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Save className="h-3.5 w-3.5" />
                Save Store Profile
              </button>
            </div>
          </form>
        )}

        {tab === 'shipping' && (
          <div className="space-y-5">
            <form
              onSubmit={handleSaveTaxShipping}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs"
            >
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Checkout Tax &amp; Free Shipping</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Applied automatically when calculating order totals.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 text-xs sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Default GST / Sales Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Free Shipping Threshold ({getCurrencySymbol(state.settings.currency)})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={freeShipThreshold}
                    onChange={(e) => setFreeShipThreshold(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Rules
                </button>
              </div>
            </form>

            {/* Shipping Zones */}
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Shipping Zones</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Regional courier rates and transit estimates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Zone
                </button>
              </div>
              <ul className="divide-y divide-slate-100 text-xs">
                {state.shippingZones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        {zone.name}
                        <Badge tone={zone.enabled ? 'emerald' : 'slate'}>
                          {zone.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-slate-500">
                        {zone.regions} · {zone.estimatedDays}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 tabular-nums">
                      <div className="text-right">
                        <div className="font-medium text-slate-800">
                          Std {formatCurrency(zone.standardRate, state.settings.currency)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Exp {formatCurrency(zone.expressRate, state.settings.currency)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({
                            type: 'UPDATE_SHIPPING_ZONE',
                            payload: { ...zone, enabled: !zone.enabled },
                          });
                          pushToast(
                            `${zone.name} ${zone.enabled ? 'disabled' : 'enabled'}`
                          );
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {zone.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <AddZoneModal open={zoneModalOpen} onClose={() => setZoneModalOpen(false)} />
          </div>
        )}

        {tab === 'team' && (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Team Members &amp; Access</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Manage staff permissions across catalog, fulfillment, and finance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite Staff
              </button>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {state.staff.map((member) => {
                const isOwner = member.role === 'Owner';
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {getInitials(member.name)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          {member.name}
                          {member.status === 'invited' && <Badge tone="amber">Invited</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {member.email} · {member.lastActive}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <Badge tone="emerald">Owner (Full Access)</Badge>
                      ) : (
                        <>
                          <select
                            aria-label={`Role for ${member.name}`}
                            value={member.role}
                            onChange={(e) => {
                              const role = e.target.value as StaffRole;
                              dispatch({
                                type: 'UPDATE_STAFF_ROLE',
                                payload: { id: member.id, role },
                              });
                              pushToast('Role updated', `${member.name} is now ${role}.`);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
                          >
                            {ROLES.filter((r) => r !== 'Owner').map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'REMOVE_STAFF', payload: { id: member.id } });
                              pushToast('Access revoked', `${member.name} removed.`, 'info');
                            }}
                            aria-label={`Remove ${member.name}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <InviteStaffModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Operational Notification Rules</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Control which live alerts appear in the console notification center and staff emails.
                </p>
              </div>
              <ul className="divide-y divide-slate-100 text-xs">
                {(
                  [
                    {
                      key: 'newOrders',
                      title: 'Unfulfilled Order Alerts',
                      desc: 'Notify fulfillment staff when paid orders enter the dispatch queue.',
                    },
                    {
                      key: 'lowStockAlerts',
                      title: 'Low & Out-of-Stock Warnings',
                      desc: 'Trigger alerts when an active SKU drops below its reorder threshold.',
                    },
                    {
                      key: 'refundRequests',
                      title: 'Customer Refund Requests',
                      desc: 'Flag incoming return or damage claims for immediate manager review.',
                    },
                    {
                      key: 'payoutConfirmations',
                      title: 'Bank Payout Status Updates',
                      desc: 'Confirm when scheduled or instant settlements are initiated and cleared.',
                    },
                    {
                      key: 'weeklyDigest',
                      title: 'Weekly Executive Summary',
                      desc: 'Send Monday 08:00 AM revenue, margin, and cohort digest.',
                    },
                  ] as const
                ).map((item) => {
                  const enabled = state.settings.notifications[item.key];
                  return (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="mt-0.5 text-slate-500">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => {
                          dispatch({
                            type: 'UPDATE_SETTINGS',
                            payload: {
                              notifications: {
                                ...state.settings.notifications,
                                [item.key]: !enabled,
                              },
                            },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                          enabled ? 'bg-teal-700' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                            enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs text-xs">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reset Sandbox Data</h3>
                <p className="mt-0.5 text-slate-500">
                  Restore all orders, products, customers, payouts, and store settings to their default sample state.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch, pushToast } = useMerchant();
  const [name, setName] = useState('');
  const [regions, setRegions] = useState('');
  const [standardRate, setStandardRate] = useState('15');
  const [expressRate, setExpressRate] = useState('30');
  const [estimatedDays, setEstimatedDays] = useState('4–7 business days');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regions.trim()) return;
    dispatch({
      type: 'ADD_SHIPPING_ZONE',
      payload: {
        name: name.trim(),
        regions: regions.trim(),
        standardRate: Math.max(0, Number(standardRate) || 0),
        expressRate: Math.max(0, Number(expressRate) || 0),
        estimatedDays: estimatedDays.trim() || '5–8 business days',
        enabled: true,
      },
    });
    pushToast('Shipping zone added', `${name.trim()} is now enabled.`);
    setName('');
    setRegions('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Shipping Zone"
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-zone-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Add Zone
          </button>
        </>
      }
    >
      <form id="add-zone-form" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="mb-1 block font-medium text-slate-700">Zone Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Middle East (GCC)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-700">Covered Countries / Regions</label>
          <input
            type="text"
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            placeholder="UAE, Qatar, Saudi Arabia"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Standard Rate</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={standardRate}
              onChange={(e) => setStandardRate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Express Rate</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={expressRate}
              onChange={(e) => setExpressRate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-700">Transit Estimate</label>
          <input
            type="text"
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

function InviteStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch, pushToast } = useMerchant();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('Store Manager');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    dispatch({ type: 'INVITE_STAFF', payload: { name, email, role } });
    pushToast('Invitation sent', `Invited ${email.trim()} as ${role}.`);
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite Staff Member"
      subtitle="Grant role-based access to your merchant backend console."
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-staff-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Send Invitation
          </button>
        </>
      }
    >
      <form id="invite-staff-form" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="mb-1 block font-medium text-slate-700">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Grace Ong"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-700">Work Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="grace@harborandloom.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-700">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          >
            {ROLES.filter((r) => r !== 'Owner').map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
