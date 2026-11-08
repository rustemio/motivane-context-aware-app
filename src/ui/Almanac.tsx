import { useMemo } from 'react';
import { skyPhrase } from '../domain/moment';
import type { Idea, Weather } from '../domain/types';

const GLYPH: Record<Weather, string> = {
  clear: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  cloudy: 'M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18Z',
  rain: 'M7 14a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 6.5 3.75 3.75 0 0 1 17.5 14ZM8 18l-1 4M13 18l-1 4M18 18l-1 4',
  snow: 'M7 14a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 6.5 3.75 3.75 0 0 1 17.5 14ZM8 19h.01M12 21h.01M16 19h.01',
};

const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1);

export function Almanac({ ideas, onUnfinish }: { ideas: Idea[]; onUnfinish: (id: string) => void }) {
  const done = useMemo(
    () => ideas.filter((i) => i.doneAt !== undefined).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [ideas],
  );
  return (
    <section className="sheet sheet--almanac" aria-labelledby="almanac-title">
      <h1 id="almanac-title" className="sheet__title">The Almanac</h1>
      <p className="sheet__lede">
        What you did, and the weather you did it in. Each entry is also a star, out over the sky view on clear nights.
      </p>
      {done.length === 0 ? (
        <div className="sheet__empty">
          <p>Nothing written down yet. There’s no hurry; ideas keep.</p>
        </div>
      ) : (
        <ol className="almanac">
          {done.map((idea) => (
            <li key={idea.id} className="almanac__entry">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="almanac__glyph"><path d={GLYPH[idea.doneIn?.weather ?? 'cloudy']} /></svg>
              <div>
                <p className="almanac__when">
                  {capitalised(idea.doneIn ? skyPhrase(idea.doneIn) : 'a quiet moment')},{' '}
                  <time dateTime={new Date(idea.doneAt!).toISOString()}>
                    {new Date(idea.doneAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  </time>
                  {idea.sample && <span className="almanac__sample">sample</span>}
                </p>
                <p className="almanac__title">{idea.title}</p>
                {idea.steps.length > 0 && (
                  <p className="almanac__steps">
                    {idea.steps.length === 1 ? 'One small step' : `${idea.steps.length} small steps`} along the way.
                  </p>
                )}
              </div>
              <button type="button" className="link almanac__undo" onClick={() => onUnfinish(idea.id)}>
                Back to the cloud
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
