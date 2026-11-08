import { useMemo } from 'react';
import { jitter } from '../domain/layout';
import type { Idea, Moment } from '../domain/types';

/** A small seeded field. Finished ideas add brighter stars on top of it. */
const AMBIENT = Array.from({ length: 46 }, (_, i) => ({
  x: 50 + jitter('a', i) * 50,
  y: 40 + jitter('b', i) * 40,
  r: 0.6 + (jitter('c', i) + 1) * 0.5,
}));

const STAR = 'M0 -9 C.8 -2.4 2.4 -.8 9 0 C2.4 .8 .8 2.4 0 9 C-.8 2.4 -2.4 .8 -9 0 C-2.4 -.8 -.8 -2.4 0 -9Z';

export function Backdrop({ moment, ideas }: { moment: Moment; ideas: Idea[] }) {
  const kept = useMemo(() => ideas.filter((i) => i.doneAt !== undefined), [ideas]);
  return (
    <div className="backdrop" aria-hidden="true" data-time={moment.time} data-weather={moment.weather}>
      <svg className="backdrop__bands" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path className="band band--2" d="M0 400 C180 360 330 430 560 400 S900 340 1120 390 S1340 420 1440 380 V900 H0Z" />
        <path className="band band--3" d="M0 620 C240 570 420 650 690 610 S1120 560 1440 620 V900 H0Z" />
      </svg>
      <div className="orb" />
      <div className="distant-clouds">
        <span /><span /><span />
      </div>
      <svg className="stars" viewBox="0 0 100 100" preserveAspectRatio="none">
        {AMBIENT.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.r * 0.09} ry={s.r * 0.14} className="star-ambient" />
        ))}
      </svg>
      <div className="stars-kept">
        {kept.map((idea) => (
          <svg
            key={idea.id}
            viewBox="-10 -10 20 20"
            className="star-kept"
            style={{ left: `${50 + jitter(idea.id, 7) * 46}%`, top: `${48 + jitter(idea.id, 8) * 22}%` }}
          >
            <path d={STAR} />
          </svg>
        ))}
      </div>
      <div className="fall fall--near" />
      <div className="fall fall--far" />
    </div>
  );
}
