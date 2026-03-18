import { motion } from 'framer-motion';
import { BAND_COLORS } from '../services/signalQuality';

export function ResultCard({ uplink }) {
  const c = BAND_COLORS[uplink.band] || BAND_COLORS.NO_SIGNAL;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-4 bg-slate-800 border ${c.bg.replace('bg-', 'border-')}`}
    >
      <div className={`text-lg font-bold ${c.text}`}>{c.label}</div>
      <div className="text-slate-300 text-sm mt-1 grid grid-cols-2 gap-1">
        <span>RSSI: {uplink.rssi} dBm</span>
        <span>SNR: {uplink.snr} dB</span>
        {uplink.latencyMs && <span>Latency: {uplink.latencyMs}ms</span>}
        <span>GWs: {uplink.gatewayCount}</span>
      </div>
    </motion.div>
  );
}
