import { useRef } from 'react';
import { KIND_ANGLE } from '../domain/matching';
import { KINDS, type Kind } from '../domain/types';
import { KIND_HINT, KIND_LABEL } from './labels';

/**
 * The compass doubles as the filter. Each point is one kind of idea; the needle
 * leans towards whatever the current moment favours, or to the chosen filter.
 */
export function Vane({
  angle,
  filter,
  onFilter,
}: {
  angle: number;
  filter: Kind | null;
  onFilter: (kind: Kind | null) => void;
}) {
  const target = filter ? KIND_ANGLE[filter] : angle;

  // Keep a running rotation so the needle takes the short way round.
  const rotation = useRef(target);
  const previous = useRef(target);
  if (previous.current !== target) {
    rotation.current += ((target - previous.current + 540) % 360) - 180;
    previous.current = target;
  }

  return (
    <div className="vane" role="group" aria-label="Filter ideas by kind">
      <svg className="vane__dial" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle r="98" className="vane__plate" />
        <circle r="56" className="vane__ring" />
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} y1={-56} y2={i % 6 === 0 ? -48 : -52} transform={`rotate(${i * 15})`} className="vane__tick" />
        ))}
        <g className="vane__needle" style={{ transform: `rotate(${rotation.current}deg)` }}>
          <g className="vane__wobble">
            <path d="M0 -50 L10 -24 H3 V34 L9 44 H-9 L-3 34 V-24 H-10Z" />
            <circle r="5" className="vane__rivet" />
          </g>
        </g>
      </svg>
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`vane__point vane__point--${kind}`}
          aria-pressed={filter === kind}
          title={`${KIND_LABEL[kind]}: ${KIND_HINT[kind]}`}
          onClick={() => onFilter(filter === kind ? null : kind)}
        >
          <span className={`swatch swatch--${kind}`} aria-hidden="true" />
          {KIND_LABEL[kind]}
        </button>
      ))}
    </div>
  );
}
