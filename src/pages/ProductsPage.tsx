import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  Edit3,
  PackagePlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge, ProductStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ProductSwatch } from '../components/ui/ProductSwatch';
import { useMerchant } from '../store/MerchantContext';
import type { Product, ProductCategory, ProductStatus } from '../types/merchant';
import {
  calculateMargin,
  downloadCsv,
  formatCurrency,
  formatNumber,
  getCurrencySymbol,
} from '../utils/format';

const CATEGORIES: ProductCategory[] = [
  'Apparel',
  'Leather Goods',
  'Home & Living',
  'Accessories',
  'Wellness',
];

const SWATCH_COLORS = [
  '#0F766E',
  '#92400E',
  '#334155',
  '#1D4ED8',
  '#15803D',
  '#B45309',
  '#6D28D9',
  '#BE123C',
];

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function ProductsPage() {
  const { state, dispatch, quickAction, setQuickAction, pushToast } = useMerchant();
  const currency = state.settings.currency;

  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price_desc' | 'stock_asc' | 'sold_desc'>(
    'sold_desc'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (state.productFilterPreset === 'low_stock') {
      setStatusFilter('active');
      setStockFilter('low_stock');
      dispatch({ type: 'SET_PRODUCT_FILTER_PRESET', payload: null });
    }
  }, [state.productFilterPreset, dispatch]);

  useEffect(() => {
    if (quickAction === 'new_product') {
      setEditingProduct(null);
      setEditorOpen(true);
      setQuickAction(null);
    }
  }, [quickAction, setQuickAction]);

  const metrics = useMemo(() => {
    const active = state.products.filter((p) => p.status === 'active');
    const low = active.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const oos = active.filter((p) => p.stock === 0).length;
    const inventoryValue = state.products.reduce((s, p) => s + p.stock * p.price, 0);
    return { total: state.products.length, active: active.length, low, oos, inventoryValue };
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = state.products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (stockFilter === 'in_stock' && p.stock <= p.lowStockThreshold) return false;
      if (stockFilter === 'low_stock' && p.stock > p.lowStockThreshold) return false;
      if (stockFilter === 'out_of_stock' && p.stock !== 0) return false;
      if (q) {
        const hit =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      return b.soldCount - a.soldCount;
    });
  }, [state.products, statusFilter, categoryFilter, stockFilter, search, sortBy]);

  const toggleAll = () => {
    const ids = filteredProducts.map((p) => p.id);
    const allSel = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSel ? [] : ids);
  };

  const handleBulkStatus = (status: ProductStatus) => {
    dispatch({ type: 'BULK_PRODUCT_STATUS', payload: { ids: selectedIds, status } });
    pushToast(
      `Updated ${selectedIds.length} product(s)`,
      `Status changed to ${status}.`
    );
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    dispatch({ type: 'DELETE_PRODUCTS', payload: selectedIds });
    pushToast(`Deleted ${count} product(s)`, 'Removed from merchant catalog.', 'info');
    setSelectedIds([]);
  };

  const handleExport = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Status',
      'Retail Price',
      'Unit Cost',
      'Margin %',
      'Stock',
      'Low Stock Threshold',
      'Units Sold',
    ];
    const rows = filteredProducts.map((p) => {
      const { marginPct } = calculateMargin(p.price, p.cost);
      return [
        p.sku,
        p.name,
        p.category,
        p.status,
        p.price.toFixed(2),
        p.cost.toFixed(2),
        marginPct,
        p.stock,
        p.lowStockThreshold,
        p.soldCount,
      ];
    });
    downloadCsv('catalog-inventory-2026-11-18.csv', headers, rows);
    pushToast('Catalog exported', `Downloaded ${rows.length} SKU(s).`, 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Manage product pricing, gross margins, and real-time warehouse stock levels.
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
            onClick={() => {
              setEditingProduct(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Inventory Summary Strip */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Active Catalog</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {metrics.active}{' '}
            <span className="text-xs font-normal text-slate-400">/ {metrics.total} SKUs</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">Retail Inventory Value</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(metrics.inventoryValue, currency)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('active');
            setStockFilter('low_stock');
          }}
          className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-2xs transition-colors hover:border-amber-300"
        >
          <div className="text-xs text-slate-500">Low Stock Alerts</div>
          <div className="mt-1 text-xl font-semibold text-amber-700 tabular-nums">
            {metrics.low} <span className="text-xs font-normal text-slate-400">SKUs</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('active');
            setStockFilter('out_of_stock');
          }}
          className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-2xs transition-colors hover:border-rose-300"
        >
          <div className="text-xs text-slate-500">Out of Stock</div>
          <div className="mt-1 text-xl font-semibold text-rose-600 tabular-nums">
            {metrics.oos} <span className="text-xs font-normal text-slate-400">SKUs</span>
          </div>
        </button>
      </div>

      {/* Catalog Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-4 pt-2">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'draft', label: 'Draft' },
              { key: 'archived', label: 'Archived' },
            ] as const
          ).map((t) => {
            const active = statusFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setStatusFilter(t.key);
                  setSelectedIds([]);
                }}
                className={`border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Filter Row */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or category..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by inventory health"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">All stock levels</option>
              <option value="in_stock">Healthy stock</option>
              <option value="low_stock">Low or out of stock</option>
              <option value="out_of_stock">Out of stock only</option>
            </select>
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="sold_desc">Best selling</option>
              <option value="stock_asc">Lowest stock</option>
              <option value="price_desc">Highest price</option>
              <option value="name">Name (A–Z)</option>
            </select>
            {(stockFilter !== 'all' || categoryFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setStockFilter('all');
                  setCategoryFilter('all');
                  setSearch('');
                }}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/60 px-4 py-2.5 text-xs">
            <span className="font-medium text-teal-900 tabular-nums">
              {selectedIds.length} SKU{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('active')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Set Active
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('archived')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Archive className="h-3.5 w-3.5 text-slate-500" />
                Archive
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 font-medium text-white hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={
                      filteredProducts.length > 0 &&
                      filteredProducts.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                </th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Inventory</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="hidden px-3 py-3 text-right md:table-cell">Margin</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">Sold</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-500">
                    No products match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const { marginPct } = calculateMargin(prod.price, prod.cost);
                  const isOos = prod.stock === 0;
                  const isLow = !isOos && prod.stock <= prod.lowStockThreshold;
                  const checked = selectedIds.includes(prod.id);

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        checked ? 'bg-teal-50/25' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${prod.name}`}
                          checked={checked}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(prod.id)
                                ? prev.filter((id) => id !== prod.id)
                                : [...prev, prod.id]
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProductSwatch color={prod.swatchColor} category={prod.category} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">{prod.name}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {prod.sku} · {prod.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ProductStatusBadge status={prod.status} />
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap tabular-nums">
                        {isOos ? (
                          <Badge tone="rose">Out of stock</Badge>
                        ) : isLow ? (
                          <Badge tone="amber">{prod.stock} left (low)</Badge>
                        ) : (
                          <span className="text-slate-700">{prod.stock} in stock</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(prod.price, currency)}
                      </td>
                      <td className="hidden px-3 py-3.5 text-right text-slate-600 whitespace-nowrap tabular-nums md:table-cell">
                        {marginPct}%
                      </td>
                      <td className="hidden px-3 py-3.5 text-right text-slate-600 whitespace-nowrap tabular-nums lg:table-cell">
                        {formatNumber(prod.soldCount)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStockTarget(prod)}
                            title="Adjust stock"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setEditorOpen(true);
                            }}
                            title="Edit product"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <ProductEditorModal
        open={editorOpen}
        product={editingProduct}
        onClose={() => setEditorOpen(false)}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustModal product={stockTarget} onClose={() => setStockTarget(null)} />
    </div>
  );
}

function ProductEditorModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const { state, dispatch, pushToast } = useMerchant();
  const sym = getCurrencySymbol(state.settings.currency);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Apparel');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [price, setPrice] = useState('98');
  const [cost, setCost] = useState('34');
  const [stock, setStock] = useState('40');
  const [lowStockThreshold, setLowStockThreshold] = useState('12');
  const [description, setDescription] = useState('');
  const [swatchColor, setSwatchColor] = useState(SWATCH_COLORS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setStatus(product.status);
      setPrice(String(product.price));
      setCost(String(product.cost));
      setStock(String(product.stock));
      setLowStockThreshold(String(product.lowStockThreshold));
      setDescription(product.description);
      setSwatchColor(product.swatchColor);
    } else {
      setName('');
      setSku(`HL-AP-${Math.floor(220 + Math.random() * 700)}`);
      setCategory('Apparel');
      setStatus('active');
      setPrice('118');
      setCost('42');
      setStock('30');
      setLowStockThreshold('10');
      setDescription('');
      setSwatchColor(SWATCH_COLORS[0]);
    }
  }, [open, product]);

  const numericPrice = Math.max(0, Number(price) || 0);
  const numericCost = Math.max(0, Number(cost) || 0);
  const { profit, marginPct } = calculateMargin(numericPrice, numericCost);

  const generateSku = () => {
    const code = category
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    setSku(`HL-${code}-${Math.floor(100 + Math.random() * 899)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      setError('SKU code is required.');
      return;
    }
    if (numericPrice <= 0) {
      setError('Retail price must be greater than zero.');
      return;
    }
    const dup = state.products.find(
      (p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== product?.id
    );
    if (dup) {
      setError(`SKU "${sku.trim()}" is already assigned to ${dup.name}.`);
      return;
    }

    const base = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      status,
      price: Number(numericPrice.toFixed(2)),
      cost: Number(numericCost.toFixed(2)),
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      lowStockThreshold: Math.max(1, Math.floor(Number(lowStockThreshold) || 10)),
      description: description.trim(),
      swatchColor,
    };

    if (product) {
      dispatch({
        type: 'UPDATE_PRODUCT',
        payload: { ...product, ...base },
      });
      pushToast('Product updated', `${base.name} (${base.sku}) saved.`);
    } else {
      dispatch({ type: 'ADD_PRODUCT', payload: base });
      pushToast('Product added to catalog', `${base.name} (${base.sku}) is now ${base.status}.`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      subtitle="Configure merchandising details, unit economics, and reorder thresholds."
      maxWidth="lg"
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
            form="product-editor-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </>
      }
    >
      <form id="product-editor-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-slate-700">Product Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cashmere Ribbed Beanie — Oat"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="font-medium text-slate-700">SKU</label>
              <button
                type="button"
                onClick={generateSku}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-teal-700 hover:text-teal-800"
              >
                <Sparkles className="h-3 w-3" />
                Auto
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 uppercase text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Listing Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="active">Active (visible on storefront)</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Pricing + Live Margin */}
        <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Retail Price ({sym})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Unit Cost ({sym})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-col justify-center rounded-lg border border-slate-200/80 bg-white px-3 py-2 tabular-nums">
            <span className="text-[11px] text-slate-500">Gross Margin &amp; Profit</span>
            <span
              className={`mt-0.5 text-sm font-semibold ${
                marginPct >= 45
                  ? 'text-emerald-700'
                  : marginPct >= 20
                    ? 'text-slate-900'
                    : 'text-rose-600'
              }`}
            >
              {marginPct}% ({formatCurrency(profit, state.settings.currency)})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">On-Hand Stock</label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Low-Stock Alert Threshold</label>
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Materials, dimensions, care notes..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium text-slate-700">Catalog Swatch Accent</label>
          <div className="flex items-center gap-2">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSwatchColor(c)}
                aria-label={`Select color ${c}`}
                className={`h-6 w-6 rounded-full transition-transform ${
                  swatchColor === c ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StockAdjustModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { dispatch, pushToast } = useMerchant();
  const [delta, setDelta] = useState('25');
  const [reason, setReason] = useState('Purchase order restock received');

  useEffect(() => {
    if (product) {
      setDelta('25');
      setReason('Purchase order restock received');
    }
  }, [product]);

  if (!product) return null;

  const parsedDelta = Math.trunc(Number(delta) || 0);
  const projected = Math.max(0, product.stock + parsedDelta);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'ADJUST_STOCK',
      payload: { productId: product.id, newStock: projected },
    });
    pushToast(
      `Inventory updated for ${product.sku}`,
      `${product.stock} → ${projected} units (${reason})`
    );
    onClose();
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      title="Adjust Inventory"
      subtitle={`${product.name} (${product.sku})`}
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
            form="stock-adjust-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Update to {projected} Units
          </button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 tabular-nums">
          <div>
            <div className="text-[11px] text-slate-500">Current</div>
            <div className="text-lg font-semibold text-slate-900">{product.stock}</div>
          </div>
          <div className="text-slate-400">→</div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">New On-Hand</div>
            <div className="text-lg font-semibold text-teal-700">{projected}</div>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            Quantity Adjustment (use negative to deduct)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
            {[-5, +10, +25, +50].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDelta(String(preset))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-medium text-slate-700 tabular-nums hover:bg-slate-50"
              >
                {preset > 0 ? `+${preset}` : preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">Adjustment Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          >
            <option>Purchase order restock received</option>
            <option>Warehouse cycle count correction</option>
            <option>Customer return restocked</option>
            <option>Damaged / quality hold write-off</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
