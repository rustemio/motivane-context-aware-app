import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Native <dialog> for the focus trap and Esc. Focus return is done by hand: React
 * has already detached the node by cleanup time, so the browser can't restore it.
 */
export function Modal({
  onClose,
  labelledBy,
  className = '',
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      opener?.focus({ preventScroll: true });
      // The opener may have just floated away: don't drop keyboard users at the top of the page.
      if (document.activeElement === document.body) document.getElementById('main')?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal__inner">
        <button type="button" className="modal__close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </dialog>
  );
}
