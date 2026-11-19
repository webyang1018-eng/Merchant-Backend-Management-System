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
import { useI18n } from '../i18n/I18nContext';
import { getCategoryKey, getProductStatusKey } from '../i18n/translations';
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
  const { t, tc } = useI18n();
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
          tc(p.name).toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          t(getCategoryKey(p.category)).toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return tc(a.name).localeCompare(tc(b.name));
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      return b.soldCount - a.soldCount;
    });
  }, [state.products, statusFilter, categoryFilter, stockFilter, search, sortBy, t, tc]);

  const toggleAll = () => {
    const ids = filteredProducts.map((p) => p.id);
    const allSel = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSel ? [] : ids);
  };

  const handleBulkStatus = (status: ProductStatus) => {
    dispatch({ type: 'BULK_PRODUCT_STATUS', payload: { ids: selectedIds, status } });
    pushToast(
      t('products.toastBulkStatusTitle', { count: selectedIds.length }),
      t('products.toastBulkStatusDesc', { status: t(getProductStatusKey(status)) })
    );
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    dispatch({ type: 'DELETE_PRODUCTS', payload: selectedIds });
    pushToast(
      t('products.toastBulkDeleteTitle', { count }),
      t('products.toastBulkDeleteDesc'),
      'info'
    );
    setSelectedIds([]);
  };

  const handleExport = () => {
    const headers = [
      t('products.csvSku'),
      t('products.csvName'),
      t('products.csvCategory'),
      t('products.csvStatus'),
      t('products.csvRetailPrice'),
      t('products.csvUnitCost'),
      t('products.csvMargin'),
      t('products.csvStock'),
      t('products.csvThreshold'),
      t('products.csvSold'),
    ];
    const rows = filteredProducts.map((p) => {
      const { marginPct } = calculateMargin(p.price, p.cost);
      return [
        p.sku,
        tc(p.name),
        t(getCategoryKey(p.category)),
        t(getProductStatusKey(p.status)),
        p.price.toFixed(2),
        p.cost.toFixed(2),
        marginPct,
        p.stock,
        p.lowStockThreshold,
        p.soldCount,
      ];
    });
    downloadCsv('catalog-inventory-2026-11-18.csv', headers, rows);
    pushToast(
      t('products.toastExportTitle'),
      t('products.toastExportDesc', { count: rows.length }),
      'info'
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{t('products.subtitle')}</p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t('common.exportCsv')}
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
            {t('products.addProduct')}
          </button>
        </div>
      </div>

      {/* Inventory Summary Strip */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">{t('products.metricActiveCatalog')}</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
            {metrics.active}{' '}
            <span className="text-xs font-normal text-slate-400">
              {t('products.metricTotalSkus', { count: metrics.total })}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs">
          <div className="text-xs text-slate-500">{t('products.metricInventoryValue')}</div>
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
          <div className="text-xs text-slate-500">{t('products.metricLowStock')}</div>
          <div className="mt-1 text-xl font-semibold text-amber-700 tabular-nums">
            {metrics.low}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.skus')}</span>
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
          <div className="text-xs text-slate-500">{t('products.metricOutOfStock')}</div>
          <div className="mt-1 text-xl font-semibold text-rose-600 tabular-nums">
            {metrics.oos}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.skus')}</span>
          </div>
        </button>
      </div>

      {/* Catalog Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-4 pt-2">
          {(
            [
              { key: 'all', label: t('products.tabAll') },
              { key: 'active', label: t('productStatus.active') },
              { key: 'draft', label: t('productStatus.draft') },
              { key: 'archived', label: t('productStatus.archived') },
            ] as const
          ).map((item) => {
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setStatusFilter(item.key);
                  setSelectedIds([]);
                }}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
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
              placeholder={t('products.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('products.filterCategoryAria')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">{t('products.allCategories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(getCategoryKey(c))}
                </option>
              ))}
            </select>
            <select
              aria-label={t('products.filterStockAria')}
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">{t('products.stockAll')}</option>
              <option value="in_stock">{t('products.stockHealthy')}</option>
              <option value="low_stock">{t('products.stockLow')}</option>
              <option value="out_of_stock">{t('products.stockOos')}</option>
            </select>
            <select
              aria-label={t('products.sortAria')}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="sold_desc">{t('products.sortBestSelling')}</option>
              <option value="stock_asc">{t('products.sortLowestStock')}</option>
              <option value="price_desc">{t('products.sortHighestPrice')}</option>
              <option value="name">{t('products.sortName')}</option>
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
                {t('common.reset')}
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/60 px-4 py-2.5 text-xs">
            <span className="font-medium text-teal-900 tabular-nums">
              {t(
                selectedIds.length === 1 ? 'products.selectedOne' : 'products.selectedOther',
                { count: selectedIds.length }
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('active')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t('products.setActive')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('archived')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Archive className="h-3.5 w-3.5 text-slate-500" />
                {t('products.archive')}
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 font-medium text-white hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('common.delete')}
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
                    aria-label={t('products.selectAllAria')}
                    checked={
                      filteredProducts.length > 0 &&
                      filteredProducts.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                </th>
                <th className="px-3 py-3">{t('products.colProduct')}</th>
                <th className="px-3 py-3">{t('common.status')}</th>
                <th className="px-3 py-3">{t('products.colInventory')}</th>
                <th className="px-3 py-3 text-right">{t('products.colPrice')}</th>
                <th className="hidden px-3 py-3 text-right md:table-cell">
                  {t('products.colMargin')}
                </th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">
                  {t('products.colSold')}
                </th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-500">
                    {t('products.empty')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const { marginPct } = calculateMargin(prod.price, prod.cost);
                  const isOos = prod.stock === 0;
                  const isLow = !isOos && prod.stock <= prod.lowStockThreshold;
                  const checked = selectedIds.includes(prod.id);
                  const displayName = tc(prod.name);

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
                          aria-label={t('products.selectProductAria', { name: displayName })}
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
                            <div className="truncate font-medium text-slate-900">{displayName}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {prod.sku} · {t(getCategoryKey(prod.category))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ProductStatusBadge status={prod.status} />
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap tabular-nums">
                        {isOos ? (
                          <Badge tone="rose">{t('common.outOfStock')}</Badge>
                        ) : isLow ? (
                          <Badge tone="amber">
                            {t('common.leftLowCount', { count: prod.stock })}
                          </Badge>
                        ) : (
                          <span className="text-slate-700">
                            {t('common.inStockCount', { count: prod.stock })}
                          </span>
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
                            title={t('products.adjustStockTitle')}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            {t('products.adjustStockBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setEditorOpen(true);
                            }}
                            title={t('products.editProductTitle')}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            {t('common.edit')}
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
  const { t, tc } = useI18n();
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
      setError(t('productModal.errName'));
      return;
    }
    if (!sku.trim()) {
      setError(t('productModal.errSku'));
      return;
    }
    if (numericPrice <= 0) {
      setError(t('productModal.errPrice'));
      return;
    }
    const dup = state.products.find(
      (p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== product?.id
    );
    if (dup) {
      setError(t('productModal.errDupSku', { sku: sku.trim(), name: tc(dup.name) }));
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
      pushToast(
        t('productModal.toastUpdatedTitle'),
        t('productModal.toastUpdatedDesc', { name: base.name, sku: base.sku })
      );
    } else {
      dispatch({ type: 'ADD_PRODUCT', payload: base });
      pushToast(
        t('productModal.toastAddedTitle'),
        t('productModal.toastAddedDesc', {
          name: base.name,
          sku: base.sku,
          status: t(getProductStatusKey(base.status)),
        })
      );
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? t('productModal.editTitle') : t('productModal.addTitle')}
      subtitle={t('productModal.subtitle')}
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="product-editor-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {product ? t('common.saveChanges') : t('productModal.createBtn')}
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
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldTitle')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('productModal.titlePlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="font-medium text-slate-700">{t('productModal.fieldSku')}</label>
              <button
                type="button"
                onClick={generateSku}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-teal-700 hover:text-teal-800"
              >
                <Sparkles className="h-3 w-3" />
                {t('productModal.autoSku')}
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 uppercase tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldCategory')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(getCategoryKey(c))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldStatus')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="active">{t('productModal.statusActiveOpt')}</option>
              <option value="draft">{t('productModal.statusDraftOpt')}</option>
              <option value="archived">{t('productModal.statusArchivedOpt')}</option>
            </select>
          </div>
        </div>

        {/* Pricing + Live Margin */}
        <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldRetailPrice', { sym })}
            </label>
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
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldUnitCost', { sym })}
            </label>
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
            <span className="text-[11px] text-slate-500">{t('productModal.marginLabel')}</span>
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
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldStock')}
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('productModal.fieldThreshold')}
            </label>
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
          <label className="mb-1 block font-medium text-slate-700">
            {t('productModal.fieldDesc')}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('productModal.descPlaceholder')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium text-slate-700">
            {t('productModal.fieldSwatch')}
          </label>
          <div className="flex items-center gap-2">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSwatchColor(c)}
                aria-label={t('productModal.selectColorAria', { color: c })}
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

