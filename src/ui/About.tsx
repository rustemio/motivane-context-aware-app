import { useId, useState } from 'react';
import { Modal } from './Modal';

function ConfirmButton({ label, confirm, onConfirm, danger }: { label: string; confirm: string; onConfirm: () => void; danger?: boolean }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span className="confirm">
      <span>{confirm}</span>
      <button type="button" className={`btn${danger ? ' btn--danger' : ' btn--primary'}`} onClick={() => { onConfirm(); setArmed(false); }} autoFocus>Yes</button>
      <button type="button" className="btn" onClick={() => setArmed(false)}>Keep it</button>
    </span>
  ) : (
    <button type="button" className="btn" onClick={() => setArmed(true)}>{label}</button>
  );
}

const RULES: [string, string][] = [
  ['The idea asks for this weather', '+22'],
  ['Outdoor idea: clear / grey / rain / snow', '+14 / +4 / −30 / −24'],
  ['The idea asks for a different sky, and this one is dry', '−6'],
  ['Indoor idea on a wet or snowy day', '+8'],
  ['The idea likes this hour / another hour', '+14 / −10'],
  ['Outdoor idea at night', '−20'],
  ['Fits your time / only the first step fits / neither', '+16 / +4 / −25'],
  ['Energy is enough / short by one / short by two', '+10 / −2 / −8'],
  ['Live temperature below 0° or above 34°, outdoors', '−14'],
  ['Waiting more than two weeks', 'up to +6'],
];

export function About({
  onClose,
  onResetDemo,
  onRemoveSamples,
  onErase,
}: {
  onClose: () => void;
  onResetDemo: () => void;
  onRemoveSamples: () => void;
  onErase: () => void;
}) {
  const titleId = useId();
  return (
    <Modal onClose={onClose} labelledBy={titleId} className="about-sheet">
      <p className="sheet-eyebrow">How it works</p>
      <h2 id={titleId} className="sheet-title sheet-title--display">Your ideas deserve the right moment.</h2>
      <p>
        We tend to have good ideas at the wrong moment: we save them, forget them, and never come back.
        MotiVane keeps them on threads above you. The better a moment suits an idea, the lower it hangs,
        and the best three come down within reach, each with a plain reason why.
      </p>

      <h3>How matching works</h3>
      <p>
        No AI and no profiling. Every idea starts from 40 points, and these rules add or remove some. At 60 points
        or more it can come within reach; only the top three do. Open any note to see which rules applied to it.
      </p>
      <table className="rules">
        <caption className="sr-only">Matching rules and their points</caption>
        <thead>
          <tr><th scope="col">Rule</th><th scope="col">Points</th></tr>
        </thead>
        <tbody>
          {RULES.map(([rule, points]) => (
            <tr key={rule}><td>{rule}</td><td>{points}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        “This feels too big” treats an idea as a five-minute, low-energy start, so it can reach you on days the
        whole thing couldn’t. When only the first step fits, the note says so.
      </p>

      <h3>What’s real, local and simulated</h3>
      <dl className="provenance">
        <dt>Simulated</dt>
        <dd>The preset skies, and the sample ideas and Almanac entries you see on a first visit.</dd>
        <dt>Yours, in this browser</dt>
        <dd>Your ideas and settings are saved in this browser’s local storage. There’s no account, server or sync, and clearing site data removes them.</dd>
        <dt>Real, if you ask</dt>
        <dd>“Use my real sky” asks for your location once, sends rounded coordinates to Open-Meteo for current weather, and takes the hour from your clock. Coordinates aren’t stored.</dd>
        <dt>What it doesn’t do</dt>
        <dd>It doesn’t watch the weather in the background or send notifications. Nothing changes until you look up.</dd>
      </dl>

      <h3>The demo</h3>
      <div className="about-controls">
        <ConfirmButton label="Reset the demo" confirm="Restore the samples and the demo sky? Ideas you wrote stay." onConfirm={onResetDemo} />
        <ConfirmButton label="Remove the sample ideas" confirm="Keep only the ideas you wrote?" onConfirm={onRemoveSamples} />
        <ConfirmButton label="Erase everything here" confirm="Delete your ideas from this browser too? This can’t be undone." onConfirm={onErase} danger />
      </div>

      <p className="about-credit">
        A portfolio project designed and built by Rustem Tukhbetov. It began as a mobile concept at Ankara University.
        Set in Young Serif, Shantell Sans and Instrument Sans. Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>.
      </p>
    </Modal>
  );
}
