"use client";

import {
  ACCENT_COLOR_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
  normalizeHex,
  readStoredAccentColor,
  writeStoredAccentColor,
} from "@/lib/accent-color";
import { useCallback, useEffect, useState } from "react";

function applyAccentToDocument(hex: string) {
  if (typeof document === "undefined") return;
  const n = normalizeHex(hex) ?? DEFAULT_ACCENT_COLOR;
  document.documentElement.style.setProperty("--accent-color", n);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [, bump] = useState(0);

  useEffect(() => {
    applyAccentToDocument(readStoredAccentColor());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== ACCENT_COLOR_STORAGE_KEY) return;
      applyAccentToDocument(readStoredAccentColor());
    };
    const onCustom = () => {
      applyAccentToDocument(readStoredAccentColor());
      bump((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("accent-color-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("accent-color-change", onCustom);
    };
  }, []);

  return <>{children}</>;
}

/** Profile page: full color in #rrggbb + sync &lt;html&gt; */
export function useAccentColorControl() {
  const [color, setColorState] = useState(DEFAULT_ACCENT_COLOR);

  useEffect(() => {
    setColorState(readStoredAccentColor());
  }, []);

  const setColor = useCallback((next: string) => {
    const n = normalizeHex(next);
    if (!n) return;
    writeStoredAccentColor(n);
    applyAccentToDocument(n);
    setColorState(n);
  }, []);

  return { color, setColor };
}
