import { useNavigate } from "react-router-dom";
import { BAND_COLORS } from "../services/signalQuality";

const BAND_ORDER = ["STRONG", "MEDIUM", "LOW", "NO_SIGNAL"];

const BAR_BG = {
  STRONG:    "bg-green-500",
  MEDIUM:    "bg-amber-500",
  LOW:       "bg-orange-500",
  NO_SIGNAL: "bg-red-500",
};

export default function SummaryPage({ session }) {
  const nav = useNavigate();
  if (!session) { nav("/"); return null; }

  const { packetRate, readings, sensor, startedAt } = session;
  const total = packetRate.attempted;
  const rate  = total === 0
    ? null
    : (packetRate.received / total) * 100;

  const rateColor = rate === null  ? "text-slate-400"
                  : rate >= 90    ? "text-green-400"
                  : rate >= 70    ? "text-amber-400"
                  : "text-red-400";

  const bands = readings.reduce((acc, r) => {
    acc[r.band] = (acc[r.band] || 0) + 1;
    return acc;
  }, {});

  const latencyVals = readings.filter(r => r.latencyMs != null).map(r => r.latencyMs);
  const avgLatency  = latencyVals.length
    ? latencyVals.reduce((a, b) => a + b, 0) / latencyVals.length
    : null;

  const avgRssi = readings.length
    ? readings.reduce((a, r) => a + (r.rssi || 0), 0) / readings.length
    : null;

  const maxCount = Math.max(1, ...Object.values(bands));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sitescan-${startedAt?.slice(0, 10)}-${sensor?.devEUI?.slice(-8) || "session"}.json`;
    a.click();
  };

  const exportCSV = () => {
    const rows = [["timestamp", "rssi", "snr", "sf", "band", "latencyMs", "gatewayId", "gatewayCount"]];
    readings.forEach(r => rows.push([
      r.timestamp, r.rssi ?? "", r.snr ?? "", r.sf ?? "", r.band,
      r.latencyMs ?? "", r.gatewayId ?? "", r.gatewayCount ?? "",
    ]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sitescan-${startedAt?.slice(0, 10)}-${sensor?.devEUI?.slice(-8) || "session"}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <div className="max-w-sm mx-auto px-4 pt-8">
        <h2 className="text-2xl font-bold text-white mb-1">Session Summary</h2>
        <p className="text-slate-400 text-sm mb-6 font-mono">
          {sensor?.devEUI || "Unknown sensor"}
        </p>

        {/* Packet rate hero */}
        <div className="text-center mb-6 bg-slate-900 border border-slate-800 rounded-2xl py-8">
          <div className={`text-7xl font-black ${rateColor}`}>
            {rate !== null ? `${rate.toFixed(0)}%` : "—"}
          </div>
          <div className="text-slate-400 text-sm mt-2">
            {packetRate.received}/{packetRate.attempted} packets received
          </div>
          <div className="flex justify-center gap-4 mt-3">
            {avgRssi !== null && (
              <span className="text-slate-500 text-xs">
                Avg RSSI: <span className="font-mono">{avgRssi.toFixed(0)} dBm</span>
              </span>
            )}
            {avgLatency !== null && (
              <span className="text-slate-500 text-xs">
                Avg latency: <span className="font-mono">{avgLatency.toFixed(0)}ms</span>
              </span>
            )}
          </div>
        </div>

        {/* Band bar chart */}
        {Object.keys(bands).length > 0 && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-4">Signal Distribution</h3>
            <div className="space-y-3">
              {BAND_ORDER.filter(b => bands[b] != null).map(band => {
                const count = bands[band] || 0;
                const pct   = (count / maxCount) * 100;
                return (
                  <div key={band} className="flex items-center gap-3">
                    <span className={`text-xs font-semibold w-20 flex-shrink-0 ${BAND_COLORS[band]?.text}`}>
                      {BAND_COLORS[band]?.label}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_BG[band]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs w-6 text-right flex-shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Readings table */}
        {readings.length > 0 && (
          <div className="mb-24">
            <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Readings</h3>
            <div className="space-y-1">
              {readings.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs ${
                    i % 2 === 0 ? "bg-slate-900" : "bg-slate-800/60"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${BAR_BG[r.band]}`} />
                  <span className={`font-semibold w-16 flex-shrink-0 ${BAND_COLORS[r.band]?.text}`}>
                    {BAND_COLORS[r.band]?.label}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {r.rssi?.toFixed(0)} / {r.snr != null ? (r.snr >= 0 ? "+" : "") + r.snr.toFixed(1) : "—"}
                  </span>
                  {r.latencyMs != null && (
                    <span className="text-slate-600 font-mono ml-1">{r.latencyMs}ms</span>
                  )}
                  <span className="text-slate-600 ml-auto">
                    {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom export bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 px-4 pt-3"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-sm mx-auto space-y-2">
          <div className="flex gap-3">
            <button
              onClick={exportJSON}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={exportCSV}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Export CSV
            </button>
          </div>
          <button
            onClick={() => nav("/sensor")}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            New Survey
          </button>
        </div>
      </div>
    </div>
  );
}
