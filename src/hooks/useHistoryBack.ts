import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps in-app navigation on the browser history stack so Back goes one step
 * inside the app instead of leaving the site / closing the WebView.
 *
 * - setView(next) pushes a history entry (unless next === current)
 * - browser / Android Back fires popstate → restores previous view
 * - at the root view, Back is intercepted once (confirm) so a single accidental
 *   press does not exit; a second press within a short window is allowed to leave
 */
export function useHistoryBack(
  view: string,
  setView: (v: string) => void,
  rootView = 'gis-survey',
) {
  const viewRef = useRef(view);
  viewRef.current = view;
  const exitArmed = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed history so the first Back has something to pop to without leaving
  useEffect(() => {
    const state = window.history.state as { appView?: string } | null;
    if (!state || state.appView == null) {
      window.history.replaceState({ appView: viewRef.current }, '');
    }
  }, []);

  // React to browser / Android system Back
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const next = (e.state as { appView?: string } | null)?.appView;
      if (next != null && next !== viewRef.current) {
        exitArmed.current = false;
        setView(next);
        return;
      }
      // Already at root (or unknown state): don't leave on first Back
      if (viewRef.current === rootView || next == null) {
        window.history.pushState({ appView: viewRef.current }, '');
        if (!exitArmed.current) {
          exitArmed.current = true;
          if (exitTimer.current) clearTimeout(exitTimer.current);
          exitTimer.current = setTimeout(() => {
            exitArmed.current = false;
          }, 2000);
          // Optional: surface a soft hint via a custom event the UI can listen to
          window.dispatchEvent(new CustomEvent('app-back-at-root'));
        }
        // Second Back within 2s: allow leaving by going back again
        else {
          exitArmed.current = false;
          window.history.back();
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [setView, rootView]);

  /** Navigate to a view and push history so Back returns here. */
  const go = useCallback(
    (next: string) => {
      if (next === viewRef.current) return;
      window.history.pushState({ appView: next }, '');
      setView(next);
    },
    [setView],
  );

  /** Go one step back in the in-app stack (same as hardware Back). */
  const back = useCallback(() => {
    window.history.back();
  }, []);

  return { go, back };
}
