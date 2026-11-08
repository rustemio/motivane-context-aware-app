import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { jitter, layoutHanging, type NoteSize } from '../domain/layout';
import { currentStepMinutes, effectiveMinutes, isShrunk, withinReach, type Match } from '../domain/matching';
import type { Kind } from '../domain/types';
import { KIND_LABEL, prefersReducedMotion, shortDuration } from './labels';

export function NoteBody({ match, size }: { match: Match; size: NoteSize }) {
  const { idea, why, usesStep } = match;
  const roomy = size === 'lead' || size === 'reach';
  const showStep = roomy && usesStep;
  const minutes = showStep ? currentStepMinutes(idea) : effectiveMinutes(idea);
  return (
    <>
      <span className="note__hole" aria-hidden="true" />
      {roomy && <span className="sr-only">Within reach. </span>}
      <span className="note__title">{idea.title}</span>
      {roomy && <span className="note__why">{why}</span>}
      <span className="note__meta">
        {KIND_LABEL[idea.kind]} · {showStep ? 'first step ' : ''}{shortDuration(minutes)}
        {isShrunk(idea) ? ' · made smaller' : ''}
      </span>
    </>
  );
}

export function Stage({
  ranked,
  filter,
  introSeen,
  launchId,
  keptId,
  vane,
  intro,
  onOpen,
  onShowList,
  onClearFilter,
}: {
  ranked: Match[];
  filter: Kind | null;
  introSeen: boolean;
  launchId: string | null;
  keptId: string | null;
  vane?: ReactNode;
  intro: ReactNode;
  onOpen: (id: string) => void;
  onShowList: () => void;
  onClearFilter: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, viewport: window.innerHeight });

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight, viewport: window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const scoped = useMemo(
    () => ranked.map((m) => (!introSeen || (filter && m.idea.kind !== filter) ? { ...m, resting: true } : m)),
    [ranked, filter, introSeen],
  );
  const reach = useMemo(() => withinReach(scoped), [scoped]);
  const layout = useMemo(() => layoutHanging(scoped, reach, size.width, size.height, size.viewport), [scoped, reach, size]);

  // DOM order stays fixed: moving a node would cancel its transition. Arrow keys
  // walk the notes best-first, whatever order Tab finds them in.
  const stable = useMemo(
    () => [...ranked].sort((a, b) => a.idea.createdAt - b.idea.createdAt || a.idea.id.localeCompare(b.idea.id)),
    [ranked],
  );

  // A new note rises from the composer into the cloud before finding its thread.
  const [launch, setLaunch] = useState<{ id: string; phase: 'start' | 'rising' } | null>(null);
  useEffect(() => {
    if (!launchId || prefersReducedMotion()) return;
    setLaunch({ id: launchId, phase: 'start' });
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setLaunch({ id: launchId, phase: 'rising' })),
    );
    const done = setTimeout(() => setLaunch(null), 850);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [launchId]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const visible = scoped.filter((m) => layout.positions.get(m.idea.id)?.size !== 'hidden');
    const currentId = (document.activeElement as HTMLElement | null)?.dataset.noteId;
    const at = visible.findIndex((m) => m.idea.id === currentId);
    if (at < 0) return;
    e.preventDefault();
    const next = visible[(at + step + visible.length) % visible.length];
    e.currentTarget.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(next.idea.id)}"]`)?.focus();
  };

  const activeCount = scoped.filter((m) => !m.resting).length;
  const empty = introSeen && reach.length === 0;

  return (
    <section className="stage" aria-label="Your ideas, hanging from the cloud">
      <div className="stage__area" ref={area} style={{ minHeight: introSeen ? layout.minHeight : Math.max(layout.minHeight, 340) }}>
        {size.width > 0 && (
          <div className="threads" aria-hidden="true">
            {stable.map((m, index) => {
              const hang = layout.positions.get(m.idea.id);
              if (!hang) return null;
              const launching = launch?.id === m.idea.id;
              const y = launching ? (launch.phase === 'start' ? size.height + 40 : -170) : hang.y;
              return (
                <span
                  key={m.idea.id}
                  className={`thread${hang.size === 'hidden' && !launching ? ' thread--hidden' : ''}${launching && launch.phase === 'start' ? ' hang--instant' : ''}`}
                  style={{ transform: `translate(${hang.x + hang.width / 2}px, ${y + 14}px)`, transitionDelay: `${(index % 7) * 26}ms` }}
                />
              );
            })}
          </div>
        )}
        {size.width > 0 && (
          <ul className="hanging" onKeyDown={onKeyDown}>
            {stable.map((m, index) => {
              const hang = layout.positions.get(m.idea.id);
              if (!hang) return null;
              const scopedMatch = scoped.find((s) => s.idea.id === m.idea.id) ?? m;
              let y = hang.y;
              if (launch?.id === m.idea.id) y = launch.phase === 'start' ? size.height + 40 : -170;
              const launching = launch?.id === m.idea.id;
              return (
                <li
                  key={m.idea.id}
                  className={`hang hang--${launching ? 'tucked' : hang.size}${launching && launch?.phase === 'start' ? ' hang--instant' : ''}${keptId === m.idea.id ? ' hang--kept' : ''}`}
                  style={{
                    transform: `translate(${hang.x}px, ${y}px)`,
                    width: hang.width,
                    zIndex: launching ? 20 : hang.z,
                    transitionDelay: `${(index % 7) * 26}ms`,
                  }}
                >
                  <div
                    className="hang__sway"
                    style={{
                      ['--tilt' as string]: `${hang.rotate}deg`,
                      animationDuration: `${6 + (jitter(m.idea.id, 5) + 1) * 2.5}s`,
                      animationDelay: `${jitter(m.idea.id, 6) * -4 - 4}s`,
                    }}
                  >
                    <button
                      type="button"
                      className={`note note--${m.idea.kind}`}
                      data-note-id={m.idea.id}
                      tabIndex={hang.size === 'hidden' ? -1 : 0}
                      onClick={() => onOpen(m.idea.id)}
                    >
                      <NoteBody match={scopedMatch} size={hang.size} />
                    </button>
                    {keptId === m.idea.id && <span className="kept-star" aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!introSeen && intro}

        {empty && (
          <div className="stage__empty">
            {activeCount > 0 ? (
              <>
                <h2>Nothing’s asking for this moment.</h2>
                <p>That’s allowed. Everything’s still up there, and a different sky may bring something down.</p>
              </>
            ) : filter ? (
              <>
                <h2>No {KIND_LABEL[filter].toLowerCase()} ideas up there yet.</h2>
                <p>
                  <button type="button" className="link" onClick={onClearFilter}>Show every kind</button>
                </p>
              </>
            ) : (
              <>
                <h2>A clear sky.</h2>
                <p>No ideas waiting. Write one below, and send it up.</p>
              </>
            )}
          </div>
        )}

        {layout.overflow > 0 && (
          <button type="button" className="chip stage__more" onClick={onShowList}>
            {layout.overflow} more in the cloud
          </button>
        )}
      </div>
      {vane && introSeen && <div className="stage__roof">{vane}</div>}
    </section>
  );
}
