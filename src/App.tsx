import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { readLocalSky, WeatherError, type WeatherFailure } from './adapters/weather';
import { rankIdeas, vaneHeading, withinReach } from './domain/matching';
import { skyPhrase, timeOfDayFrom, type Preset } from './domain/moment';
import { paletteFor } from './domain/palette';
import { newIdea, reducer } from './domain/state';
import { browserStorage, loadState, saveState, STORAGE_KEY } from './domain/storage';
import type { Idea, IdeaDraft, Kind, Moment } from './domain/types';
import { About } from './ui/About';
import { Almanac } from './ui/Almanac';
import { Backdrop } from './ui/Backdrop';
import { BeginDialog } from './ui/BeginDialog';
import { CloudTop } from './ui/CloudTop';
import { Composer } from './ui/Composer';
import { IdeaDialog } from './ui/IdeaDialog';
import { KIND_LABEL, newId, prefersReducedMotion, shortDuration } from './ui/labels';
import { ListView } from './ui/ListView';
import { Stage } from './ui/Stage';
import { useNarrow, useRoute } from './ui/useRoute';
import { Vane } from './ui/Vane';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  lasting?: boolean;
}

const LIVE_TTL = 30 * 60_000;

const FAILURE_TEXT: Record<WeatherFailure, string> = {
  denied: 'No location, no problem. The hour is from your clock; pick the weather in the sentence.',
  unsupported: 'This browser can’t share a location. The hour is from your clock; pick the weather in the sentence.',
  position: 'Couldn’t find your location just now. The hour is from your clock; pick the weather in the sentence.',
  network: 'Couldn’t reach the weather service. The hour is from your clock; pick the weather in the sentence.',
};

function tomorrowMorning(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d.getTime();
}

