export function getSignalBand(rssi, snr) {
  if (rssi === null || rssi === undefined || snr === null || snr === undefined) return 'NO_SIGNAL';
  if (snr > 10 && rssi > -95)  return 'STRONG';
  if (snr > 3  && rssi > -105) return 'MEDIUM';
  if (snr > -5)                return 'LOW';
  return 'NO_SIGNAL';
}

export function getPacketSuccessRate(attempted, received) {
  return attempted === 0 ? null : (received / attempted) * 100;
}

export const BAND_COLORS = {
  STRONG:    { bg: 'bg-green-500',  text: 'text-green-400',  label: 'Strong'    },
  MEDIUM:    { bg: 'bg-amber-500',  text: 'text-amber-400',  label: 'Medium'    },
  LOW:       { bg: 'bg-orange-500', text: 'text-orange-400', label: 'Low'       },
  NO_SIGNAL: { bg: 'bg-red-500',    text: 'text-red-400',    label: 'No Signal' },
};
