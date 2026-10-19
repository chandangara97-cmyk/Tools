import { useCallback, useEffect, useRef } from 'react';

/**
 * One-step Back for pages that live inside a screen (menu -> a page, list -> one item, a tab inside a page).
 * Each step is a browser-history entry that carries the screen's value under `key`, next to the other keys
 * (see useHistoryBack, which owns `appView`). Back, the phone's Back button and the on-screen Back all pop
 * exactly one entry, so the user returns to the page they came from instead of leaving the website.
 */
type St = Record<string, unknown> | null;
const state = (): Record<string, unknown> => (window.history.state as St) || {};

/** Value saved for `key` on the current history entry (used when a screen is opened again by Back/Forward). */
export const readStep = <T extends string>(key: string, fallback: T): T => {
  const v = state()[key];
  return (typeof v === 'string' ? v : fallback) as T;
};

export function useStepBack<T extends string>(key: string, value: T, setValue: (v: T) => void, initial: T, reset: string[] = []) {
  const valueRef = useRef(value); valueRef.current = value;
  const setRef = useRef(setValue); setRef.current = setValue;
  const resetRef = useRef(reset); resetRef.current = reset;

  // Browser / Android Back and Forward: show the value stored on the entry we land on
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as St) || {};
      const v = typeof s[key] === 'string' ? (s[key] as T) : initial;
      if (v !== valueRef.current) setRef.current(v);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [key, initial]);

  /** Open `next` as a new step: Back returns to what was showing before. */
  const go = useCallback((next: T) => {
    if (next === valueRef.current) return;
    const cleared: Record<string, undefined> = {};
    for (const k of resetRef.current) cleared[k] = undefined;   // a new page starts with fresh inner pages
    window.history.pushState({ ...state(), ...cleared, [key]: next }, '');
    setRef.current(next);
  }, [key]);

  /** One step back. If this page was not opened as a step (e.g. a direct link), fall back to `initial`. */
  const back = useCallback(() => {
    if (typeof state()[key] === 'string') window.history.back();
    else setRef.current(initial);
  }, [key, initial]);

  return { go, back };
}
