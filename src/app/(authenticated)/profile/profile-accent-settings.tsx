"use client";

import { normalizeHex } from "@/lib/accent-color";
import { useAccentColorControl } from "@/components/accent-provider";
import { useEffect, useState } from "react";

export function ProfileAccentSettings() {
  const { color, setColor } = useAccentColorControl();
  const [hexDraft, setHexDraft] = useState(color);

  useEffect(() => {
    setHexDraft(color);
  }, [color]);

  function commitHex() {
    const n = normalizeHex(hexDraft);
    if (n) setColor(n);
    else setHexDraft(color);
  }

  return (
    <section className="mt-10 max-w-md rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Accent color</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Choose any color for buttons, links, and highlights. Stored only in this browser (
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">localStorage</code>
        ).
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span>Picker</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="accent-focus h-14 w-full min-w-[8rem] max-w-[12rem] cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-600"
            aria-label="Accent color picker"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span>Hex</span>
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={() => commitHex()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            spellCheck={false}
            className="accent-focus rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950"
            placeholder="#0d9488"
            maxLength={7}
            aria-label="Accent color hex"
          />
        </label>
        <div
          className="size-14 shrink-0 rounded-xl border border-zinc-300 shadow-inner dark:border-zinc-600"
          style={{ backgroundColor: color }}
          title="Preview"
        />
      </div>
    </section>
  );
}
