'use client';

import { useEffect, useRef } from 'react';

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BaseModal({ open, onClose, title, children }: BaseModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl"
      >
        {title && (
          <div className="sticky top-0 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-5 py-3">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
