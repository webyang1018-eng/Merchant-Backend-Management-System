export type NavSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'customers'
  | 'promotions'
  | 'finance'
  | 'settings';

export type CurrencyCode = 'USD' | 'CNY' | 'SGD' | 'EUR' | 'GBP';

export type ProductStatus = 'active' | 'draft' | 'archived';

export type ProductCategory =
  | 'Apparel'
  | 'Leather Goods'
  | 'Home & Living'
  | 'Accessories'
  | 'Wellness';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  soldCount: number;
  description: string;
  swatchColor: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'to_fulfill'
  | 'shipped'
  | 'delivered'
  | 'refund_requested'
  | 'refunded'
  | 'cancelled';

export type SalesChannel = 'Online Store' | 'POS Retail' | 'Mobile App' | 'Wholesale B2B';

export type PaymentMethod =
  | 'Visa •••• 4242'
  | 'Mastercard •••• 8910'
  | 'Apple Pay'
  | 'PayNow'
  | 'Bank Transfer';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  swatchColor: string;
}

export interface OrderEvent {
  id: string;
  timestamp: string;
  title: string;
  detail?: string;
  type: 'status' | 'fulfillment' | 'payment' | 'note' | 'refund';
  actor?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  shippingFee: number;
  tax: number;
  total: number;
  carrier?: string;
  trackingNumber?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
}

export type CustomerSegment = 'VIP' | 'Returning' | 'New' | 'At Risk';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  segment: CustomerSegment;
  tags: string[];
  notes: string;
  joinedAt: string;
  historicalOrders: number;
  historicalSpend: number;
  lastOrderAt: string;
}

export type PromotionType = 'percentage' | 'fixed' | 'free_shipping';
export type PromotionStatus = 'active' | 'scheduled' | 'paused' | 'expired';

export interface Promotion {
  id: string;
  code: string;
  title: string;
  type: PromotionType;
  value: number;
  minOrderAmount: number;
  usageCount: number;
  usageLimit: number | null;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
}

export type PayoutStatus = 'paid' | 'in_transit' | 'processing';

export interface Payout {
  id: string;
  reference: string;
  initiatedAt: string;
  arrivalDate: string;
  destination: string;
  method: 'Standard ACH' | 'Instant Transfer';
  grossAmount: number;
  fee: number;
  netAmount: number;
  status: PayoutStatus;
}

export type LedgerType = 'charge' | 'refund' | 'payout';

export interface LedgerEntry {
  id: string;
  createdAt: string;
  type: LedgerType;
  reference: string;
  description: string;
  gross: number;
  fee: number;
  net: number;
  status: 'settled' | 'pending';
}

export type StaffRole =
  | 'Owner'
  | 'Store Manager'
  | 'Fulfillment Specialist'
  | 'Finance Analyst'
  | 'Support Agent';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: 'active' | 'invited';
  lastActive: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string;
  standardRate: number;
  expressRate: number;
  estimatedDays: string;
  enabled: boolean;
}

export interface StoreSettings {
  storeName: string;
  legalName: string;
  storeHandle: string;
  supportEmail: string;
  supportPhone: string;
  businessAddress: string;
  currency: CurrencyCode;
  timezone: string;
  storefrontLive: boolean;
  taxRate: number;
  freeShippingThreshold: number;
  settlementBank: string;
  autoPayoutSchedule: 'daily' | 'weekly' | 'manual';
  notifications: {
    newOrders: boolean;
    lowStockAlerts: boolean;
    refundRequests: boolean;
    payoutConfirmations: boolean;
    weeklyDigest: boolean;
  };
}

export interface DailyMetricPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  refunds: number;
}

export interface MerchantState {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
  payouts: Payout[];
  ledger: LedgerEntry[];
  availableBalance: number;
  staff: StaffMember[];
  shippingZones: ShippingZone[];
  settings: StoreSettings;
  readAlertIds: string[];
  orderFilterPreset: string | null;
  productFilterPreset: string | null;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: 'success' | 'info' | 'warning' | 'error';
}
