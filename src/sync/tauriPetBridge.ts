import { isTauri } from '@tauri-apps/api/core';
import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { PetSignalSnapshot, PetToMainIntent } from '../utils/merchantSignals';

export const PET_EVENTS = {
  SNAPSHOT: 'mercato://pet-snapshot',
  PET_READY: 'mercato://pet-ready',
  INTENT: 'mercato://pet-intent',
} as const;

export const WINDOW_LABELS = {
  MAIN: 'main',
  PET: 'pet',
} as const;

export interface SyncTransport {
  isDesktop: boolean;
  emitSnapshotToPet: (snapshot: PetSignalSnapshot) => Promise<void>;
  emitPetReadyToMain: () => Promise<void>;
  emitIntentToMain: (intent: PetToMainIntent) => Promise<void>;
  listenSnapshot: (handler: (snapshot: PetSignalSnapshot) => void) => Promise<UnlistenFn>;
  listenPetReady: (handler: () => void) => Promise<UnlistenFn>;
  listenIntent: (handler: (intent: PetToMainIntent) => void) => Promise<UnlistenFn>;
  focusMainWindow: () => Promise<void>;
  startPetWindowDragging: () => Promise<void>;
  setPetIgnoreCursorEvents: (ignore: boolean) => Promise<void>;
}

const BROADCAST_CHANNEL_NAME = 'mercato_pet_sync_v1';

function createWebFallbackTransport(): SyncTransport {
  const getChannel = () =>
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      : null;

  return {
    isDesktop: false,
    async emitSnapshotToPet(snapshot) {
      const ch = getChannel();
      if (!ch) return;
      ch.postMessage({ event: PET_EVENTS.SNAPSHOT, payload: snapshot });
      ch.close();
    },
    async emitPetReadyToMain() {
      const ch = getChannel();
      if (!ch) return;
      ch.postMessage({ event: PET_EVENTS.PET_READY, payload: null });
      ch.close();
    },
    async emitIntentToMain(intent) {
      const ch = getChannel();
      if (!ch) return;
      ch.postMessage({ event: PET_EVENTS.INTENT, payload: intent });
      ch.close();
    },
    async listenSnapshot(handler) {
      const ch = getChannel();
      if (!ch) return () => {};
      const onMsg = (ev: MessageEvent) => {
        if (ev.data?.event === PET_EVENTS.SNAPSHOT && ev.data?.payload) {
          handler(ev.data.payload as PetSignalSnapshot);
        }
      };
      ch.addEventListener('message', onMsg);
      return () => {
        ch.removeEventListener('message', onMsg);
        ch.close();
      };
    },
    async listenPetReady(handler) {
      const ch = getChannel();
      if (!ch) return () => {};
      const onMsg = (ev: MessageEvent) => {
        if (ev.data?.event === PET_EVENTS.PET_READY) {
          handler();
        }
      };
      ch.addEventListener('message', onMsg);
      return () => {
        ch.removeEventListener('message', onMsg);
        ch.close();
      };
    },
    async listenIntent(handler) {
      const ch = getChannel();
      if (!ch) return () => {};
      const onMsg = (ev: MessageEvent) => {
        if (ev.data?.event === PET_EVENTS.INTENT && ev.data?.payload) {
          handler(ev.data.payload as PetToMainIntent);
        }
      };
      ch.addEventListener('message', onMsg);
      return () => {
        ch.removeEventListener('message', onMsg);
        ch.close();
      };
    },
    async focusMainWindow() {},
    async startPetWindowDragging() {},
    async setPetIgnoreCursorEvents() {},
  };
}

function createTauriTransport(): SyncTransport {
  return {
    isDesktop: true,
    async emitSnapshotToPet(snapshot) {
      await emitTo(WINDOW_LABELS.PET, PET_EVENTS.SNAPSHOT, snapshot);
    },
    async emitPetReadyToMain() {
      await emitTo(WINDOW_LABELS.MAIN, PET_EVENTS.PET_READY, null);
    },
    async emitIntentToMain(intent) {
      await emitTo(WINDOW_LABELS.MAIN, PET_EVENTS.INTENT, intent);
    },
    async listenSnapshot(handler) {
      return listen<PetSignalSnapshot>(
        PET_EVENTS.SNAPSHOT,
        (event) => handler(event.payload),
        { target: { kind: 'WebviewWindow', label: WINDOW_LABELS.PET } }
      );
    },
    async listenPetReady(handler) {
      return listen<null>(
        PET_EVENTS.PET_READY,
        () => handler(),
        { target: { kind: 'WebviewWindow', label: WINDOW_LABELS.MAIN } }
      );
    },
    async listenIntent(handler) {
      return listen<PetToMainIntent>(
        PET_EVENTS.INTENT,
        (event) => handler(event.payload),
        { target: { kind: 'WebviewWindow', label: WINDOW_LABELS.MAIN } }
      );
    },
    async focusMainWindow() {
      const mainWin = await WebviewWindow.getByLabel(WINDOW_LABELS.MAIN);
      if (!mainWin) return;
      try {
        if (await mainWin.isMinimized()) {
          await mainWin.unminimize();
        }
      } catch {
        // Proceed to show/focus even if isMinimized is unsupported on a platform
      }
      await mainWin.show();
      await mainWin.setFocus();
    },
    async startPetWindowDragging() {
      await getCurrentWebviewWindow().startDragging();
    },
    async setPetIgnoreCursorEvents(ignore) {
      await getCurrentWebviewWindow().setIgnoreCursorEvents(ignore);
    },
  };
}

export function isDesktopTauri(): boolean {
  if (isTauri()) return true;
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } };
    return typeof win.__TAURI_INTERNALS__?.invoke === 'function';
  }
  return false;
}

export function createSyncTransport(): SyncTransport {
  return isDesktopTauri() ? createTauriTransport() : createWebFallbackTransport();
}
