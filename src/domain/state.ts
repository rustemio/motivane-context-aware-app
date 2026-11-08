import { DEFAULT_MOMENT, skyKey } from './moment';
import { GENTLE_LEVELS, gentleStep } from './guess';
import { seedIdeas } from './seeds';
import type { Idea, IdeaDraft, Moment, SkySource } from './types';

export interface AppState {
  ideas: Idea[];
  moment: Moment;
  source: SkySource;
  introSeen: boolean;
  /** 0: suggest changing the sky. 1: suggest opening a note. 2: no more hints. */
  hint: number;
}

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'moment'; moment: Moment; source?: SkySource }
  | { type: 'add'; idea: Idea }
  | { type: 'edit'; id: string; draft: IdeaDraft }
  | { type: 'remove'; id: string }
  | { type: 'restore'; idea: Idea }
  | { type: 'finish'; id: string; now: number }
  | { type: 'unfinish'; id: string }
  | { type: 'rest-sky'; id: string }
  | { type: 'rest-until'; id: string; until: number }
  | { type: 'wake'; id: string }
  | { type: 'shrink'; id: string }
  | { type: 'log-step'; id: string; now: number; next?: string }
  | { type: 'intro-done' }
  | { type: 'hint'; hint: number }
  | { type: 'reset-demo'; now: number }
  | { type: 'remove-samples' }
  | { type: 'erase'; now: number };

export function initialState(now: number): AppState {
  return { ideas: seedIdeas(now), moment: DEFAULT_MOMENT, source: { kind: 'demo' }, introSeen: false, hint: 0 };
}

export function newIdea(draft: IdeaDraft, now: number, id: string): Idea {
  return { ...draft, id, shrink: 0, sample: false, createdAt: now, steps: [] };
}

function patch(state: AppState, id: string, change: (idea: Idea) => Idea): AppState {
  return { ...state, ideas: state.ideas.map((i) => (i.id === id ? change(i) : i)) };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'moment': {
      // "Until the sky changes" ends the first time the sky is different,
      // so coming back to the same weather later doesn't hide it again.
      const key = skyKey(action.moment);
      return {
        ...state,
        moment: action.moment,
        source: action.source ?? state.source,
        ideas: state.ideas.map((i) => (i.restSky && i.restSky !== key ? { ...i, restSky: undefined } : i)),
      };
    }
    case 'add':
      return { ...state, ideas: [...state.ideas, action.idea] };
    case 'edit':
      return patch(state, action.id, (i) => ({
        ...i,
        ...action.draft,
        shrink: action.draft.step !== i.step ? 0 : i.shrink,
      }));
    case 'remove':
      return { ...state, ideas: state.ideas.filter((i) => i.id !== action.id) };
    case 'restore':
      return { ...state, ideas: [...state.ideas.filter((i) => i.id !== action.idea.id), action.idea] };
    case 'finish':
      return patch(state, action.id, (i) => ({
        ...i,
        doneAt: action.now,
        doneIn: { weather: state.moment.weather, time: state.moment.time },
        restSky: undefined,
        restUntil: undefined,
      }));
    case 'unfinish':
      return patch(state, action.id, (i) => ({ ...i, doneAt: undefined, doneIn: undefined }));
    case 'rest-sky':
      return patch(state, action.id, (i) => ({ ...i, restSky: skyKey(state.moment), restUntil: undefined }));
    case 'rest-until':
      return patch(state, action.id, (i) => ({ ...i, restUntil: action.until, restSky: undefined }));
    case 'wake':
      return patch(state, action.id, (i) => ({ ...i, restSky: undefined, restUntil: undefined }));
    case 'shrink':
      return patch(state, action.id, (i) => ({ ...i, shrink: i.shrink >= GENTLE_LEVELS ? 0 : i.shrink + 1 }));
    case 'log-step':
      return patch(state, action.id, (i) => {
        const text = i.shrink > 0 ? gentleStep(i.kind, i.shrink) : i.step;
        const next = action.next?.trim();
        return {
          ...i,
          steps: [...i.steps, { at: action.now, text }],
          step: next || i.step,
          stepMinutes: next ? 5 : i.stepMinutes,
          shrink: next ? 0 : i.shrink,
          restSky: skyKey(state.moment),
        };
      });
    case 'intro-done':
      return { ...state, introSeen: true };
    case 'hint':
      return { ...state, hint: action.hint };
    case 'reset-demo':
      // Only ever touches samples. Anything the visitor wrote is left alone.
      return {
        ...state,
        ideas: [...state.ideas.filter((i) => !i.sample), ...seedIdeas(action.now)],
        moment: DEFAULT_MOMENT,
        source: { kind: 'demo' },
        hint: 0,
      };
    case 'remove-samples':
      return { ...state, ideas: state.ideas.filter((i) => !i.sample) };
    case 'erase':
      return { ...initialState(action.now), introSeen: true, hint: 2 };
  }
}
