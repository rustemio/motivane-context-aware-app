import { useCallback, useEffect, useState } from 'react';

export type View = 'sky' | 'list' | 'almanac';

const viewFromPath = (path: string): View => (path === '/list' ? 'list' : path === '/almanac' ? 'almanac' : 'sky');
const pathFromView = (view: View) => (view === 'sky' ? '/' : `/${view}`);

export function useRoute(): [View, (view: View) => void] {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: View) => {
    if (viewFromPath(window.location.pathname) !== next) window.history.pushState(null, '', pathFromView(next));
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  return [view, navigate];
}

/** The layout changes at one width; JS needs to know because the vane moves in the DOM. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}
