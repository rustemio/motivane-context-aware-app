import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { guessDraft } from '../domain/guess';
import type { IdeaDraft } from '../domain/types';
import { IdeaFields } from './IdeaFields';
import { KIND_LABEL, PLACE_LABEL, shortDuration } from './labels';

export const TITLE_MAX = 120;

export function Composer({ onSend }: { onSend: (draft: IdeaDraft) => void }) {
  const [title, setTitle] = useState('');
  const [overrides, setOverrides] = useState<Partial<IdeaDraft>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const draft = useMemo(() => ({ ...guessDraft(title), ...overrides, title: title.trim() }), [title, overrides]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!form.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Even one word is enough.');
      input.current?.focus();
      return;
    }
    if (!draft.step.trim()) {
      setOpen(true);
      setError('');
      return;
    }
    onSend({ ...draft, stepMinutes: Math.min(draft.stepMinutes, draft.minutes) });
    setTitle('');
    setOverrides({});
    setOpen(false);
    setError('');
    input.current?.focus();
  };

  const remaining = TITLE_MAX - title.length;

  return (
    <form className={`composer${open ? ' composer--open' : ''}`} onSubmit={submit} ref={form} noValidate>
      {open && (
        <div
          className="composer__details"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              input.current?.focus();
            }
          }}
        >
          <p className="composer__details-lede">
            {title.trim()
              ? 'MotiVane guessed these from your words. Change anything that’s off.'
              : 'Optional. Write the idea and these fill themselves in.'}
          </p>
          <IdeaFields
            idPrefix="new"
            draft={draft}
            onChange={(change) => setOverrides((o) => ({ ...o, ...change }))}
            stepError={!draft.step.trim() ? 'A new idea needs a first step, however tiny.' : undefined}
          />
        </div>
      )}
      <div className="composer__row">
        <label className="composer__field">
          <span className="composer__label">Catch an idea</span>
          <input
            ref={input}
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="What’s the idea?"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'composer-error' : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
          />
        </label>
        <button
          type="button"
          className="composer__more"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Details
        </button>
        <button type="submit" className="composer__send">
          <span>Send up</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V3M3.5 7.5 8 3l4.5 4.5" /></svg>
        </button>
      </div>
      <p className="composer__foot" aria-live="polite">
        {error ? (
          <em id="composer-error" className="field__error">{error}</em>
        ) : title.trim() ? (
          <span>
            Looks like {KIND_LABEL[draft.kind].toLowerCase()}, {PLACE_LABEL[draft.place].toLowerCase()}, about {shortDuration(draft.minutes)}.
            {remaining <= 20 && ` ${remaining} characters left.`}
          </span>
        ) : (
          <span>Just the idea is enough. Press Enter and it’s up.</span>
        )}
      </p>
    </form>
  );
}
