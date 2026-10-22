import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps browser / Android Back navigation inside the app.
 *
 * Each in-app navigation adds a history entry. Back therefore returns to the
 * view that opened the current view. At the app's root view, Back is trapped
 * instead of navigating out of the website or closing its WebView.
 */
export function useHistoryBack(
  view: string,
  setView: (v: string) => void,
  rootView = 'gis-survey',
) {
  const viewRef = useRef(view);
  viewRef.current = view;

  // Ensure the current website entry has an app state without replacing a
  // state already created by in-app navigation.
  useEffect(() => {
    const state = window.history.state as { appView?: string } | null;
    if (!state || typeof state.appView !== 'string') {
      window.history.replaceState({ ...(state || {}), appView: viewRef.current }, '');
    }
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { appView?: string } | null;
      const previousView = state?.appView;

      if (typeof previousView === 'string' && previousView !== viewRef.current) {
        // A valid previous app entry: restore it and remain inside the app.
        setView(previousView);
        return;
      }

      // At the root, or when the browser's previous entry is outside the app,
      // immediately restore an in-app history entry. Never let Back exit the
      // website / WebView from this application.
      if (viewRef.current === rootView || typeof previousView !== 'string') {
        window.history.pushState({ appView: viewRef.current }, '');
        return;
      }

      // Same-view history entries are not useful; keep the current view stable.
      window.history.pushState({ appView: viewRef.current }, '');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setView, rootView]);

  /** Navigate to a view and record it so Back returns to the previous view. */
  const go = useCallback(
    (next: string) => {
      if (next === viewRef.current) return;
      window.history.pushState({ appView: next }, '');
      setView(next);
    },
    [setView],
  );

  /** Return one step to the previous in-app page. */
  const back = useCallback(() => {
    if (viewRef.current === rootView) {
      // Root has no parent page; add a safe entry rather than leaving the site.
      window.history.pushState({ appView: viewRef.current }, '');
      return;
    }
    window.history.back();
  }, [rootView]);

  return { go, back };
}
