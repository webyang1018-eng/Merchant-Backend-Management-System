import { createInitialMerchantState } from '../data/seedData';
import type {
  Customer,
  MerchantState,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductStatus,
  Promotion,
  SalesChannel,
  ShippingZone,
  StaffMember,
  StaffRole,
  StoreSettings,
} from '../types/merchant';
import { computePromoDiscount } from '../utils/format';

export interface CreateOrderPayload {
  customerId: string;
  shippingAddress: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  markPaid: boolean;
  items: { productId: string; quantity: number }[];
  promoCode?: string;
  shippingFee: number;
  note?: string;
}

export type MerchantAction =
  | { type: 'ADD_PRODUCT'; payload: Omit<Product, 'id' | 'soldCount' | 'updatedAt'> }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCTS'; payload: string[] }
  | { type: 'BULK_PRODUCT_STATUS'; payload: { ids: string[]; status: ProductStatus } }
  | { type: 'ADJUST_STOCK'; payload: { productId: string; newStock: number } }
  | { type: 'CREATE_ORDER'; payload: CreateOrderPayload }
  | { type: 'MARK_ORDER_PAID'; payload: { orderId: string } }
  | {
      type: 'SHIP_ORDER';
      payload: { orderId: string; carrier: string; trackingNumber: string };
    }
  | {
      type: 'BULK_SHIP_ORDERS';
      payload: { orderIds: string[]; carrier: string };
    }
  | { type: 'DELIVER_ORDER'; payload: { orderId: string } }
  | {
      type: 'REFUND_OR_CANCEL_ORDER';
      payload: {
        orderId: string;
        targetStatus: 'refunded' | 'cancelled';
        reason: string;
        restock: boolean;
      };
    }
  | { type: 'ADD_ORDER_NOTE'; payload: { orderId: string; note: string; actor?: string } }
  | {
      type: 'ADD_CUSTOMER';
      payload: Omit<Customer, 'id' | 'joinedAt' | 'historicalOrders' | 'historicalSpend' | 'lastOrderAt'>;
    }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'ADD_PROMOTION'; payload: Omit<Promotion, 'id' | 'usageCount'> }
  | { type: 'UPDATE_PROMOTION'; payload: Promotion }
  | { type: 'TOGGLE_PROMOTION'; payload: { id: string } }
  | { type: 'DELETE_PROMOTION'; payload: { id: string } }
  | {
      type: 'REQUEST_PAYOUT';
      payload: { amount: number; method: 'Standard ACH' | 'Instant Transfer' };
    }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<StoreSettings> }
  | { type: 'UPDATE_SHIPPING_ZONE'; payload: ShippingZone }
  | { type: 'ADD_SHIPPING_ZONE'; payload: Omit<ShippingZone, 'id'> }
  | { type: 'INVITE_STAFF'; payload: { name: string; email: string; role: StaffRole } }
  | { type: 'UPDATE_STAFF_ROLE'; payload: { id: string; role: StaffRole } }
  | { type: 'REMOVE_STAFF'; payload: { id: string } }
  | { type: 'MARK_ALERTS_READ'; payload: string[] }
  | { type: 'SET_ORDER_FILTER_PRESET'; payload: string | null }
  | { type: 'SET_PRODUCT_FILTER_PRESET'; payload: string | null }
  | { type: 'RESET_DEMO_DATA' };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function merchantReducer(state: MerchantState, action: MerchantAction): MerchantState {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const created: Product = {
        ...action.payload,
        id: uid('prod'),
        soldCount: 0,
        updatedAt: nowIso(),
      };
      return {
        ...state,
        products: [created, ...state.products],
      };
    }

    case 'UPDATE_PRODUCT': {
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? { ...action.payload, updatedAt: nowIso() } : p
        ),
      };
    }

    case 'DELETE_PRODUCTS': {
      const idSet = new Set(action.payload);
      return {
        ...state,
        products: state.products.filter((p) => !idSet.has(p.id)),
      };
    }

    case 'BULK_PRODUCT_STATUS': {
      const idSet = new Set(action.payload.ids);
      const ts = nowIso();
      return {
        ...state,
        products: state.products.map((p) =>
          idSet.has(p.id) ? { ...p, status: action.payload.status, updatedAt: ts } : p
        ),
      };
    }

    case 'ADJUST_STOCK': {
      const clamped = Math.max(0, Math.floor(action.payload.newStock));
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.productId ? { ...p, stock: clamped, updatedAt: nowIso() } : p
        ),
      };
    }

    case 'CREATE_ORDER': {
      const customer = state.customers.find((c) => c.id === action.payload.customerId);
      if (!customer || action.payload.items.length === 0) return state;

      const ts = nowIso();
      const orderItems: OrderItem[] = [];
      for (const req of action.payload.items) {
        const prod = state.products.find((p) => p.id === req.productId);
        if (!prod || req.quantity <= 0) continue;
        orderItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          unitPrice: prod.price,
          quantity: req.quantity,
          swatchColor: prod.swatchColor,
        });
      }
      if (orderItems.length === 0) return state;

      const subtotal = Number(
        orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
      );

      const baseShipping =
        subtotal >= state.settings.freeShippingThreshold ? 0 : action.payload.shippingFee;

      const codeUpper = action.payload.promoCode?.trim().toUpperCase();
      const matchedPromo = codeUpper
        ? state.promotions.find((pr) => pr.code.toUpperCase() === codeUpper)
        : undefined;

      const { discount, adjustedShipping, error } = computePromoDiscount(
        matchedPromo,
        subtotal,
        baseShipping
      );
      const validPromo = matchedPromo && !error ? matchedPromo : undefined;

      const taxable = Math.max(0, subtotal - discount);
      const tax = Number(((taxable * state.settings.taxRate) / 100).toFixed(2));
      const total = Number((taxable + adjustedShipping + tax).toFixed(2));

      const maxNum = state.orders.reduce((max, o) => {
        const m = o.orderNumber.match(/(\d+)$/);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 1048);
      const nextOrderNumber = `#HL-${maxNum + 1}`;
      const status: OrderStatus = action.payload.markPaid ? 'to_fulfill' : 'pending_payment';

      const events: Order['events'] = [
        {
          id: uid('ev'),
          timestamp: ts,
          title: `Manual order created (${action.payload.channel})`,
          detail: validPromo ? `Promo code ${validPromo.code} applied` : undefined,
          type: 'status',
          actor: 'Elena Rostova',
        },
      ];
      if (action.payload.markPaid) {
        events.push({
          id: uid('ev'),
          timestamp: ts,
          title: `Payment captured (${total.toFixed(2)})`,
          detail: `Processed via ${action.payload.paymentMethod}`,
          type: 'payment',
        });
      }
      if (action.payload.note?.trim()) {
        events.push({
          id: uid('ev'),
          timestamp: ts,
          title: 'Internal note added',
          detail: action.payload.note.trim(),
          type: 'note',
          actor: 'Elena Rostova',
        });
      }

      const newOrder: Order = {
        id: uid('ord'),
        orderNumber: nextOrderNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        shippingAddress:
          action.payload.shippingAddress.trim() || `${customer.city}, ${customer.country}`,
        channel: action.payload.channel,
        paymentMethod: action.payload.paymentMethod,
        status,
        items: orderItems,
        subtotal,
        discount,
        promoCode: validPromo?.code,
        shippingFee: adjustedShipping,
        tax,
        total,
        createdAt: ts,
        updatedAt: ts,
        events,
      };

      const qtyByProd = new Map<string, number>();
      for (const item of orderItems) {
        qtyByProd.set(item.productId, (qtyByProd.get(item.productId) ?? 0) + item.quantity);
      }

      const updatedProducts = state.products.map((p) => {
        const used = qtyByProd.get(p.id);
        if (!used) return p;
        return {
          ...p,
          stock: Math.max(0, p.stock - used),
          soldCount: p.soldCount + used,
          updatedAt: ts,
        };
      });

      const updatedPromotions = validPromo
        ? state.promotions.map((pr) =>
            pr.id === validPromo.id ? { ...pr, usageCount: pr.usageCount + 1 } : pr
          )
        : state.promotions;

      const updatedCustomers = state.customers.map((c) =>
        c.id === customer.id ? { ...c, lastOrderAt: ts } : c
      );

      const fee = Number((total * 0.029 + 0.3).toFixed(2));
      const updatedLedger = action.payload.markPaid
        ? [
            {
              id: uid('led'),
              createdAt: ts,
              type: 'charge' as const,
              reference: nextOrderNumber,
              description: `${action.payload.paymentMethod} capture — ${customer.name}`,
              gross: total,
              fee,
              net: Number((total - fee).toFixed(2)),
              status: 'pending' as const,
            },
            ...state.ledger,
          ]
        : state.ledger;

      return {
        ...state,
        products: updatedProducts,
        promotions: updatedPromotions,
        customers: updatedCustomers,
        orders: [newOrder, ...state.orders],
        ledger: updatedLedger,
      };
    }

    case 'MARK_ORDER_PAID': {
      const target = state.orders.find((o) => o.id === action.payload.orderId);
      if (!target || target.status !== 'pending_payment') return state;
      const ts = nowIso();
      const fee = Number((target.total * 0.029 + 0.3).toFixed(2));

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === target.id
            ? {
                ...o,
                status: 'to_fulfill',
                updatedAt: ts,
                events: [
                  ...o.events,
                  {
                    id: uid('ev'),
                    timestamp: ts,
                    title: `Payment confirmed (${o.total.toFixed(2)})`,
                    detail: `Verified via ${o.paymentMethod}`,
                    type: 'payment',
                    actor: 'Elena Rostova',
                  },
                ],
              }
            : o
        ),
        ledger: [
          {
            id: uid('led'),
            createdAt: ts,
            type: 'charge',
            reference: target.orderNumber,
            description: `${target.paymentMethod} capture — ${target.customerName}`,
            gross: target.total,
            fee,
            net: Number((target.total - fee).toFixed(2)),
            status: 'pending',
          },
          ...state.ledger,
        ],
      };
    }

    case 'SHIP_ORDER': {
      const ts = nowIso();
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.payload.orderId) return o;
          return {
            ...o,
            status: 'shipped',
            carrier: action.payload.carrier,
            trackingNumber: action.payload.trackingNumber,
            updatedAt: ts,
            events: [
              ...o.events,
              {
                id: uid('ev'),
                timestamp: ts,
                title: `Shipment dispatched via ${action.payload.carrier}`,
                detail: `Tracking #${action.payload.trackingNumber}`,
                type: 'fulfillment',
                actor: 'Elena Rostova',
              },
            ],
          };
        }),
      };
    }

    case 'BULK_SHIP_ORDERS': {
      const idSet = new Set(action.payload.orderIds);
      const ts = nowIso();
      const prefix = action.payload.carrier.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'TRK';
      return {
        ...state,
        orders: state.orders.map((o, idx) => {
          if (!idSet.has(o.id) || o.status !== 'to_fulfill') return o;
          const tracking = `${prefix}${Date.now().toString().slice(-7)}${idx}`;
          return {
            ...o,
            status: 'shipped',
            carrier: action.payload.carrier,
            trackingNumber: tracking,
            updatedAt: ts,
            events: [
              ...o.events,
              {
                id: uid('ev'),
                timestamp: ts,
                title: `Batch dispatched via ${action.payload.carrier}`,
                detail: `Tracking #${tracking}`,
                type: 'fulfillment',
                actor: 'Elena Rostova',
              },
            ],
          };
        }),
      };
    }

    case 'DELIVER_ORDER': {
      const target = state.orders.find((o) => o.id === action.payload.orderId);
      if (!target || target.status !== 'shipped') return state;
      const ts = nowIso();

      let settledIncrement = 0;
      const updatedLedger = state.ledger.map((entry) => {
        if (entry.reference === target.orderNumber && entry.type === 'charge' && entry.status === 'pending') {
          settledIncrement += entry.net;
          return { ...entry, status: 'settled' as const };
        }
        return entry;
      });

      return {
        ...state,
        availableBalance: Number((state.availableBalance + settledIncrement).toFixed(2)),
        ledger: updatedLedger,
        orders: state.orders.map((o) =>
          o.id === target.id
            ? {
                ...o,
                status: 'delivered',
                updatedAt: ts,
                events: [
                  ...o.events,
                  {
                    id: uid('ev'),
                    timestamp: ts,
                    title: 'Order marked as delivered',
                    detail: o.trackingNumber ? `Carrier confirmed delivery (#${o.trackingNumber})` : undefined,
                    type: 'status',
                    actor: 'Elena Rostova',
                  },
                ],
              }
            : o
        ),
      };
    }

    case 'REFUND_OR_CANCEL_ORDER': {
      const target = state.orders.find((o) => o.id === action.payload.orderId);
      if (!target) return state;
      const ts = nowIso();
      const wasPaid = target.status !== 'pending_payment' && target.status !== 'cancelled' && target.status !== 'refunded';

      let updatedProducts = state.products;
      if (action.payload.restock) {
        const restockMap = new Map<string, number>();
        for (const item of target.items) {
          restockMap.set(item.productId, (restockMap.get(item.productId) ?? 0) + item.quantity);
        }
        updatedProducts = state.products.map((p) => {
          const add = restockMap.get(p.id);
          if (!add) return p;
          return {
            ...p,
            stock: p.stock + add,
            soldCount: Math.max(0, p.soldCount - add),
            updatedAt: ts,
          };
        });
      }

      const updatedLedger = wasPaid
        ? [
            {
              id: uid('led'),
              createdAt: ts,
              type: 'refund' as const,
              reference: target.orderNumber,
              description: `${action.payload.targetStatus === 'refunded' ? 'Refund issued' : 'Order cancelled'} — ${target.customerName}`,
              gross: -target.total,
              fee: 0,
              net: -target.total,
              status: 'settled' as const,
            },
            ...state.ledger,
          ]
        : state.ledger;

      const updatedBalance = wasPaid
        ? Math.max(0, Number((state.availableBalance - target.total).toFixed(2)))
        : state.availableBalance;

      const label =
        action.payload.targetStatus === 'refunded' ? 'Full refund issued' : 'Order cancelled';
      const detailParts = [
        action.payload.reason.trim() || 'Processed by merchant',
        action.payload.restock ? 'Inventory restocked' : 'Inventory not restocked',
      ];

      return {
        ...state,
        products: updatedProducts,
        ledger: updatedLedger,
        availableBalance: updatedBalance,
        orders: state.orders.map((o) =>
          o.id === target.id
            ? {
                ...o,
                status: action.payload.targetStatus,
                refundReason: action.payload.reason.trim() || o.refundReason,
                updatedAt: ts,
                events: [
                  ...o.events,
                  {
                    id: uid('ev'),
                    timestamp: ts,
                    title: label,
                    detail: detailParts.join(' · '),
                    type: 'refund',
                    actor: 'Elena Rostova',
                  },
                ],
              }
            : o
        ),
      };
    }

    case 'ADD_ORDER_NOTE': {
      const note = action.payload.note.trim();
      if (!note) return state;
      const ts = nowIso();
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.orderId
            ? {
                ...o,
                updatedAt: ts,
                events: [
                  ...o.events,
                  {
                    id: uid('ev'),
                    timestamp: ts,
                    title: 'Internal note added',
                    detail: note,
                    type: 'note',
                    actor: action.payload.actor ?? 'Elena Rostova',
                  },
                ],
              }
            : o
        ),
      };
    }

    case 'ADD_CUSTOMER': {
      const ts = nowIso();
      const created: Customer = {
        ...action.payload,
        id: uid('cust'),
        joinedAt: ts,
        historicalOrders: 0,
        historicalSpend: 0,
        lastOrderAt: ts,
      };
      return {
        ...state,
        customers: [created, ...state.customers],
      };
    }

    case 'UPDATE_CUSTOMER': {
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    }

    case 'ADD_PROMOTION': {
      const created: Promotion = {
        ...action.payload,
        code: action.payload.code.trim().toUpperCase(),
        id: uid('promo'),
        usageCount: 0,
      };
      return {
        ...state,
        promotions: [created, ...state.promotions],
      };
    }

    case 'UPDATE_PROMOTION': {
      return {
        ...state,
        promotions: state.promotions.map((pr) =>
          pr.id === action.payload.id
            ? { ...action.payload, code: action.payload.code.trim().toUpperCase() }
            : pr
        ),
      };
    }

    case 'TOGGLE_PROMOTION': {
      return {
        ...state,
        promotions: state.promotions.map((pr) => {
          if (pr.id !== action.payload.id) return pr;
          const nextStatus = pr.status === 'active' ? 'paused' : 'active';
          return { ...pr, status: nextStatus };
        }),
      };
    }

    case 'DELETE_PROMOTION': {
      return {
        ...state,
        promotions: state.promotions.filter((pr) => pr.id !== action.payload.id),
      };
    }

    case 'REQUEST_PAYOUT': {
      const amount = Number(action.payload.amount.toFixed(2));
      if (amount <= 0 || amount > state.availableBalance) return state;
      const ts = nowIso();
      const arrival = new Date();
      if (action.payload.method === 'Standard ACH') {
        arrival.setDate(arrival.getDate() + 2);
      }
      const fee =
        action.payload.method === 'Instant Transfer' ? Number((amount * 0.01).toFixed(2)) : 0;
      const net = Number((amount - fee).toFixed(2));
      const ref = `PO-2026-${Math.floor(1200 + Math.random() * 8700)}`;

      return {
        ...state,
        availableBalance: Number((state.availableBalance - amount).toFixed(2)),
        payouts: [
          {
            id: uid('po'),
            reference: ref,
            initiatedAt: ts,
            arrivalDate: arrival.toISOString().slice(0, 10),
            destination: state.settings.settlementBank,
            method: action.payload.method,
            grossAmount: amount,
            fee,
            netAmount: net,
            status: 'processing',
          },
          ...state.payouts,
        ],
        ledger: [
          {
            id: uid('led'),
            createdAt: ts,
            type: 'payout',
            reference: ref,
            description: `${action.payload.method} withdrawal to ${state.settings.settlementBank}`,
            gross: -amount,
            fee,
            net: -net,
            status: 'pending',
          },
          ...state.ledger,
        ],
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
          notifications: action.payload.notifications
            ? { ...state.settings.notifications, ...action.payload.notifications }
            : state.settings.notifications,
        },
      };
    }

    case 'UPDATE_SHIPPING_ZONE': {
      return {
        ...state,
        shippingZones: state.shippingZones.map((z) =>
          z.id === action.payload.id ? action.payload : z
        ),
      };
    }

    case 'ADD_SHIPPING_ZONE': {
      return {
        ...state,
        shippingZones: [...state.shippingZones, { ...action.payload, id: uid('zone') }],
      };
    }

    case 'INVITE_STAFF': {
      const member: StaffMember = {
        id: uid('stf'),
        name: action.payload.name.trim(),
        email: action.payload.email.trim().toLowerCase(),
        role: action.payload.role,
        status: 'invited',
        lastActive: 'Invite sent just now',
      };
      return {
        ...state,
        staff: [...state.staff, member],
      };
    }

    case 'UPDATE_STAFF_ROLE': {
      return {
        ...state,
        staff: state.staff.map((m) =>
          m.id === action.payload.id ? { ...m, role: action.payload.role } : m
        ),
      };
    }

    case 'REMOVE_STAFF': {
      return {
        ...state,
        staff: state.staff.filter((m) => m.id !== action.payload.id || m.role === 'Owner'),
      };
    }

    case 'MARK_ALERTS_READ': {
      const merged = Array.from(new Set([...state.readAlertIds, ...action.payload]));
      return {
        ...state,
        readAlertIds: merged,
      };
    }

    case 'SET_ORDER_FILTER_PRESET': {
      return { ...state, orderFilterPreset: action.payload };
    }

    case 'SET_PRODUCT_FILTER_PRESET': {
      return { ...state, productFilterPreset: action.payload };
    }

    case 'RESET_DEMO_DATA': {
      return createInitialMerchantState();
    }

    default:
      return state;
  }
}
