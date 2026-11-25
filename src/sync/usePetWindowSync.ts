import { useCallback, useEffect, useRef, useState } from 'react';
import type { PetSignalSnapshot, PetToMainIntent } from '../utils/merchantSignals';
import { createSyncTransport, type SyncTransport } from './tauriPetBridge';

export interface UsePetWindowSyncResult {
  snapshot: PetSignalSnapshot | null;
  connected: boolean;
  sendIntent: (intent: PetToMainIntent) => Promise<void>;
  startDragging: () => Promise<void>;
  setIgnoreCursorEvents: (ignore: boolean) => Promise<void>;
}

/**
 * Runs inside the lightweight `pet` window.
 * - Listens to `mercato://pet-snapshot` events from `main`, guarding against out-of-order revs.
 * - Sends `mercato://pet-ready` handshake on mount and periodically retries until first snapshot arrives.
 * - Provides `sendIntent` to trigger navigation/actions back in the `main` window.
 */
export function usePetWindowSync(customTransport?: SyncTransport): UsePetWindowSyncResult {
  const transportRef = useRef<SyncTransport | null>(null);
  if (!transportRef.current) {
    transportRef.current = customTransport ?? createSyncTransport();
  }

  const [snapshot, setSnapshot] = useState<PetSignalSnapshot | null>(null);
  const highestRevRef = useRef<number>(0);

  useEffect(() => {
    const transport = transportRef.current;
    if (!transport) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;
    let handshakeTimer: number | undefined;

    void (async () => {
      unlisten = await transport.listenSnapshot((incoming) => {
        // Ignore stale or out-of-order deliveries; accept rev=1 if reconnecting from fresh main
        if (incoming.rev < highestRevRef.current && incoming.rev > 1) {
          return;
        }
        highestRevRef.current = incoming.rev;
        if (!disposed) {
          setSnapshot(incoming);
          if (handshakeTimer !== undefined) {
            window.clearInterval(handshakeTimer);
            handshakeTimer = undefined;
          }
        }
      });

      if (disposed) {
        void Promise.resolve(unlisten()).catch(() => {});
        return;
      }

      const sendReady = () => {
        void transport.emitPetReadyToMain().catch(() => {});
      };

      // Initial handshake + short retry loop in case main window finished mounting after pet
      sendReady();
      handshakeTimer = window.setInterval(() => {
        if (highestRevRef.current === 0) {
          sendReady();
        } else if (handshakeTimer !== undefined) {
          window.clearInterval(handshakeTimer);
          handshakeTimer = undefined;
        }
      }, 600);
    })();

    return () => {
      disposed = true;
      if (handshakeTimer !== undefined) {
        window.clearInterval(handshakeTimer);
      }
      if (unlisten) {
        void Promise.resolve(unlisten()).catch(() => {});
      }
    };
  }, []);

  const sendIntent = useCallback(async (intent: PetToMainIntent) => {
    await transportRef.current?.emitIntentToMain(intent);
  }, []);

  const startDragging = useCallback(async () => {
    await transportRef.current?.startPetWindowDragging();
  }, []);

  const setIgnoreCursorEvents = useCallback(async (ignore: boolean) => {
    await transportRef.current?.setPetIgnoreCursorEvents(ignore);
  }, []);

  return {
    snapshot,
    connected: snapshot !== null,
    sendIntent,
    startDragging,
    setIgnoreCursorEvents,
  };
}
