import { useState, useEffect, useRef } from "react";
import { pollUplinks } from "../services/microshareApi";

export function useUplinkStream({ devEUI, token, env, recType, pollInterval = 3000, enabled = true }) {
  const [uplinks, setUplinks]   = useState([]);
  const [error, setError]       = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const seenIds      = useRef(new Set());
  const lastPollTime = useRef(null);
  const timeoutRef   = useRef(null);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const since   = lastPollTime.current;
        const results = await pollUplinks(devEUI, since, token, env, null, recType);
        const now     = new Date().toISOString();
        lastPollTime.current = now;

        console.log(`[poll] ${now} since=${since ?? "none"} -> ${results.length} uplink(s)`);
        if (results.length > 0) {
          results.forEach(u =>
            console.log(`  [uplink] id=${u.id} ts=${u.timestamp} rssi=${u.rssi} snr=${u.snr} sf=${u.sf} gw=${u.gatewayCount}`)
          );
        }

        const newUplinks = results.filter(u => !seenIds.current.has(u.id));
        if (newUplinks.length > 0) {
          console.log(`[poll] ${newUplinks.length} NEW (seenSet size=${seenIds.current.size})`);
          newUplinks.forEach(u => seenIds.current.add(u.id));
          setUplinks(prev => [...newUplinks, ...prev]);
          setError(null);
        }
      } catch (e) {
        console.error("[poll] error:", e.message);
        setError(e.message);
      }
      if (active) timeoutRef.current = setTimeout(poll, pollInterval);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timeoutRef.current);
    };
  }, [devEUI, token, env, recType, pollInterval, enabled]);

  return { uplinks, error, isOnline };
}
