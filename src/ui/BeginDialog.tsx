import { useEffect, useId, useState } from 'react';
import { currentStep, currentStepMinutes } from '../domain/matching';
import type { Idea } from '../domain/types';
import { Modal } from './Modal';

/** Just the one step on the screen. The timer is a kindness, not a deadline: it never rings. */
export function BeginDialog({
  idea,
  onClose,
  onCounted,
  onFinished,
}: {
  idea: Idea;
  onClose: () => void;
  onCounted: (next?: string) => void;
  onFinished: () => void;
}) {
  const titleId = useId();
  const total = currentStepMinutes(idea) * 60_000;
  // An end time rather than a counter, so a throttled background tab stays accurate.
  const [endsAt] = useState(() => Date.now() + total);
  const [left, setLeft] = useState(total);
  const [counted, setCounted] = useState(false);
  const [next, setNext] = useState('');

  useEffect(() => {
    if (counted) return;
    const tick = () => setLeft(Math.max(0, endsAt - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [counted, endsAt]);

  const seconds = Math.ceil(left / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <Modal onClose={onClose} labelledBy={titleId} className={`begin-sheet idea-sheet--${idea.kind}`}>
      {!counted ? (
        <div className="begin">
          <p className="sheet-eyebrow">Just this</p>
          <h2 id={titleId} className="begin__step">{currentStep(idea)}</h2>
          <div className="begin__clock" role="timer" aria-label={`${clock} left`}>
            {left > 0 ? clock : 'Time’s up, if you want it to be.'}
          </div>
          <div className="begin__thread" aria-hidden="true">
            <span style={{ transform: `scaleX(${left / total})` }} />
          </div>
          <div className="sheet-actions sheet-actions--center">
            <button type="button" className="btn btn--primary" onClick={() => setCounted(true)}>Done</button>
            <button type="button" className="btn" onClick={onClose}>Stop for now</button>
          </div>
          <p className="begin__note">For “{idea.title}”. Stopping early costs nothing.</p>
        </div>
      ) : (
        <form
          className="begin"
          onSubmit={(e) => {
            e.preventDefault();
            onCounted(next);
          }}
        >
          <p className="sheet-eyebrow">One small step</p>
          <h2 id={titleId} className="begin__step">That counts.</h2>
          <label className="field">
            <span>What would the next small step be? <small>Optional</small></span>
            <input type="text" value={next} maxLength={160} onChange={(e) => setNext(e.target.value)} autoFocus />
          </label>
          <div className="sheet-actions sheet-actions--center">
            <button type="submit" className="btn btn--primary">Back to the cloud</button>
            <button type="button" className="btn" onClick={onFinished}>That finished the whole idea</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
