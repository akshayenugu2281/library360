import { useEffect, useRef } from "react";

/**
 * Keeps a read-only page alive: re-runs `refresh` on an interval and whenever
 * the tab regains focus, pausing while the tab is hidden. Never wire this to a
 * page with unsaved form state — it only suits list/dashboard views.
 */
export function useLiveRefresh(refresh: () => void, intervalMs = 30000): void {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) {
        try {
          latest.current();
        } catch {
          /* A background refresh must never break the visible page. */
        }
      }
    };
    const id = window.setInterval(tick, intervalMs);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);
}
