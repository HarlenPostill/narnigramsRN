import { useCallback, useEffect, useRef, useState } from "react";

interface UseTimerOptions {
  countdownMinutes?: number; // 0 or undefined = count up only
  onExpire?: () => void;
}

export function useTimer({ countdownMinutes, onExpire }: UseTimerOptions = {}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      setIsRunning(false);
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const total = accumulatedRef.current + (now - startTimeRef.current);
        setElapsedMs(total);

        if (countdownMinutes && total >= countdownMinutes * 60 * 1000) {
          setIsRunning(false);
          onExpire?.();
        }
      }, 100);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, countdownMinutes, onExpire]);

  const countdownMs = countdownMinutes
    ? Math.max(0, countdownMinutes * 60 * 1000 - elapsedMs)
    : null;

  return {
    elapsedMs,
    countdownMs,
    isRunning,
    isExpired: countdownMs !== null && countdownMs <= 0,
    start,
    pause,
    reset,
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
