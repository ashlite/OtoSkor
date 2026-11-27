import { useEffect, useRef } from 'react';

interface BackEntry {
  id: number;
  onBack: () => void;
}

let nextId = 1;
const entries: BackEntry[] = [];
const pushedIds = new Set<number>();
const pendingBackResolvers: Array<() => void> = [];
let historyChain: Promise<void> = Promise.resolve();
let backInFlightCount = 0;
let listenerAttached = false;

function handlePopState() {
  if (pendingBackResolvers.length > 0) {
    const resolve = pendingBackResolvers.shift();
    resolve?.();
    return;
  }

  const top = entries.pop();
  if (top) {
    pushedIds.delete(top.id);
    top.onBack();
  }
}

function ensurePopStateListener() {
  if (typeof window === 'undefined' || listenerAttached) return;
  window.addEventListener('popstate', handlePopState);
  listenerAttached = true;
}

function enqueueHistoryTask(task: () => Promise<void> | void) {
  historyChain = historyChain
    .then(() => task())
    .catch(() => {
      // Never stall history queue on unexpected browser errors
    });
}

function programmaticBack(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const wrappedDone = () => {
      window.clearTimeout(timer);
      done();
    };
    const timer = window.setTimeout(() => {
      const idx = pendingBackResolvers.indexOf(wrappedDone);
      if (idx !== -1) {
        pendingBackResolvers.splice(idx, 1);
      }
      done();
    }, 150);

    pendingBackResolvers.push(wrappedDone);
    try {
      window.history.back();
    } catch {
      const idx = pendingBackResolvers.indexOf(wrappedDone);
      if (idx !== -1) {
        pendingBackResolvers.splice(idx, 1);
      }
      window.clearTimeout(timer);
      done();
    }
  });
}

function pushHistoryForEntry(id: number) {
  if (!entries.some((entry) => entry.id === id)) {
    return;
  }
  try {
    window.history.pushState({ __otoskorBackId: id }, '');
    pushedIds.add(id);
  } catch {
    // Ignore history push failures
  }
}

export function registerBackHandler(onBack: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  ensurePopStateListener();

  const id = nextId++;
  entries.push({ id, onBack });

  if (backInFlightCount === 0) {
    pushHistoryForEntry(id);
  } else {
    enqueueHistoryTask(() => pushHistoryForEntry(id));
  }

  return () => {
    const idx = entries.findIndex((entry) => entry.id === id);
    if (idx !== -1) {
      entries.splice(idx, 1);
    }

    if (pushedIds.has(id)) {
      pushedIds.delete(id);
      backInFlightCount += 1;
      enqueueHistoryTask(async () => {
        try {
          await programmaticBack();
        } finally {
          backInFlightCount = Math.max(0, backInFlightCount - 1);
        }
      });
    }
  };
}

/**
 * Integrates an active overlay/modal/sub-view with browser/Android PWA hardware Back button.
 * When `active` is true, pressing Back invokes `onBack` instead of exiting the PWA.
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => {
      onBackRef.current();
    });
  }, [active]);
}
