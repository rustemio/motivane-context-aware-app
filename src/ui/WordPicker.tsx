import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface WordOption<T> {
  value: T;
  label: string;
}

/** An editable word inside the sentence: a button that opens a small menu of alternatives. */
export function WordPicker<T extends string | number>({
  name,
  value,
  word,
  options,
  onChange,
}: {
  name: string;
  value: T;
  word: string;
  options: WordOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  useLayoutEffect(() => {
    const el = menu.current;
    if (!open || !el) return;
    el.style.setProperty('--shift', '0px');
    const rect = el.getBoundingClientRect();
    const overflow = rect.right - (window.innerWidth - 12);
    el.style.setProperty('--shift', `${overflow > 0 ? -overflow : Math.min(0, rect.left - 12) * -1}px`);
    (el.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus();
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (e.key === 'ArrowDown') { e.preventDefault(); go(at + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(at - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); button.current?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <span className="word" ref={root}>
      <button
        ref={button}
        type="button"
        className="word__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${name}: ${word}. Change`}
        onClick={() => setOpen((o) => !o)}
      >
        {word}
      </button>
      {open && (
        <span className="word__menu" role="menu" aria-label={name} id={id} ref={menu} onKeyDown={onMenuKey}>
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                button.current?.focus();
              }}
            >
              {o.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
