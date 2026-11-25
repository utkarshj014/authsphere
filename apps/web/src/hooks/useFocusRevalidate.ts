import { useEffect, useRef } from "react";

const DEFAULT_COOLDOWN_MS = 30_000;

/**
 * Invokes `callback` when the browser window regains focus,
 * throttled to at most once per `cooldownMs`.
 */
export function useFocusRevalidate(
  callback: () => void,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let lastRunAt = Date.now();

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRunAt < cooldownMs) return;
      lastRunAt = now;
      callbackRef.current();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [cooldownMs]);
}
