import { useId, useState, type FormEvent } from 'react';
import { durationPhrase, skyPhrase } from '../domain/moment';
import { currentStep, currentStepMinutes, isShrunk, type Match, type Tone } from '../domain/matching';
import { GENTLE_LEVELS } from '../domain/guess';
import type { Idea, IdeaDraft, Moment } from '../domain/types';
import { IdeaFields } from './IdeaFields';
import { TITLE_MAX } from './Composer';
import { KIND_LABEL } from './labels';
import { Modal } from './Modal';

const TONE_MARK: Record<Tone, string> = { good: '↓', neutral: '·', poor: '↑' };
const TONE_LABEL: Record<Tone, string> = { good: 'Brings it closer:', neutral: 'Neutral:', poor: 'Holds it up:' };

function restLabel(idea: Idea, moment: Moment, now: number): string {
  if (idea.restUntil !== undefined && idea.restUntil > now) {
    const date = new Date(idea.restUntil);
    return `Resting until ${date.toLocaleDateString(undefined, { weekday: 'long' })} morning.`;
  }
  return `Resting until the sky stops being ${skyPhrase(moment)}.`;
}

export interface IdeaActions {
  onBegin: () => void;
  onFinish: () => void;
  onRestSky: () => void;
  onRestTomorrow: () => void;
  onWake: () => void;
  onShrink: () => void;
  onEdit: (draft: IdeaDraft) => void;
  onLetGo: () => void;
}

export function IdeaDialog({
  match,
  moment,
  now,
  onClose,
  ...actions
}: IdeaActions & { match: Match; moment: Moment; now: number; onClose: () => void }) {
  const { idea, why, signals, resting } = match;
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IdeaDraft>(idea);
  const [errors, setErrors] = useState<{ title?: string; step?: string }>({});

  const save = (e: FormEvent) => {
    e.preventDefault();
    const next = { title: !draft.title.trim() ? 'An idea needs at least a word or two.' : undefined, step: !draft.step.trim() ? 'Keep one small step, however tiny.' : undefined };
    setErrors(next);
    if (next.title || next.step) return;
    actions.onEdit({ ...draft, title: draft.title.trim(), step: draft.step.trim(), stepMinutes: Math.min(draft.stepMinutes, draft.minutes) });
    setEditing(false);
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId} className={`idea-sheet idea-sheet--${idea.kind}`}>
      {editing ? (
        <form onSubmit={save} noValidate>
          <h2 id={titleId} className="sheet-heading">Edit this idea</h2>
          <label className="field">
            <span>The idea</span>
            <input
              type="text"
              value={draft.title}
              maxLength={TITLE_MAX}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'edit-title-error' : undefined}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            {errors.title && <em className="field__error" id="edit-title-error">{errors.title}</em>}
          </label>
          <IdeaFields idPrefix="edit" draft={draft} stepError={errors.step} onChange={(c) => setDraft({ ...draft, ...c })} />
          <div className="sheet-actions">
            <button type="submit" className="btn btn--primary">Save</button>
            <button type="button" className="btn" onClick={() => { setDraft(idea); setErrors({}); setEditing(false); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="sheet-eyebrow">{KIND_LABEL[idea.kind]}{idea.sample ? ' · sample idea' : ''}</p>
          <h2 id={titleId} className="sheet-title">{idea.title}</h2>
          {resting ? (
            <p className="sheet-why">
              {restLabel(idea, moment, now)}{' '}
              <button type="button" className="link" onClick={actions.onWake}>Bring it back now</button>
            </p>
          ) : (
            <p className="sheet-why">{why}</p>
          )}

          <div className="step-card">
            <p className="step-card__label">
              {isShrunk(idea) ? 'A gentler start' : 'First small step'} · {durationPhrase(currentStepMinutes(idea))}
            </p>
            <p className="step-card__text">{currentStep(idea)}</p>
            <div className="step-card__actions">
              <button type="button" className="btn btn--primary" onClick={actions.onBegin}>Begin</button>
              <button type="button" className="btn" onClick={actions.onShrink}>
                {idea.shrink === 0 ? 'This feels too big' : idea.shrink < GENTLE_LEVELS ? 'Smaller still' : 'Back to the original step'}
              </button>
            </div>
            {idea.steps.length > 0 && (
              <p className="step-card__count">
                {idea.steps.length === 1 ? 'One small step' : `${idea.steps.length} small steps`} taken so far.
              </p>
            )}
          </div>

          <details className="why-list">
            <summary>Why it’s hanging here</summary>
            <ul>
              {signals.map((s, i) => (
                <li key={i} className={`why-list__${s.tone}`}>
                  <span aria-hidden="true">{TONE_MARK[s.tone]}</span>
                  <span className="sr-only">{TONE_LABEL[s.tone]} </span>
                  {s.text}
                </li>
              ))}
            </ul>
          </details>

          <div className="sheet-actions">
            <button type="button" className="btn" onClick={actions.onFinish}>I finished it</button>
            {!resting && <button type="button" className="btn" onClick={actions.onRestSky}>Back to the cloud</button>}
            {!resting && <button type="button" className="btn" onClick={actions.onRestTomorrow}>Not until tomorrow</button>}
          </div>
          <div className="sheet-quiet">
            <button type="button" className="link" onClick={() => { setDraft(idea); setEditing(true); }}>Edit</button>
            <button type="button" className="link" onClick={actions.onLetGo}>Let it go</button>
          </div>
        </>
      )}
    </Modal>
  );
}
