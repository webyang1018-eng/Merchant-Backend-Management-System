import { describe, expect, it } from 'vitest';
import { createInitialMerchantState } from '../data/seedData';
import { calculateMargin, computePromoDiscount, formatCurrency } from '../utils/format';
import { merchantReducer } from './merchantReducer';

describe('merchantReducer & commerce calculations', () => {
  it('adds, edits, adjusts stock, and bulk-updates products', () => {
    let state = createInitialMerchantState();
    const initialCount = state.products.length;

    state = merchantReducer(state, {
      type: 'ADD_PRODUCT',
      payload: {
        sku: 'HL-AP-999',
        name: 'Cashmere Scarf — Camel',
        category: 'Apparel',
        status: 'active',
        price: 160,
        cost: 56,
        stock: 20,
        lowStockThreshold: 8,
        description: 'Brushed Mongolian cashmere scarf.',
        swatchColor: '#92400E',
      },
    });

    expect(state.products).toHaveLength(initialCount + 1);
    const added = state.products[0];
    expect(added.sku).toBe('HL-AP-999');
    expect(calculateMargin(added.price, added.cost)).toEqual({ profit: 104, marginPct: 65 });

    state = merchantReducer(state, {
      type: 'ADJUST_STOCK',
      payload: { productId: added.id, newStock: 45 },
    });
    expect(state.products[0].stock).toBe(45);

    state = merchantReducer(state, {
      type: 'BULK_PRODUCT_STATUS',
      payload: { ids: [added.id], status: 'archived' },
    });
    expect(state.products[0].status).toBe('archived');
  });

  it('creates a paid order with promo code, deducts inventory, ships, and settles on delivery', () => {
    let state = createInitialMerchantState();
    const prod = state.products.find((p) => p.id === 'prod-01')!; // $298.00, stock 28
    const promo = state.promotions.find((pr) => pr.code === 'AUTUMN20')!; // 20% off >= $180
    const initialBalance = state.availableBalance;

    state = merchantReducer(state, {
      type: 'CREATE_ORDER',
      payload: {
        customerId: 'cust-01',
        shippingAddress: '18 Everton Rd, Singapore',
        channel: 'Online Store',
        paymentMethod: 'Visa •••• 4242',
        markPaid: true,
        items: [{ productId: prod.id, quantity: 2 }],
        promoCode: 'autumn20',
        shippingFee: 12,
        note: 'Priority client order',
      },
    });

    const created = state.orders[0];
    expect(created.orderNumber).toBe('#HL-1049');
    expect(created.status).toBe('to_fulfill');
    expect(created.subtotal).toBe(596);
    expect(created.discount).toBe(119.2); // 20% off 596
    expect(created.shippingFee).toBe(0); // Over free shipping threshold ($150)
    expect(created.promoCode).toBe('AUTUMN20');

    // Inventory decremented and promo usage incremented
    expect(state.products.find((p) => p.id === prod.id)!.stock).toBe(prod.stock - 2);
    expect(state.promotions.find((pr) => pr.id === promo.id)!.usageCount).toBe(
      promo.usageCount + 1
    );

    // Ship the order
    state = merchantReducer(state, {
      type: 'SHIP_ORDER',
      payload: { orderId: created.id, carrier: 'DHL Express', trackingNumber: 'DHL123456789' },
    });
    expect(state.orders[0].status).toBe('shipped');
    expect(state.orders[0].trackingNumber).toBe('DHL123456789');

    // Deliver the order and settle pending charge to available balance
    state = merchantReducer(state, {
      type: 'DELIVER_ORDER',
      payload: { orderId: created.id },
    });
    expect(state.orders[0].status).toBe('delivered');
    expect(state.availableBalance).toBeGreaterThan(initialBalance);
  });

  it('refunds an order and restocks line items when requested', () => {
    let state = createInitialMerchantState();
    const order = state.orders.find((o) => o.id === 'ord-1042')!;
    const carafeBefore = state.products.find((p) => p.id === 'prod-03')!.stock;

    state = merchantReducer(state, {
      type: 'REFUND_OR_CANCEL_ORDER',
      payload: {
        orderId: order.id,
        targetStatus: 'refunded',
        reason: 'Approved transit damage claim',
        restock: true,
      },
    });

    expect(state.orders.find((o) => o.id === order.id)!.status).toBe('refunded');
    expect(state.products.find((p) => p.id === 'prod-03')!.stock).toBe(carafeBefore + 1);
    expect(state.ledger[0].type).toBe('refund');
    expect(state.ledger[0].reference).toBe(order.orderNumber);
  });

  it('processes instant payout with 1% fee and prevents withdrawing over balance', () => {
    let state = createInitialMerchantState();
    const before = state.availableBalance;

    // Exceeding available balance should be ignored
    const rejected = merchantReducer(state, {
      type: 'REQUEST_PAYOUT',
      payload: { amount: before + 500, method: 'Standard ACH' },
    });
    expect(rejected.availableBalance).toBe(before);

    // Valid instant transfer
    state = merchantReducer(state, {
      type: 'REQUEST_PAYOUT',
      payload: { amount: 2000, method: 'Instant Transfer' },
    });
    expect(state.availableBalance).toBe(Number((before - 2000).toFixed(2)));
    expect(state.payouts[0].fee).toBe(20);
    expect(state.payouts[0].netAmount).toBe(1980);
    expect(state.payouts[0].status).toBe('processing');
  });

  it('protects the Owner staff member from removal and validates promo rules', () => {
    let state = createInitialMerchantState();
    const owner = state.staff.find((s) => s.role === 'Owner')!;
    state = merchantReducer(state, { type: 'REMOVE_STAFF', payload: { id: owner.id } });
    expect(state.staff.some((s) => s.id === owner.id)).toBe(true);

    const promo = state.promotions.find((p) => p.code === 'VIP30')!;
    const tooSmall = computePromoDiscount(promo, 100, 12);
    expect(tooSmall.discount).toBe(0);
    expect(tooSmall.error).toBeTruthy();

    expect(formatCurrency(1250.5, 'SGD')).toBe('S$1,250.50');
  });
});
