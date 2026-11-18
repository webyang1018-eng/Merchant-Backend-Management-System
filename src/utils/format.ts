import type { CurrencyCode, Promotion } from '../types/merchant';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string }> = {
  USD: { locale: 'en-US', symbol: '$' },
  SGD: { locale: 'en-SG', symbol: 'S$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
};

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'USD',
  options?: { compact?: boolean; signed?: boolean }
): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : options?.signed && amount > 0 ? '+' : '';
  const { symbol } = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;

  if (options?.compact) {
    if (abs >= 1_000_000) {
      const m = (abs / 1_000_000).toFixed(2).replace(/\.00$/, '');
      return `${sign}${symbol}${m}M`;
    }
    if (abs >= 1_000) {
      const k = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
      return `${sign}${symbol}${k}k`;
    }
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return `${sign}${symbol}${formatted}`;
}

export function getCurrencySymbol(currency: CurrencyCode = 'USD'): string {
  return (CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD).symbol;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(iso: string, includeTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (!includeTime) return datePart;
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function calculateMargin(price: number, cost: number): { profit: number; marginPct: number } {
  if (price <= 0) return { profit: 0, marginPct: 0 };
  const profit = Number((price - cost).toFixed(2));
  const marginPct = Number((((price - cost) / price) * 100).toFixed(1));
  return { profit, marginPct };
}

export function computePromoDiscount(
  promo: Promotion | undefined,
  subtotal: number,
  shippingFee: number
): { discount: number; adjustedShipping: number; error?: string } {
  if (!promo) {
    return { discount: 0, adjustedShipping: shippingFee };
  }
  if (promo.status !== 'active') {
    return {
      discount: 0,
      adjustedShipping: shippingFee,
      error: `Code ${promo.code} is currently ${promo.status}.`,
    };
  }
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    return {
      discount: 0,
      adjustedShipping: shippingFee,
      error: `Code ${promo.code} has reached its usage limit.`,
    };
  }
  if (subtotal < promo.minOrderAmount) {
    return {
      discount: 0,
      adjustedShipping: shippingFee,
      error: `Requires a minimum subtotal of ${promo.minOrderAmount.toFixed(2)}.`,
    };
  }

  if (promo.type === 'percentage') {
    const discount = Number(((subtotal * promo.value) / 100).toFixed(2));
    return { discount: Math.min(discount, subtotal), adjustedShipping: shippingFee };
  }
  if (promo.type === 'fixed') {
    return { discount: Math.min(promo.value, subtotal), adjustedShipping: shippingFee };
  }
  // free_shipping
  return { discount: 0, adjustedShipping: 0 };
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const content = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
    '\n'
  );
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
