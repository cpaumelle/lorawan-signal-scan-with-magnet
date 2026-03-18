import { motion, AnimatePresence } from "framer-motion";
import { BAND_COLORS } from "../services/signalQuality";

const BAND_BG = {
  STRONG:    "bg-green-950/60 border-green-700",
  MEDIUM:    "bg-amber-950/60 border-amber-700",
  LOW:       "bg-orange-950/60 border-orange-700",
  NO_SIGNAL: "bg-red-950/60 border-red-700",
};

export function SignalHeroCard({ band, rssi, snr, sf, gatewayCount, latencyMs, isIdle }) {
  if (isIdle) {
    return (
      <motion.div
        key="idle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full rounded-2xl bg-slate-800 border border-slate-600 p-6 flex flex-col items-center justify-center min-h-[160px]"
      >
        <div className="flex items-center gap-2 text-slate-400 text-lg">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"
          />
          Waiting for signal…
        </div>
        <p className="text-slate-600 text-xs mt-3 text-center">
          Trigger the sensor, then tap CHECK IN
        </p>
      </motion.div>
    );
  }

  const colors = BAND_COLORS[band] || BAND_COLORS.NO_SIGNAL;
  const bgBorder = BAND_BG[band] || BAND_BG.NO_SIGNAL;

  return (
    <motion.div
      key={band}
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`w-full rounded-2xl border p-6 ${bgBorder}`}
    >
      <div className={`text-6xl font-black tracking-tight mb-3 ${colors.text}`}>
        {colors.label?.toUpperCase()}
      </div>
      <div className="text-white text-2xl font-semibold mb-4">
        <span className="font-mono">{rssi?.toFixed(0)}</span> dBm
        &nbsp;/&nbsp;
        <span className="font-mono">{snr != null ? (snr >= 0 ? "+" : "") + snr.toFixed(1) : "—"}</span> dB
      </div>
      <div className="flex flex-wrap gap-2">
        {sf != null && (
          <span className="px-2.5 py-1 rounded-full bg-slate-800/70 text-slate-300 text-xs font-mono">
            SF{sf}
          </span>
        )}
        {gatewayCount != null && (
          <span className="px-2.5 py-1 rounded-full bg-slate-800/70 text-slate-300 text-xs">
            {gatewayCount} GW
          </span>
        )}
        {latencyMs != null && (
          <span className="px-2.5 py-1 rounded-full bg-slate-800/70 text-slate-300 text-xs font-mono">
            {latencyMs}ms
          </span>
        )}
      </div>
    </motion.div>
  );
}
