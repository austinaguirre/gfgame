"use client";

import { IconX } from "@/components/icons";

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
  zIndexClass = "z-[100]",
}: Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width for the panel (e.g. `max-w-4xl` for wide notes). */
  maxWidthClassName?: string;
  /** Stacking when multiple modals are open (e.g. `z-[110]` for nested confirm). */
  zIndexClass?: string;
}>) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] ${zIndexClass}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(90vh,720px)] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 ${maxWidthClassName}`}
        role="dialog"
        aria-modal
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 id="dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <IconX className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">{footer}</div> : null}
      </div>
    </div>
  );
}
