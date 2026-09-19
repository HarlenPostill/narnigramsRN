import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
interface UseTimerOptions { countdownMinutes?: number; onExpire?: () => void }
/** Wall-clock elapsed time catches up after backgrounding; callbacks do not restart the timer. */
export function useTimer({ countdownMinutes, onExpire }: UseTimerOptions = {}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const running = useRef(false);
  const startTime = useRef(0);
  const accumulated = useRef(0);
  const expire = useRef(onExpire);
  useEffect(() => { expire.current = onExpire; }, [onExpire]);
  const start = useCallback((initialElapsedMs?: number) => {
    if (running.current) return;
    if (initialElapsedMs !== undefined) accumulated.current = Math.max(0, initialElapsedMs);
    startTime.current = Date.now(); running.current = true;
    setElapsedMs(accumulated.current); setIsRunning(true);
  }, []);
  const pause = useCallback(() => {
    if (!running.current) return;
    accumulated.current += Math.max(0, Date.now() - startTime.current);
    running.current = false; setElapsedMs(accumulated.current); setIsRunning(false);
  }, []);
  const reset = useCallback(() => { accumulated.current = 0; startTime.current = Date.now(); setElapsedMs(0); }, []);
  useEffect(() => {
    if (!isRunning) return;
    const update = () => {
      if (!running.current) return;
      const total = accumulated.current + Math.max(0, Date.now() - startTime.current);
      setElapsedMs(total);
      if (countdownMinutes && total >= countdownMinutes * 60000) {
        running.current = false; accumulated.current = total; setIsRunning(false); expire.current?.();
      }
    };
    const interval = setInterval(update, 1000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [isRunning, countdownMinutes]);
  const countdownMs = countdownMinutes ? Math.max(0, countdownMinutes * 60000 - elapsedMs) : null;
  return { elapsedMs, countdownMs, isRunning, isExpired: countdownMs !== null && countdownMs <= 0, start, pause, reset };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}
