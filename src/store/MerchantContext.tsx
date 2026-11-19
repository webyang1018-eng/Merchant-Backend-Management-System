import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { createInitialMerchantState } from '../data/seedData';
import type { MerchantState, NavSection, ToastMessage } from '../types/merchant';
import { merchantReducer, type MerchantAction } from './merchantReducer';

const STORAGE_KEY = 'mercato_merchant_state_v1';

function loadInitialState(): MerchantState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialMerchantState();
    const parsed = JSON.parse(raw) as Partial<MerchantState>;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
      return createInitialMerchantState();
    }
    return {
      ...createInitialMerchantState(),
      ...parsed,
      orderFilterPreset: null,
      productFilterPreset: null,
    };
  } catch {
    return createInitialMerchantState();
  }
}

interface MerchantContextValue {
  state: MerchantState;
  dispatch: React.Dispatch<MerchantAction>;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  navigateWithOrderFilter: (filter: string) => void;
  navigateWithProductFilter: (filter: string) => void;
  inspectOrderId: string | null;
  setInspectOrderId: (orderId: string | null) => void;
  inspectCustomerId: string | null;
  setInspectCustomerId: (customerId: string | null) => void;
  quickAction: 'new_product' | 'new_order' | 'new_promo' | 'request_payout' | null;
  setQuickAction: (action: 'new_product' | 'new_order' | 'new_promo' | 'request_payout' | null) => void;
  toasts: ToastMessage[];
  pushToast: (title: string, description?: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

const MerchantContext = createContext<MerchantContextValue | null>(null);

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(merchantReducer, undefined, loadInitialState);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [inspectOrderId, setInspectOrderId] = useState<string | null>(null);
  const [inspectCustomerId, setInspectCustomerId] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<
    'new_product' | 'new_order' | 'new_promo' | 'request_payout' | null
  >(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      const toPersist = {
        ...state,
        orderFilterPreset: null,
        productFilterPreset: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {
      // Ignore quota errors in restricted browsers
    }
  }, [state]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, description?: string, tone: ToastMessage['tone'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const navigateWithOrderFilter = useCallback((filter: string) => {
    dispatch({ type: 'SET_ORDER_FILTER_PRESET', payload: filter });
    setActiveSection('orders');
  }, []);

  const navigateWithProductFilter = useCallback((filter: string) => {
    dispatch({ type: 'SET_PRODUCT_FILTER_PRESET', payload: filter });
    setActiveSection('products');
  }, []);

  const value = useMemo<MerchantContextValue>(
    () => ({
      state,
      dispatch,
      activeSection,
      setActiveSection,
      navigateWithOrderFilter,
      navigateWithProductFilter,
      inspectOrderId,
      setInspectOrderId,
      inspectCustomerId,
      setInspectCustomerId,
      quickAction,
      setQuickAction,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      state,
      activeSection,
      navigateWithOrderFilter,
      navigateWithProductFilter,
      inspectOrderId,
      inspectCustomerId,
      quickAction,
      toasts,
      pushToast,
      dismissToast,
    ]
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}

export function useMerchant(): MerchantContextValue {
  const ctx = useContext(MerchantContext);
  if (!ctx) {
    throw new Error('useMerchant must be used within MerchantProvider');
  }
  return ctx;
}
