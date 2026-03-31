"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type BoardPendingValue = {
  /** Increment pending count; call the returned function when work completes (try/finally). */
  begin: () => () => void;
  /** Wrap a promise so pending is active until it settles. */
  track: <T>(promise: Promise<T>) => Promise<T>;
  pendingCount: number;
};

const BoardPendingContext = createContext<BoardPendingValue | null>(null);

export function BoardPendingProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const begin = useCallback(() => {
    setPendingCount((c) => c + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      setPendingCount((c) => Math.max(0, c - 1));
    };
  }, []);

  const track = useCallback(
    <T,>(promise: Promise<T>): Promise<T> => {
      const end = begin();
      return promise.finally(end);
    },
    [begin],
  );

  const value = useMemo(
    () => ({ begin, track, pendingCount }),
    [begin, track, pendingCount],
  );

  return (
    <BoardPendingContext.Provider value={value}>
      {children}
      <BoardPendingIndicator show={pendingCount > 0} />
    </BoardPendingContext.Provider>
  );
}

export function useBoardPending(): BoardPendingValue {
  const ctx = useContext(BoardPendingContext);
  if (!ctx) {
    throw new Error("useBoardPending must be used within BoardPendingProvider");
  }
  return ctx;
}

function BoardPendingIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-600 shadow-lg backdrop-blur dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:text-zinc-300"
      role="status"
      aria-live="polite"
      aria-label="Saving"
    >
      <span
        className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-[color:var(--accent-color,#6366f1)] dark:border-zinc-600"
        aria-hidden
      />
      <span className="hidden sm:inline">Saving…</span>
    </div>
  );
}
