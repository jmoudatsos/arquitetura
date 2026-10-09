import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn.js";

/**
 * Modal acessível baseado no <dialog> nativo (foco preso, Esc fecha, backdrop).
 */
export function Dialog({ open, onClose, title, description, className, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onClick={(event) => {
        // Clique no backdrop (fora da caixa) fecha.
        if (event.target === ref.current) onClose?.();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(100%-2rem,64rem)] max-h-[min(100dvh-2rem,52rem)] overflow-hidden rounded-sm border border-line bg-ink p-0 text-bone shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-fade-in",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 id="dialog-title" className="text-[1.625rem] text-bone">
                {title}
              </h2>
              {description && <p className="mt-1 text-[1rem] text-mute">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-2 text-mute transition-colors hover:bg-panel hover:text-bone"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
