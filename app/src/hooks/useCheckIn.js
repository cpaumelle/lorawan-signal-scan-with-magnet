import { useState, useRef, useCallback, useEffect } from "react";

export function useCheckIn({ windowMs = 15000, onResult, onTimeout }) {
  const [state,     setState]     = useState("idle");
  const [checkInAt, setCheckInAt] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef     = useRef(null);
  const tickRef      = useRef(null);
  const onResultRef  = useRef(onResult);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => { onResultRef.current  = onResult;  }, [onResult]);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const checkIn = useCallback(() => {
    if (state !== "idle") return;
    const now = new Date();
    console.log(`[checkIn] window opened at ${now.toISOString()} (${windowMs}ms)`);
    setCheckInAt(now);
    setRemaining(windowMs);
    setState("pending");
    timerRef.current = setTimeout(() => {
      console.log("[checkIn] window EXPIRED");
      setState("expired");
      if (navigator.vibrate) navigator.vibrate(500);
      onTimeoutRef.current?.();
    }, windowMs);
    tickRef.current = setInterval(() => {
      setRemaining(r => Math.max(0, r - 100));
    }, 100);
  }, [state, windowMs]);

  const resolve = useCallback((uplink) => {
    if (state !== "pending") return;
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
    console.log(`[checkIn] RESOLVED id=${uplink.id} band=${uplink.band} rssi=${uplink.rssi} snr=${uplink.snr}`);
    setState("resolved");
    const band = uplink.band;
    if (navigator.vibrate) {
      if      (band === "STRONG") navigator.vibrate(100);
      else if (band === "MEDIUM") navigator.vibrate([100, 50, 100]);
      else if (band === "LOW")    navigator.vibrate([100, 50, 100, 50, 100]);
      else                        navigator.vibrate(500);
    }
    onResultRef.current?.(uplink);
  }, [state]);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
    console.log("[checkIn] reset to idle");
    setState("idle");
    setCheckInAt(null);
    setRemaining(0);
  }, []);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
  }, []);

  return { state, checkInAt, remaining, checkIn, resolve, reset };
}
