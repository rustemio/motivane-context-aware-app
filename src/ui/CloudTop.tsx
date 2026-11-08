import { useMemo } from 'react';
import { jitter } from '../domain/layout';
import { matchingPreset, PRESETS, weatherWord, type Preset } from '../domain/moment';
import { durationPhrase } from '../domain/moment';
import { MINUTE_OPTIONS, TIMES, WEATHERS, type Energy, type Moment, type SkySource, type TimeOfDay, type Weather } from '../domain/types';
import { ENERGY_WORD } from './labels';
import type { View } from './useRoute';
import { WordPicker } from './WordPicker';

/** The cloud's underside: flat paper puffs, wide enough never to stretch or repeat visibly. */
function puffs(salt: number, radius: number) {
  return Array.from({ length: 48 }, (_, i) => ({
    cx: i * 66 + jitter('x', i + salt) * 20,
    cy: 4 + (jitter('y', i + salt) + 1) * 8,
    r: radius + (jitter('r', i + salt) + 1) * 14,
  }));
}

function CloudEdge() {
  const back = useMemo(() => puffs(100, 30), []);
  const front = useMemo(() => puffs(0, 22), []);
  return (
    <svg className="cloud__edge" viewBox="0 0 3168 110" width="3168" height="110" aria-hidden="true">
      <g className="cloud__puffs cloud__puffs--back">
        {back.map((p, i) => <circle key={i} {...p} />)}
      </g>
      <g className="cloud__puffs cloud__puffs--front">
        <rect x="0" y="-10" width="3168" height="26" />
        {front.map((p, i) => <circle key={i} {...p} />)}
      </g>
    </svg>
  );
}

function sourceLabel(source: SkySource, moment: Moment): string {
  switch (source.kind) {
    case 'demo':
      return 'Simulated sky';
    case 'manual':
      return 'Sky described by you';
    case 'clock':
      return 'Hour from your clock, weather by you';
    case 'live':
      return `Live weather${moment.tempC !== undefined ? `, ${Math.round(moment.tempC)}°` : ''}. Hour from your clock`;
  }
}

export function CloudTop({
  view,
  moment,
  source,
  showForecast,
  hint,
  liveBusy,
  onNavigate,
  onAbout,
  onMoment,
  onPreset,
  onLive,
  onDismissHint,
}: {
  view: View;
  moment: Moment;
  source: SkySource;
  showForecast: boolean;
  hint: string | null;
  liveBusy: boolean;
  onNavigate: (view: View) => void;
  onAbout: () => void;
  onMoment: (change: Partial<Moment>) => void;
  onPreset: (preset: Preset) => void;
  onLive: () => void;
  onDismissHint: () => void;
}) {
  const active = matchingPreset(moment);
  const nav: [View, string][] = [['sky', 'Sky'], ['list', 'List'], ['almanac', 'Almanac']];
  return (
    <header className="cloud">
      <div className="cloud__body">
        <div className="topbar">
          <button type="button" className="wordmark" onClick={() => onNavigate('sky')} aria-label="MotiVane, back to the sky">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" /><path d="M12 2.5 16 13h-3v8.5h-2V13H8Z" transform="rotate(38 12 12)" /></svg>
            MotiVane
          </button>
          <nav aria-label="Views" className="topnav">
            {nav.map(([v, label]) => (
              <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => onNavigate(v)}>
                {label}
              </button>
            ))}
            <button type="button" onClick={onAbout} className="topnav__about">
              <span className="wide-only">How it works</span>
              <span className="narrow-only" aria-label="How it works">?</span>
            </button>
          </nav>
        </div>

        {showForecast && (
          <div className="forecast">
            <p className="sentence">
              It’s a{' '}
              <WordPicker<Weather>
                name="Weather"
                value={moment.weather}
                word={weatherWord(moment.weather, moment.time)}
                options={WEATHERS.map((w) => ({ value: w, label: weatherWord(w, moment.time) }))}
                onChange={(weather) => onMoment({ weather })}
              />{' '}
              <WordPicker<TimeOfDay>
                name="Time of day"
                value={moment.time}
                word={moment.time}
                options={TIMES.map((t) => ({ value: t, label: t }))}
                onChange={(time) => onMoment({ time })}
              />
              . I have{' '}
              <WordPicker<number>
                name="Time available"
                value={moment.minutes}
                word={durationPhrase(moment.minutes)}
                options={MINUTE_OPTIONS.map((m) => ({ value: m, label: durationPhrase(m) }))}
                onChange={(minutes) => onMoment({ minutes })}
              />{' '}
              and{' '}
              <WordPicker<Energy>
                name="Energy"
                value={moment.energy}
                word={ENERGY_WORD[moment.energy]}
                options={(['low', 'medium', 'high'] as const).map((e) => ({ value: e, label: ENERGY_WORD[e] }))}
                onChange={(energy) => onMoment({ energy })}
              />{' '}
              energy.
            </p>

            <div className="controls">
              <span className={`stamp stamp--${source.kind}`}>
                <span className="stamp__dot" aria-hidden="true" />
                {sourceLabel(source, moment)}
              </span>
              <div className="presets" role="group" aria-label="Try a simulated sky">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    aria-pressed={source.kind === 'demo' && active?.id === p.id}
                    onClick={() => onPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button type="button" className="chip chip--live" onClick={onLive} disabled={liveBusy}>
                {liveBusy ? 'Looking up…' : source.kind === 'live' ? 'Refresh my real sky' : 'Use my real sky'}
              </button>
            </div>

            {hint && (
              <p className="hint">
                <span>{hint}</span>
                <button type="button" onClick={onDismissHint} aria-label="Dismiss this tip">×</button>
              </p>
            )}
          </div>
        )}
      </div>
      <CloudEdge />
    </header>
  );
}
