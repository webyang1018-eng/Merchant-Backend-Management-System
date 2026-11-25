import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useMerchant } from '../store/MerchantContext';
import {
  derivePetSignalSnapshot,
  getSnapshotContentKey,
  type PetToMainIntent,
} from '../utils/merchantSignals';
import { createSyncTransport, type SyncTransport } from './tauriPetBridge';

/**
 * Runs inside the `main` window (inside I18nProvider + MerchantProvider).
 * - Projects lightweight PetSignalSnapshot diffs to the `pet` window via emitTo.
 * - Responds to `mercato://pet-ready` handshake requests with the latest snapshot.
 * - Applies incoming `PetToMainIntent` actions and focuses the main window when needed.
 */
export function useMainWindowPetSync(customTransport?: SyncTransport): void {
  const {
    state,
    dispatch,
    setActiveSection,
    navigateWithOrderFilter,
    navigateWithProductFilter,
    setInspectOrderId,
    setQuickAction,
    latestFeedback,
  } = useMerchant();
  const { locale, setLocale } = useI18n();

  const transportRef = useRef<SyncTransport | null>(null);
  if (!transportRef.current) {
    transportRef.current = customTransport ?? createSyncTransport();
  }

  const revRef = useRef(0);
  const lastContentKeyRef = useRef<string>('');
  const latestSnapshotRef = useRef(
    derivePetSignalSnapshot(state, locale, revRef.current, latestFeedback)
  );

  // Keep latest snapshot updated and publish whenever content changes
  useEffect(() => {
    const draft = derivePetSignalSnapshot(state, locale, revRef.current, latestFeedback);
    const contentKey = getSnapshotContentKey(draft);

    if (contentKey !== lastContentKeyRef.current) {
      lastContentKeyRef.current = contentKey;
      revRef.current += 1;
      const nextSnapshot = {
        ...draft,
        rev: revRef.current,
        updatedAt: new Date().toISOString(),
      };
      latestSnapshotRef.current = nextSnapshot;
      void transportRef.current?.emitSnapshotToPet(nextSnapshot).catch(() => {
        // Pet window may not be mounted yet; handshake handles replay
      });
    }
  }, [state, locale, latestFeedback]);

  // Keep latest intent handler refs so listeners never register stale closures
  const intentHandlerRef = useRef<(intent: PetToMainIntent) => void>(() => {});
  intentHandlerRef.current = (intent: PetToMainIntent) => {
    const transport = transportRef.current;
    const focusMain = () => {
      void transport?.focusMainWindow().catch(() => {});
    };

    switch (intent.type) {
      case 'OPEN_MAIN_SECTION':
        setActiveSection(intent.section);
        focusMain();
        break;
      case 'OPEN_ORDER_FILTER':
        navigateWithOrderFilter(intent.filter);
        focusMain();
        break;
      case 'OPEN_PRODUCT_FILTER':
        navigateWithProductFilter(intent.filter);
        focusMain();
        break;
      case 'INSPECT_ORDER':
        setActiveSection('orders');
        setInspectOrderId(intent.orderId);
        focusMain();
        break;
      case 'TRIGGER_QUICK_ACTION':
        if (intent.action === 'new_order') setActiveSection('orders');
        else if (intent.action === 'new_product') setActiveSection('products');
        else if (intent.action === 'new_promo') setActiveSection('promotions');
        else if (intent.action === 'request_payout') setActiveSection('finance');
        setQuickAction(intent.action);
        focusMain();
        break;
      case 'MARK_ALERTS_READ':
        if (intent.alertIds.length > 0) {
          dispatch({ type: 'MARK_ALERTS_READ', payload: intent.alertIds });
        }
        break;
      case 'SET_LOCALE':
        setLocale(intent.locale);
        break;
    }
  };

  useEffect(() => {
    const transport = transportRef.current;
    if (!transport) return;

    let disposed = false;
    const unlisteners: (() => void)[] = [];

    void (async () => {
      const unlistenReady = await transport.listenPetReady(() => {
        // Bump rev or replay latest snapshot directly so pet synchronizes immediately
        if (revRef.current === 0) {
          revRef.current = 1;
          latestSnapshotRef.current = {
            ...latestSnapshotRef.current,
            rev: 1,
            updatedAt: new Date().toISOString(),
          };
        }
        void transport.emitSnapshotToPet(latestSnapshotRef.current).catch(() => {});
      });

      const unlistenIntent = await transport.listenIntent((intent) => {
        intentHandlerRef.current(intent);
      });

      if (disposed) {
        void Promise.resolve(unlistenReady()).catch(() => {});
        void Promise.resolve(unlistenIntent()).catch(() => {});
        return;
      }

      unlisteners.push(
        () => void Promise.resolve(unlistenReady()).catch(() => {}),
        () => void Promise.resolve(unlistenIntent()).catch(() => {})
      );
    })();

    return () => {
      disposed = true;
      for (const fn of unlisteners) {
        fn();
      }
    };
  }, []);
}
