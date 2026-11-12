"use client";

/**
 * A panel that slides up from the bottom: the "maximised" view of a widget.
 * Built on the browser's own <dialog>, so Escape, focus and the backdrop
 * behave correctly without extra code.
 */

import { useEffect, useRef, type ReactNode } from "react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref} aria-label={title} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-[32rem] overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-bg p-0 text-ink backdrop:bg-black/60 sm:mx-auto"
    >
      {open && (
        <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display min-w-0 text-2xl">{title}</h2>
            <button type="button" onClick={onClose} className="h-10 shrink-0 rounded-lg border border-line px-3.5 text-sm font-semibold">Close</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
