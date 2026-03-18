import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BAND_COLORS } from "../services/signalQuality";

const DOT_COLORS = {
  STRONG:    "bg-green-400",
  MEDIUM:    "bg-amber-400",
  LOW:       "bg-orange-400",
  NO_SIGNAL: "bg-red-400",
};

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EventPill({ ev }) {
  if (ev.type === "trigger") {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
        <span className="text-slate-500 text-xs font-mono w-[68px] flex-shrink-0">
          {fmt(ev.checkInAt)}
        </span>
        <span className="text-blue-300 text-sm">Checking…</span>
      </div>
    );
  }

  if (ev.type === "uplink") {
    const colors = BAND_COLORS[ev.band];
    const dotCls = DOT_COLORS[ev.band] || "bg-slate-400";
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700">
        <span className={`w-2 h-2 rounded-full ${dotCls} flex-shrink-0`} />
        <span className="text-slate-500 text-xs font-mono w-[68px] flex-shrink-0">
          {fmt(ev.timestamp)}
        </span>
        <span className={`font-semibold text-sm ${colors?.text}`}>
          {colors?.label || ev.band}
        </span>
        <span className="text-slate-400 text-xs font-mono ml-1">
          {ev.rssi?.toFixed(0)}dBm / {ev.snr != null ? (ev.snr >= 0 ? "+" : "") + ev.snr.toFixed(1) : "—"}dB
        </span>
        <div className="ml-auto flex gap-1.5 flex-shrink-0">
          {ev.gatewayCount != null && (
            <span className="text-xs text-slate-500">{ev.gatewayCount} GW</span>
          )}
          {ev.latencyMs != null && (
            <span className="text-xs text-slate-600 font-mono">{ev.latencyMs}ms</span>
          )}
        </div>
      </div>
    );
  }

  if (ev.type === "timeout") {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
        <span className="text-slate-500 text-xs font-mono w-[68px] flex-shrink-0">
          {fmt(ev.checkInAt)}
        </span>
        <span className="text-red-400 text-sm">No signal</span>
        <span className="text-slate-600 text-xs ml-1">─</span>
      </div>
    );
  }

  if (ev.type === "note") {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
        <span className="text-slate-500 text-xs font-mono w-[68px] flex-shrink-0">
          {fmt(ev.createdAt)}
        </span>
        <span className="text-slate-300 text-sm">📝 {ev.text}</span>
      </div>
    );
  }

  return null;
}

export function ActivityFeed({ events }) {
  const containerRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || userScrolled) return;
    el.scrollTop = 0;
  }, [events, userScrolled]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setUserScrolled(el.scrollTop > 8);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="space-y-1.5 px-3 pb-2"
    >
      <AnimatePresence initial={false}>
        {events.map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EventPill ev={ev} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
