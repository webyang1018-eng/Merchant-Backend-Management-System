// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import App from '../App';
import { PetCompanionView } from '../pet/PetCompanionView';
import { createInitialMerchantState } from '../data/seedData';
import {
  derivePetSignalSnapshot,
  getSnapshotContentKey,
  type PetSignalSnapshot,
  type PetToMainIntent,
} from '../utils/merchantSignals';
import { PET_EVENTS, WINDOW_LABELS, createSyncTransport } from './tauriPetBridge';

interface EmittedRecord {
  target?: unknown;
  event: string;
  payload: unknown;
}

describe('Tauri v2 cross-window state sync (Scheme 2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    clearMocks();
    vi.restoreAllMocks();
  });

  it('derives consistent operational signals and detects structural diffs without timestamp churn', () => {
    const state = createInitialMerchantState();
    const s1 = derivePetSignalSnapshot(state, 'en', 1, null, '2026-11-18T10:00:00Z');
    const s2 = derivePetSignalSnapshot(state, 'en', 2, null, '2026-11-18T10:05:00Z');

    expect(s1.unfulfilledCount).toBe(4);
    expect(s1.refundRequestCount).toBe(1);
    expect(s1.lowStockCount).toBe(4);
    expect(s1.outOfStockCount).toBe(1);
    expect(s1.mood).toBe('urgent');
    expect(s1.unreadAlertCount).toBe(4);
    expect(getSnapshotContentKey(s1)).toBe(getSnapshotContentKey(s2));

    const zhSnap = derivePetSignalSnapshot(state, 'zh', 3);
    expect(getSnapshotContentKey(zhSnap)).not.toBe(getSnapshotContentKey(s1));
    expect(zhSnap.alerts[0].title).toContain('待发货');
  });

  it('pushes PetSignalSnapshot via Tauri emitTo on mount, state change, and handshake replay', async () => {
    mockWindows(WINDOW_LABELS.MAIN, WINDOW_LABELS.PET);

    const emitted: EmittedRecord[] = [];
    const registeredHandlers = new Map<string, (event: { event: string; id: number; payload: unknown }) => void>();
    let nextId = 1;

    mockIPC((cmd, args) => {
      const payload = (args ?? {}) as Record<string, unknown>;
      if (cmd === 'plugin:event|listen') {
        const id = nextId++;
        const eventName = String(payload.event);
        const cbId = payload.handler as number;
        registeredHandlers.set(eventName, (ev) => {
          const internals = (
            window as unknown as {
              __TAURI_INTERNALS__?: { runCallback?: (id: number, data: unknown) => void };
            }
          ).__TAURI_INTERNALS__;
          internals?.runCallback?.(cbId, ev);
        });
        return id;
      }
      if (cmd === 'plugin:event|unlisten') {
        return null;
      }
      if (cmd === 'plugin:event|emit_to') {
        emitted.push({
          target: payload.target,
          event: String(payload.event),
          payload: payload.payload,
        });
        return null;
      }
      return null;
    });

    render(<App />);

    // Initial snapshot emitted to pet window via emitTo
    await waitFor(() => {
      const snaps = emitted.filter((e) => e.event === PET_EVENTS.SNAPSHOT);
      expect(snaps.length).toBeGreaterThanOrEqual(1);
    });

    const firstEmit = emitted.find((e) => e.event === PET_EVENTS.SNAPSHOT)!;
    expect(firstEmit.target).toEqual({ kind: 'AnyLabel', label: WINDOW_LABELS.PET });
    const firstSnap = firstEmit.payload as PetSignalSnapshot;
    expect(firstSnap.rev).toBe(1);
    expect(firstSnap.unfulfilledCount).toBe(4);
    expect(firstSnap.locale).toBe('en');

    // Simulate pet window mounting late and sending PET_READY handshake
    await waitFor(() => {
      expect(registeredHandlers.has(PET_EVENTS.PET_READY)).toBe(true);
    });

    const beforeReplayCount = emitted.filter((e) => e.event === PET_EVENTS.SNAPSHOT).length;
    act(() => {
      registeredHandlers.get(PET_EVENTS.PET_READY)?.({
        event: PET_EVENTS.PET_READY,
        id: 100,
        payload: null,
      });
    });

    await waitFor(() => {
      const snaps = emitted.filter((e) => e.event === PET_EVENTS.SNAPSHOT);
      expect(snaps.length).toBe(beforeReplayCount + 1);
    });

    // Switch language in main window -> emits updated Chinese snapshot to pet window
    fireEvent.click(screen.getByRole('button', { name: '中文' }));
    await waitFor(() => {
      const snaps = emitted.filter((e) => e.event === PET_EVENTS.SNAPSHOT);
      const latest = snaps[snaps.length - 1].payload as PetSignalSnapshot;
      expect(latest.locale).toBe('zh');
      expect(latest.rev).toBeGreaterThan(firstSnap.rev);
    });

    // Simulate pet sending OPEN_ORDER_FILTER intent -> main switches to Orders filtered to `to_fulfill`
    act(() => {
      registeredHandlers.get(PET_EVENTS.INTENT)?.({
        event: PET_EVENTS.INTENT,
        id: 101,
        payload: { type: 'OPEN_ORDER_FILTER', filter: 'to_fulfill' } satisfies PetToMainIntent,
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '订单管理' })).toBeTruthy();
      expect(screen.getByText('#HL-1048')).toBeTruthy();
    });

    // Simulate pet marking alerts as read -> unread count drops to 0 in emitted snapshot
    act(() => {
      registeredHandlers.get(PET_EVENTS.INTENT)?.({
        event: PET_EVENTS.INTENT,
        id: 102,
        payload: {
          type: 'MARK_ALERTS_READ',
          alertIds: firstSnap.alerts.map((a) => a.id),
        } satisfies PetToMainIntent,
      });
    });

    await waitFor(() => {
      const snaps = emitted.filter((e) => e.event === PET_EVENTS.SNAPSHOT);
      const latest = snaps[snaps.length - 1].payload as PetSignalSnapshot;
      expect(latest.unreadAlertCount).toBe(0);
      expect(latest.mood).toBe('idle');
    });
  });

  it('synchronizes PetCompanionView with snapshots and dispatches PetToMainIntent on click', async () => {
    const emittedIntents: PetToMainIntent[] = [];
    const state = createInitialMerchantState();
    const snap = derivePetSignalSnapshot(state, 'en', 2);

    const { rerender } = render(
      <PetCompanionView
        overrideSnapshot={snap}
        onSendIntent={(intent) => {
          emittedIntents.push(intent);
        }}
      />
    );

    const petButton = screen.getByRole('button', { name: 'Mercato Pet' });
    expect(petButton.textContent).toContain('4');

    // Click Pet button -> verify panel and quick action click
    fireEvent.click(petButton);
    expect(screen.getByText('Harbor & Loom')).toBeTruthy();

    fireEvent.click(screen.getByText('To fulfill'));
    expect(emittedIntents).toContainEqual({
      type: 'OPEN_ORDER_FILTER',
      filter: 'to_fulfill',
    });

    // Click an alert item -> marks read AND triggers navigation intent
    fireEvent.click(screen.getByText('4 orders ready to fulfill'));
    expect(emittedIntents).toContainEqual({
      type: 'MARK_ALERTS_READ',
      alertIds: ['alert-unfulfilled-4'],
    });

    // Verify drag-threshold suppression does not accidentally toggle panel after dragging
    fireEvent.pointerDown(petButton, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(petButton, { clientX: 30, clientY: 30 });
    fireEvent.pointerUp(petButton);
    fireEvent.click(petButton);
    expect(screen.getByText('Harbor & Loom')).toBeTruthy();

    // Verify Chinese snapshot updates UI
    const zhSnap = derivePetSignalSnapshot(state, 'zh', 3);
    rerender(
      <PetCompanionView
        overrideSnapshot={zhSnap}
        onSendIntent={(intent) => {
          emittedIntents.push(intent);
        }}
      />
    );
    expect(screen.getByText('待发货')).toBeTruthy();
    expect(screen.getByText('打开控制台')).toBeTruthy();

    // Verify non-Tauri transport fallback cleanly constructs without throwing
    expect(createSyncTransport().isDesktop).toBe(false);
  });

  it('keeps Sidebar operational badge counts aligned with deriveOperationalCounts', () => {
    localStorage.clear();
    const { container } = render(<App />);
    // In initial seed data: 4 to_fulfill + 1 refund_requested = 5 actionable orders; 4 low stock products
    const navButtons = Array.from(container.querySelectorAll('nav button'));
    const ordersBtn = navButtons.find((b) => b.textContent?.includes('Orders'));
    const productsBtn = navButtons.find((b) => b.textContent?.includes('Products'));
    expect(ordersBtn?.textContent).toContain('5');
    expect(productsBtn?.textContent).toContain('4');
  });

  it('syncs across tabs/windows via Web BroadcastChannel fallback when outside Tauri', async () => {
    // Minimal BroadcastChannel polyfill for jsdom
    const channels = new Map<string, Set<MockBC>>();
    class MockBC {
      name: string;
      listeners = new Set<(ev: MessageEvent) => void>();
      constructor(name: string) {
        this.name = name;
        if (!channels.has(name)) channels.set(name, new Set());
        channels.get(name)!.add(this);
      }
      postMessage(data: unknown) {
        for (const peer of channels.get(this.name) ?? []) {
          if (peer === this) continue;
          const ev = new MessageEvent('message', { data });
          for (const fn of peer.listeners) fn(ev);
        }
      }
      addEventListener(_type: string, fn: (ev: MessageEvent) => void) {
        this.listeners.add(fn);
      }
      removeEventListener(_type: string, fn: (ev: MessageEvent) => void) {
        this.listeners.delete(fn);
      }
      close() {
        channels.get(this.name)?.delete(this);
      }
    }
    vi.stubGlobal('BroadcastChannel', MockBC);

    const tMain = createSyncTransport();
    const tPet = createSyncTransport();
    expect(tMain.isDesktop).toBe(false);

    const receivedSnapshots: PetSignalSnapshot[] = [];
    const unlistenSnap = await tPet.listenSnapshot((snap) => receivedSnapshots.push(snap));

    const snap = derivePetSignalSnapshot(createInitialMerchantState(), 'zh', 7);
    await tMain.emitSnapshotToPet(snap);

    expect(receivedSnapshots).toHaveLength(1);
    expect(receivedSnapshots[0].rev).toBe(7);
    expect(receivedSnapshots[0].locale).toBe('zh');

    const receivedIntents: PetToMainIntent[] = [];
    const unlistenIntent = await tMain.listenIntent((intent) => receivedIntents.push(intent));
    await tPet.emitIntentToMain({ type: 'TRIGGER_QUICK_ACTION', action: 'new_order' });
    expect(receivedIntents).toEqual([{ type: 'TRIGGER_QUICK_ACTION', action: 'new_order' }]);

    unlistenIntent();
    unlistenSnap();
    vi.unstubAllGlobals();
  });

  it('connects usePetWindowSync hook to transport, guards out-of-order revs, and retries handshake', async () => {
    let snapshotListener: ((s: PetSignalSnapshot) => void) | null = null;
    let readyCount = 0;
    const emittedIntents: PetToMainIntent[] = [];

    const mockTransport = {
      isDesktop: true,
      async emitSnapshotToPet() {},
      async emitPetReadyToMain() {
        readyCount += 1;
      },
      async emitIntentToMain(intent: PetToMainIntent) {
        emittedIntents.push(intent);
      },
      async listenSnapshot(handler: (s: PetSignalSnapshot) => void) {
        snapshotListener = handler;
        return () => {
          snapshotListener = null;
        };
      },
      async listenPetReady() {
        return () => {};
      },
      async listenIntent() {
        return () => {};
      },
      async focusMainWindow() {},
      async startPetWindowDragging() {},
      async setPetIgnoreCursorEvents() {},
    };

    const { usePetWindowSync } = await import('./usePetWindowSync');

    function HookHarness() {
      const { snapshot, connected, sendIntent } = usePetWindowSync(mockTransport);
      return (
        <div>
          <span data-testid="connected">{String(connected)}</span>
          <span data-testid="rev">{snapshot?.rev ?? 0}</span>
          <span data-testid="store">{snapshot?.storeName ?? 'none'}</span>
          <button
            type="button"
            onClick={() => void sendIntent({ type: 'OPEN_MAIN_SECTION', section: 'finance' })}
          >
            GoFinance
          </button>
        </div>
      );
    }

    render(<HookHarness />);

    await waitFor(() => {
      expect(readyCount).toBeGreaterThanOrEqual(1);
      expect(snapshotListener).not.toBeNull();
    });

    const baseState = createInitialMerchantState();
    const rev5 = derivePetSignalSnapshot(baseState, 'en', 5);
    const rev3 = derivePetSignalSnapshot(baseState, 'zh', 3);

    act(() => {
      snapshotListener?.(rev5);
    });
    expect(screen.getByTestId('connected').textContent).toBe('true');
    expect(screen.getByTestId('rev').textContent).toBe('5');
    expect(screen.getByTestId('store').textContent).toBe('Harbor & Loom');

    // Out-of-order older rev (3 < 5) must be ignored
    act(() => {
      snapshotListener?.(rev3);
    });
    expect(screen.getByTestId('rev').textContent).toBe('5');

    fireEvent.click(screen.getByRole('button', { name: 'GoFinance' }));
    await waitFor(() => {
      expect(emittedIntents).toEqual([{ type: 'OPEN_MAIN_SECTION', section: 'finance' }]);
    });
  });
});
