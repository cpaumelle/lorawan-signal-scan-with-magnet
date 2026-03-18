import { BAND_COLORS } from '../services/signalQuality';

export function SignalBadge({ band }) {
  const c = BAND_COLORS[band] || BAND_COLORS.NO_SIGNAL;
  return (
    <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}
