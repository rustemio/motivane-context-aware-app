import type { ReactNode } from 'react';
import {
  ENERGIES,
  KINDS,
  PLACES,
  TIMES,
  WEATHERS,
  type IdeaDraft,
} from '../domain/types';
import { durationPhrase } from '../domain/moment';
import { ENERGY_LABEL, KIND_HINT, KIND_LABEL, PLACE_LABEL, TIME_LABEL, WEATHER_LABEL } from './labels';

function Choices({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="choices">
      <legend>
        {legend}
        {hint && <small> {hint}</small>}
      </legend>
      <div className="choices__row">{children}</div>
    </fieldset>
  );
}

function Radio<T extends string>({ name, value, current, label, title, onPick }: { name: string; value: T; current: T; label: string; title?: string; onPick: (v: T) => void }) {
  return (
    <label className="pick" title={title}>
      <input type="radio" name={name} checked={value === current} onChange={() => onPick(value)} />
      <span>{label}</span>
    </label>
  );
}

function Check<T extends string>({ value, list, label, onChange }: { value: T; list: T[]; label: string; onChange: (next: T[]) => void }) {
  const on = list.includes(value);
  return (
    <label className="pick">
      <input type="checkbox" checked={on} onChange={() => onChange(on ? list.filter((x) => x !== value) : [...list, value])} />
      <span>{label}</span>
    </label>
  );
}

const MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];
const STEP_MINUTES = [1, 2, 3, 5, 10, 15];

function withCurrent(options: number[], current: number) {
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}

/** Everything except the title, shared by capture and edit. */
export function IdeaFields({
  idPrefix,
  draft,
  onChange,
  stepError,
}: {
  idPrefix: string;
  draft: IdeaDraft;
  onChange: (change: Partial<IdeaDraft>) => void;
  stepError?: string;
}) {
  return (
    <div className="fields">
      <Choices legend="Kind">
        {KINDS.map((k) => (
          <Radio key={k} name={`${idPrefix}-kind`} value={k} current={draft.kind} label={KIND_LABEL[k]} title={KIND_HINT[k]} onPick={(kind) => onChange({ kind })} />
        ))}
      </Choices>
      <Choices legend="Where">
        {PLACES.map((p) => (
          <Radio key={p} name={`${idPrefix}-place`} value={p} current={draft.place} label={PLACE_LABEL[p]} onPick={(place) => onChange({ place })} />
        ))}
      </Choices>
      <Choices legend="Best sky" hint="leave empty if any will do">
        {WEATHERS.map((w) => (
          <Check key={w} value={w} list={draft.skies} label={WEATHER_LABEL[w]} onChange={(skies) => onChange({ skies })} />
        ))}
      </Choices>
      <Choices legend="Best hour" hint="leave empty if any will do">
        {TIMES.map((t) => (
          <Check key={t} value={t} list={draft.times} label={TIME_LABEL[t]} onChange={(times) => onChange({ times })} />
        ))}
      </Choices>
      <Choices legend="Energy it asks for">
        {ENERGIES.map((e) => (
          <Radio key={e} name={`${idPrefix}-energy`} value={e} current={draft.energy} label={ENERGY_LABEL[e]} onPick={(energy) => onChange({ energy })} />
        ))}
      </Choices>
      <div className="fields__pair">
        <label className="field">
          <span>The whole thing takes</span>
          <select value={draft.minutes} onChange={(e) => onChange({ minutes: Number(e.target.value) })}>
            {withCurrent(MINUTES, draft.minutes).map((m) => (
              <option key={m} value={m}>{durationPhrase(m)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>The first step takes</span>
          <select value={draft.stepMinutes} onChange={(e) => onChange({ stepMinutes: Number(e.target.value) })}>
            {withCurrent(STEP_MINUTES, draft.stepMinutes).map((m) => (
              <option key={m} value={m}>{durationPhrase(m)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>First small step</span>
        <input
          type="text"
          value={draft.step}
          maxLength={160}
          aria-invalid={Boolean(stepError)}
          aria-describedby={stepError ? `${idPrefix}-step-error` : undefined}
          onChange={(e) => onChange({ step: e.target.value })}
        />
        {stepError && <em className="field__error" id={`${idPrefix}-step-error`}>{stepError}</em>}
      </label>
    </div>
  );
}
