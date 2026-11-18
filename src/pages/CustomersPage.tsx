import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { OrderStatusBadge, SegmentBadge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';
import { useMerchant } from '../store/MerchantContext';
import type { Customer, CustomerSegment } from '../types/merchant';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  formatShortDate,
  getInitials,
} from '../utils/format';

const SEGMENTS: CustomerSegment[] = ['VIP', 'Returning', 'New', 'At Risk'];

interface EnrichedCustomer extends Customer {
  totalOrders: number;
  totalSpent: number;
  aov: number;
}

export function CustomersPage() {
  const {
    state,
    inspectCustomerId,
    setInspectCustomerId,
    setInspectOrderId,
    pushToast,
  } = useMerchant();
  const currency = state.settings.currency;

  const [segmentFilter, setSegmentFilter] = useState<'all' | CustomerSegment>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent');
  const [addOpen, setAddOpen] = useState(false);

  const enriched = useMemo<EnrichedCustomer[]>(() => {
    return state.customers.map((c) => {
      const liveValidOrders = state.orders.filter(
        (o) => o.customerId === c.id && o.status !== 'cancelled' && o.status !== 'refunded'
      );
      const liveSpent = liveValidOrders.reduce((s, o) => s + o.total, 0);
      const totalOrders = c.historicalOrders + liveValidOrders.length;
      const totalSpent = Number((c.historicalSpend + liveSpent).toFixed(2));
      const aov = totalOrders > 0 ? totalSpent / totalOrders : 0;
      return { ...c, totalOrders, totalSpent, aov };
    });
  }, [state.customers, state.orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((c) => {
        if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
        if (q) {
          return (
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'orders') return b.totalOrders - a.totalOrders;
        return b.lastOrderAt.localeCompare(a.lastOrderAt);
      });
  }, [enriched, segmentFilter, search, sortBy]);

  const totals = useMemo(() => {
    const ltv = enriched.reduce((s, c) => s + c.totalSpent, 0);
    const vips = enriched.filter((c) => c.segment === 'VIP').length;
    const repeat = enriched.filter((c) => c.totalOrders >= 2).length;
    const repeatRate = enriched.length > 0 ? Math.round((repeat / enriched.length) * 100) : 0;
    return { count: enriched.length, ltv, vips, repeatRate };
  }, [enriched]);

  const activeCustomer = enriched.find((c) => c.id === inspectCustomerId) ?? null;

  const handleExport = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'City',
      'Country',
      'Segment',
      'Orders',
      'Lifetime Spend',
      'Tags',
    ];
    const rows = filtered.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.city,
      c.country,
      c.segment,
      c.totalOrders,
      c.totalSpent.toFixed(2),
      c.tags.join('; '),
    ]);
    downloadCsv('customers-2026-11-18.csv', headers, rows);
    pushToast('Customer list exported', `Downloaded ${rows.length} profile(s).`, 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          View customer lifetime value, purchase history, retention segments, and CRM notes.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Customer Directory</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {totals.count}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">VIP Accounts</div>
          <div className="mt-1 text-xl font-semibold text-violet-700 tabular-nums">
            {totals.vips}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Repeat Purchase Rate</div>
          <div className="mt-1 text-xl font-semibold text-emerald-700 tabular-nums">
            {totals.repeatRate}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Combined Lifetime Spend</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totals.ltv, currency)}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-4 pt-2">
          {(['all', ...SEGMENTS] as const).map((seg) => {
            const active = segmentFilter === seg;
            return (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {seg === 'all' ? 'All Customers' : seg}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, city, or tag..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <select
            aria-label="Sort customers"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="spent">Highest lifetime spend</option>
            <option value="orders">Most orders</option>
            <option value="recent">Most recent activity</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3">Customer</th>
                <th className="hidden px-4 py-3 sm:table-cell">Location</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Spend</th>
                <th className="hidden px-5 py-3 text-right md:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-500">
                    No customers match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => setInspectCustomerId(cust.id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/90"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                          {getInitials(cust.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{cust.name}</div>
                          <div className="truncate text-[11px] text-slate-400">{cust.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-600 whitespace-nowrap sm:table-cell">
                      {cust.city}, {cust.country}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SegmentBadge segment={cust.segment} />
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 whitespace-nowrap tabular-nums">
                      {cust.totalOrders}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(cust.totalSpent, currency)}
                    </td>
                    <td className="hidden px-5 py-3.5 text-right text-slate-500 whitespace-nowrap tabular-nums md:table-cell">
                      {formatShortDate(cust.lastOrderAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Customer Profile Drawer */}
      <CustomerDetailDrawer
        customer={activeCustomer}
        onClose={() => setInspectCustomerId(null)}
        onSelectOrder={(orderId) => {
          setInspectCustomerId(null);
          setInspectOrderId(orderId);
        }}
      />
    </div>
  );
}

function AddCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch, pushToast } = useMerchant();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Singapore');
  const [country, setCountry] = useState('Singapore');
  const [segment, setSegment] = useState<CustomerSegment>('New');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
      setCity('Singapore');
      setCountry('Singapore');
      setSegment('New');
      setNotes('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Customer name and email address are required.');
      return;
    }
    dispatch({
      type: 'ADD_CUSTOMER',
      payload: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '—',
        city: city.trim() || 'Singapore',
        country: country.trim() || 'Singapore',
        segment,
        tags: [segment],
        notes: notes.trim(),
      },
    });
    pushToast('Customer profile created', `${name.trim()} added to CRM directory.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Customer"
      subtitle="Create a customer profile for direct orders, wholesale billing, or support tracking."
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
            form="add-customer-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Save Customer
          </button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Olivia Chen"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="olivia@domain.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9000 1234"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as CustomerSegment)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block font-medium text-slate-700">CRM Note</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery preferences, account manager notes..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

function CustomerDetailDrawer({
  customer,
  onClose,
  onSelectOrder,
}: {
  customer: EnrichedCustomer | null;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
}) {
  const { state, dispatch, pushToast } = useMerchant();
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes);
      setNewTag('');
    }
  }, [customer?.id]);

  if (!customer) return null;

  const currency = state.settings.currency;
  const recentOrders = state.orders.filter((o) => o.customerId === customer.id);

  const toRawCustomer = (patch: Partial<Customer>): Customer => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    country: customer.country,
    segment: customer.segment,
    tags: customer.tags,
    notes: customer.notes,
    joinedAt: customer.joinedAt,
    historicalOrders: customer.historicalOrders,
    historicalSpend: customer.historicalSpend,
    lastOrderAt: customer.lastOrderAt,
    ...patch,
  });

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTag.trim();
    if (!cleaned || customer.tags.includes(cleaned)) return;
    dispatch({
      type: 'UPDATE_CUSTOMER',
      payload: toRawCustomer({ tags: [...customer.tags, cleaned] }),
    });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    dispatch({
      type: 'UPDATE_CUSTOMER',
      payload: toRawCustomer({ tags: customer.tags.filter((t) => t !== tag) }),
    });
  };

  const handleSaveNotes = () => {
    dispatch({
      type: 'UPDATE_CUSTOMER',
      payload: toRawCustomer({ notes }),
    });
    pushToast('Customer notes updated', `Saved for ${customer.name}.`);
  };

  return (
    <Drawer
      open={Boolean(customer)}
      onClose={onClose}
      title={
        <>
          <span>{customer.name}</span>
          <SegmentBadge segment={customer.segment} />
        </>
      }
      subtitle={`Customer since ${formatDate(customer.joinedAt)}`}
    >
      <div className="space-y-6 text-xs">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 tabular-nums">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="text-[11px] text-slate-500">Lifetime Spend</div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {formatCurrency(customer.totalSpent, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="text-[11px] text-slate-500">Total Orders</div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {customer.totalOrders}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="text-[11px] text-slate-500">Avg. Order</div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {formatCurrency(customer.aov, currency)}
            </div>
          </div>
        </div>

        {/* Contact & Segment */}
        <div className="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Contact &amp; Segment</span>
            <select
              aria-label="Customer segment"
              value={customer.segment}
              onChange={(e) => {
                const seg = e.target.value as CustomerSegment;
                dispatch({ type: 'UPDATE_CUSTOMER', payload: toRawCustomer({ segment: seg }) });
                pushToast('Segment updated', `${customer.name} moved to ${seg}.`);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 tabular-nums">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {customer.city}, {customer.country}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h3 className="mb-2 font-semibold tracking-wider text-slate-500 uppercase text-[11px]">
            CRM Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddTag} className="mt-2.5 flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag (e.g. Wholesale, Priority)..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>
        </div>

        {/* Notes */}
        <div>
          <h3 className="mb-2 font-semibold tracking-wider text-slate-500 uppercase text-[11px]">
            Internal Account Notes
          </h3>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record customer preferences or wholesale terms..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Save Note
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <h3 className="mb-2 font-semibold tracking-wider text-slate-500 uppercase text-[11px]">
            Recent Orders ({recentOrders.length})
          </h3>
          {recentOrders.length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 px-4 py-6 text-center text-slate-500">
              No orders in the current ledger yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80">
              {recentOrders.map((ord) => (
                <li key={ord.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(ord.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 tabular-nums">
                        {ord.orderNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {formatDate(ord.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={ord.status} />
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(ord.total, currency)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
