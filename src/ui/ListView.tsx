import { useMemo, useState } from 'react';
import { withinReach, type Match } from '../domain/matching';
import { KINDS, type Kind } from '../domain/types';
import { KIND_LABEL, shortDuration } from './labels';

function Row({ match, onOpen, rest }: { match: Match; onOpen: (id: string) => void; rest?: boolean }) {
  const { idea, why } = match;
  return (
    <li>
      <button type="button" className={`row row--${idea.kind}`} onClick={() => onOpen(idea.id)}>
        <span className="row__title">{idea.title}</span>
        <span className="row__why">{rest ? 'Resting for now.' : why}</span>
        <span className="row__meta">{KIND_LABEL[idea.kind]} · {shortDuration(idea.minutes)}{idea.sample ? ' · sample' : ''}</span>
      </button>
    </li>
  );
}

/** The same ideas without the spatial layer: searchable, sorted by fit, and calm on any device. */
export function ListView({
  ranked,
  filter,
  onFilter,
  onOpen,
}: {
  ranked: Match[];
  filter: Kind | null;
  onFilter: (kind: Kind | null) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter((m) => (!filter || m.idea.kind === filter) && (!q || m.idea.title.toLowerCase().includes(q) || m.idea.step.toLowerCase().includes(q)));
  }, [ranked, filter, query]);

  const reach = withinReach(shown);
  const reachIds = new Set(reach.map((m) => m.idea.id));
  const cloud = shown.filter((m) => !reachIds.has(m.idea.id) && !m.resting);
  const resting = shown.filter((m) => m.resting);

  return (
    <section className="sheet" aria-labelledby="list-title">
      <h1 id="list-title" className="sheet__title">All your ideas</h1>
      <div className="list-tools">
        <label className="field field--search">
          <span className="sr-only">Search your ideas</span>
          <input type="search" placeholder="Search your ideas" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="presets presets--plain" role="group" aria-label="Filter by kind">
          <button type="button" className="chip" aria-pressed={!filter} onClick={() => onFilter(null)}>All</button>
          {KINDS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => onFilter(filter === k ? null : k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <div className="sheet__empty">
          {ranked.length === 0 ? (
            <p>Nothing here yet. Write your first idea below.</p>
          ) : (
            <>
              <p>Nothing matches that.</p>
              <button type="button" className="link" onClick={() => { setQuery(''); onFilter(null); }}>Clear the search and filter</button>
            </>
          )}
        </div>
      )}

      {reach.length > 0 && (
        <>
          <h2 className="sheet__section">Within reach</h2>
          <ul className="rows">{reach.map((m) => <Row key={m.idea.id} match={m} onOpen={onOpen} />)}</ul>
        </>
      )}
      {cloud.length > 0 && (
        <>
          <h2 className="sheet__section">Up in the cloud</h2>
          <ul className="rows">{cloud.map((m) => <Row key={m.idea.id} match={m} onOpen={onOpen} />)}</ul>
        </>
      )}
      {resting.length > 0 && (
        <>
          <h2 className="sheet__section">Resting</h2>
          <ul className="rows">{resting.map((m) => <Row key={m.idea.id} match={m} onOpen={onOpen} rest />)}</ul>
        </>
      )}
    </section>
  );
}