export function App() {
  const storage = useRef(browserStorage());
  const [boot] = useState(() => loadState(storage.current, Date.now()));
  const [state, dispatch] = useReducer(reducer, boot.state);
  const [view, navigate] = useRoute();
  const narrow = useNarrow();

  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<Kind | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [beginId, setBeginId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [keptId, setKeptId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announce, setAnnounce] = useState('');

  const showToast = useCallback((message: string, action?: Toast['action'], lasting?: boolean) => {
    setToast({ id: Date.now(), message, action, lasting });
  }, []);

  useEffect(() => {
    if (!toast || toast.lasting) return;
    const t = setTimeout(() => setToast((c) => (c?.id === toast.id ? null : c)), toast.action ? 9000 : 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Persistence, plus an honest word if the browser won't keep anything.
  const warnedAboutSaving = useRef(false);
  useEffect(() => {
    const ok = saveState(storage.current, state);
    if (!ok && !warnedAboutSaving.current) {
      warnedAboutSaving.current = true;
      showToast('This browser isn’t keeping anything right now, so your ideas will vanish when the tab closes.', undefined, true);
    }
  }, [state, showToast]);

  useEffect(() => {
    if (boot.notice === 'unreadable') showToast('Your saved ideas couldn’t be read, so this is a fresh sky. A copy of the old data is kept in this browser.', undefined, true);
    if (boot.notice === 'recovered') showToast('A few saved ideas were damaged and had to be left out. The rest are here.', undefined, true);
    // Runs once for the boot result.
  }, []);

  // Another tab changed the data: follow it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'hydrate', state: loadState(storage.current, Date.now()).state });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // The clock only moves things when the sky is actually following it.
  const momentRef = useRef(state.moment);
  momentRef.current = state.moment;
  const sourceRef = useRef(state.source);
  sourceRef.current = state.source;
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const source = sourceRef.current;
      if (source.kind !== 'live' && source.kind !== 'clock') return;
      const time = timeOfDayFrom(new Date(t));
      const stale = source.kind === 'live' && t - source.fetchedAt > LIVE_TTL;
      if (stale || time !== momentRef.current.time) {
        const { tempC, ...rest } = momentRef.current;
        dispatch({
          type: 'moment',
          moment: stale ? { ...rest, time } : { ...momentRef.current, time },
          source: stale ? { kind: 'clock' } : source,
        });
      }
    };
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  const ranked = useMemo(() => rankIdeas(state.ideas, state.moment, now), [state.ideas, state.moment, now]);
  const reach = useMemo(() => withinReach(ranked), [ranked]);
  const heading = useMemo(() => vaneHeading(reach), [reach]);

  useEffect(() => {
    if (!state.introSeen) return;
    setAnnounce(
      reach.length
        ? `For ${skyPhrase(state.moment)}, within reach: ${reach.map((m) => m.idea.title).join('; ')}.`
        : `Nothing is asking for ${skyPhrase(state.moment)}.`,
    );
    // Only announce when the answer changes, not when the clock ticks.
  }, [reach.map((m) => m.idea.id).join(), state.moment.weather, state.moment.time, state.introSeen]);

  const palette = paletteFor(state.moment.time, state.moment.weather);
  useEffect(() => {
    document.documentElement.style.setProperty('--page', palette.body);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.cloud);
  }, [palette.body, palette.cloud]);

  // ---- context ----
  const advanceHint = (from: number) => {
    if (state.hint === from) dispatch({ type: 'hint', hint: from + 1 });
  };

  const changeMoment = (change: Partial<Moment>) => {
    const skyEdited = change.weather !== undefined || change.time !== undefined;
    let source = state.source;
    if (skyEdited) {
      const followingClock = source.kind === 'live' || source.kind === 'clock';
      source = followingClock && change.time === undefined ? { kind: 'clock' } : { kind: 'manual' };
    }
    const moment = { ...state.moment, ...change };
    if (skyEdited) delete moment.tempC;
    dispatch({ type: 'moment', moment, source });
    advanceHint(0);
  };

  const choosePreset = (preset: Preset) => {
    dispatch({ type: 'moment', moment: preset.moment, source: { kind: 'demo' } });
    advanceHint(0);
  };

  const useRealSky = async () => {
    setLiveBusy(true);
    const time = timeOfDayFrom(new Date());
    try {
      const reading = await readLocalSky();
      const { tempC: _old, ...rest } = state.moment;
      dispatch({
        type: 'moment',
        moment: { ...rest, time, weather: reading.weather, ...(reading.tempC !== undefined ? { tempC: reading.tempC } : {}) },
        source: { kind: 'live', fetchedAt: Date.now() },
      });
      advanceHint(0);
      showToast('That’s your actual sky now. It stays until you change it or half an hour passes.');
    } catch (err) {
      const reason: WeatherFailure = err instanceof WeatherError ? err.reason : 'network';
      const { tempC: _old, ...rest } = state.moment;
      dispatch({ type: 'moment', moment: { ...rest, time }, source: { kind: 'clock' } });
      showToast(FAILURE_TEXT[reason]);
    } finally {
      setLiveBusy(false);
    }
  };

  // ---- ideas ----
  const sendUp = (draft: IdeaDraft) => {
    const idea = newIdea(draft, Date.now(), newId());
    dispatch({ type: 'add', idea });
    if (!state.introSeen) dispatch({ type: 'intro-done' });
    setFilter((f) => (f && f !== idea.kind ? null : f));
    setLaunchId(idea.id);
    showToast(`Up it goes. Filed under ${KIND_LABEL[idea.kind]}, about ${shortDuration(idea.minutes)}.`, {
      label: 'Change',
      run: () => setOpenId(idea.id),
    });
  };

  const openIdea = (id: string) => {
    setOpenId(id);
    advanceHint(1);
  };

  const finish = (id: string) => {
    setOpenId(null);
    setBeginId(null);
    const commit = () => {
      setKeptId(null);
      dispatch({ type: 'finish', id, now: Date.now() });
      showToast('Kept in the Almanac. There’s one more star on clear nights.', {
        label: 'Undo',
        run: () => dispatch({ type: 'unfinish', id }),
      });
    };
    if (prefersReducedMotion() || view !== 'sky') commit();
    else {
      setKeptId(id);
      setTimeout(commit, 900);
    }
  };

  const letGo = (idea: Idea) => {
    setOpenId(null);
    dispatch({ type: 'remove', id: idea.id });
    showToast('Let go.', { label: 'Undo', run: () => dispatch({ type: 'restore', idea }) });
  };

  const openMatch = ranked.find((m) => m.idea.id === openId);
  const beginIdea = state.ideas.find((i) => i.id === beginId);

  const startIntro = () => {
    dispatch({ type: 'intro-done' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  const hint = !state.introSeen || view !== 'sky'
    ? null
    : state.hint === 0
      ? 'Try another sky, and watch the notes move.'
      : state.hint === 1
        ? 'Now open a low note to see why it came down.'
        : null;

  const vane = <Vane angle={heading.angle} filter={filter} onFilter={setFilter} />;

  return (
    <div
      className="app"
      data-view={view}
      data-intro={!state.introSeen || undefined}
      style={{
        ['--sky1' as string]: palette.sky1,
        ['--sky2' as string]: palette.sky2,
        ['--sky3' as string]: palette.sky3,
        ['--cloud' as string]: palette.cloud,
        ['--cloud-back' as string]: palette.cloudBack,
        ['--cloud-ink' as string]: palette.cloudInk,
        ['--on-sky' as string]: palette.onSky,
        ['--thread' as string]: palette.thread,
        ['--ground' as string]: palette.ground,
        ['--ground-back' as string]: palette.groundBack,
      }}
    >
      <Backdrop moment={state.moment} ideas={state.ideas} />
      <a className="skip" href="#main">Skip to your ideas</a>

      <CloudTop
        view={view}
        moment={state.moment}
        source={state.source}
        showForecast={view !== 'almanac'}
        hint={hint}
        liveBusy={liveBusy}
        onNavigate={navigate}
        onAbout={() => setAboutOpen(true)}
        onMoment={changeMoment}
        onPreset={choosePreset}
        onLive={useRealSky}
        onDismissHint={() => dispatch({ type: 'hint', hint: 2 })}
      />

      <main id="main" tabIndex={-1}>
        {view === 'sky' && (
          <Stage
            ranked={ranked}
            filter={filter}
            introSeen={state.introSeen}
            launchId={launchId}
            keptId={keptId}
            vane={narrow ? vane : undefined}
            onOpen={openIdea}
            onShowList={() => navigate('list')}
            onClearFilter={() => setFilter(null)}
            intro={
              <div className="intro">
                <h1 className="intro__title">Your ideas deserve the right&nbsp;moment.</h1>
                <p className="intro__text">
                  Hang an idea from the cloud. When the weather, the hour and your energy suit it, it comes down within reach.
                </p>
                <button type="button" className="btn btn--primary btn--large" onClick={startIntro}>
                  Bring down what fits
                </button>
              </div>
            }
          />
        )}
        {view === 'list' && <ListView ranked={ranked} filter={filter} onFilter={setFilter} onOpen={openIdea} />}
        {view === 'almanac' && (
          <Almanac ideas={state.ideas} onUnfinish={(id) => {
            dispatch({ type: 'unfinish', id });
            showToast('Back up in the cloud.');
          }} />
        )}
      </main>

      {view !== 'almanac' && (
        <footer className="ground" data-has-vane={view === 'sky' && !narrow ? true : undefined}>
          <svg className="ground__hills" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path className="hill-back" d="M0 44 C160 16 320 60 520 36 S900 8 1120 34 S1340 50 1440 28 V80 H0Z" />
            <path className="hill-front" d="M0 62 C220 34 420 72 680 50 S1160 30 1440 58 V80 H0Z" />
          </svg>
          <div className="ground__inner">
            {view === 'sky' && !narrow && <div className="ground__vane">{vane}</div>}
            <Composer onSend={sendUp} />
          </div>
        </footer>
      )}

      {openMatch && !beginId && (
        <IdeaDialog
          key={openMatch.idea.id}
          match={openMatch}
          moment={state.moment}
          now={now}
          onClose={() => setOpenId(null)}
          onBegin={() => setBeginId(openMatch.idea.id)}
          onFinish={() => finish(openMatch.idea.id)}
          onRestSky={() => {
            dispatch({ type: 'rest-sky', id: openMatch.idea.id });
            setOpenId(null);
            showToast('Back in the cloud until the sky changes.', { label: 'Undo', run: () => dispatch({ type: 'wake', id: openMatch.idea.id }) });
          }}
          onRestTomorrow={() => {
            dispatch({ type: 'rest-until', id: openMatch.idea.id, until: tomorrowMorning(Date.now()) });
            setOpenId(null);
            showToast('Resting until tomorrow morning.', { label: 'Undo', run: () => dispatch({ type: 'wake', id: openMatch.idea.id }) });
          }}
          onWake={() => dispatch({ type: 'wake', id: openMatch.idea.id })}
          onShrink={() => dispatch({ type: 'shrink', id: openMatch.idea.id })}
          onEdit={(draft) => {
            dispatch({ type: 'edit', id: openMatch.idea.id, draft });
            showToast('Saved.');
          }}
          onLetGo={() => letGo(openMatch.idea)}
        />
      )}

      {beginIdea && (
        <BeginDialog
          idea={beginIdea}
          onClose={() => setBeginId(null)}
          onCounted={(next) => {
            dispatch({ type: 'log-step', id: beginIdea.id, now: Date.now(), next });
            setBeginId(null);
            setOpenId(null);
            showToast('That counts. It’s back in the cloud until the sky changes.');
          }}
          onFinished={() => {
            dispatch({ type: 'log-step', id: beginIdea.id, now: Date.now() });
            finish(beginIdea.id);
          }}
        />
      )}

      {aboutOpen && (
        <About
          onClose={() => setAboutOpen(false)}
          onResetDemo={() => {
            dispatch({ type: 'reset-demo', now: Date.now() });
            setFilter(null);
            setAboutOpen(false);
            showToast('Demo reset. Anything you wrote is still here.');
          }}
          onRemoveSamples={() => {
            dispatch({ type: 'remove-samples' });
            setFilter(null);
            setAboutOpen(false);
            showToast('Just your ideas now.');
          }}
          onErase={() => {
            dispatch({ type: 'erase', now: Date.now() });
            setFilter(null);
            setAboutOpen(false);
            showToast('Everything you wrote is gone from this browser. The samples are back.');
          }}
        />
      )}

      <div className="sr-only" aria-live="polite">{announce}</div>
      <div className="toasts" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}