const REASON_KEYS = [
  'stockModal.reasonRestock',
  'stockModal.reasonCycle',
  'stockModal.reasonReturn',
  'stockModal.reasonDamaged',
] as const;

function StockAdjustModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { dispatch, pushToast } = useMerchant();
  const { t, tc } = useI18n();
  const [delta, setDelta] = useState('25');
  const [reasonKey, setReasonKey] = useState<(typeof REASON_KEYS)[number]>(REASON_KEYS[0]);

  useEffect(() => {
    if (product) {
      setDelta('25');
      setReasonKey(REASON_KEYS[0]);
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
      t('stockModal.toastTitle', { sku: product.sku }),
      t('stockModal.toastDesc', {
        from: product.stock,
        to: projected,
        reason: t(reasonKey),
      })
    );
    onClose();
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      title={t('stockModal.title')}
      subtitle={`${tc(product.name)} (${product.sku})`}
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="stock-adjust-form"
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {t('stockModal.submit', { count: projected })}
          </button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 tabular-nums">
          <div>
            <div className="text-[11px] text-slate-500">{t('stockModal.current')}</div>
            <div className="text-lg font-semibold text-slate-900">{product.stock}</div>
          </div>
          <div className="text-slate-400">→</div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">{t('stockModal.newOnHand')}</div>
            <div className="text-lg font-semibold text-teal-700">{projected}</div>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            {t('stockModal.deltaLabel')}
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
          <label className="mb-1 block font-medium text-slate-700">
            {t('stockModal.reasonLabel')}
          </label>
          <select
            value={reasonKey}
            onChange={(e) => setReasonKey(e.target.value as (typeof REASON_KEYS)[number])}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
          >
            {REASON_KEYS.map((rk) => (
              <option key={rk} value={rk}>
                {t(rk)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
