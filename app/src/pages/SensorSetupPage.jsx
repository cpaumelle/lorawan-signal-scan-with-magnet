import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { discoverDevices } from "../services/microshareApi";

function relativeTime(isoStr) {
  if (!isoStr) return "";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function BatteryBar({ pct }) {
  const color = pct >= 50 ? "bg-green-500"
              : pct >= 20 ? "bg-amber-500"
              : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-4 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-40 mb-2" />
          <div className="h-3 bg-slate-700 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

export default function SensorSetupPage({ auth, onSetupSensor }) {
  const [devices,  setDevices]  = useState(null);
  const [selected, setSelected] = useState("");
  const [loading,  setLoading]  = useState(false);
  const nav = useNavigate();

  const load = () => {
    if (!auth) return;
    setDevices(null);
    discoverDevices(auth.token, auth.env)
      .then(d => {
        setDevices(d);
        if (d.length === 1) setSelected(d[0].devEUI);
      })
      .catch(() => setDevices([]));
  };

  useEffect(() => { load(); }, [auth]);

  const handleStart = () => {
    if (!selected) return;
    onSetupSensor({ devEUI: selected, sensorType: "Browan Tabs TBDW100" });
    nav("/survey");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4">
      <div className="max-w-sm mx-auto w-full pt-8 flex-1">
        <div className="mb-6">
          <button
            onClick={() => nav("/")}
            className="text-slate-500 text-sm hover:text-slate-300 mb-4 block"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-white mb-1">Select Sensor</h2>
          <p className="text-slate-400 text-sm">Browan Tabs TBDW100</p>
        </div>

        {/* Loading skeleton */}
        {devices === null && <Skeleton />}

        {/* Empty state */}
        {devices !== null && devices.length === 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <div className="text-slate-400 text-2xl mb-3">📡</div>
            <p className="text-slate-300 text-sm font-medium mb-1">No devices found</p>
            <p className="text-slate-500 text-xs mb-4">
              Is the sensor sending uplinks?
            </p>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Device list */}
        {devices !== null && devices.length > 0 && (
          <>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">
              {devices.length} device{devices.length !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-2.5 mb-6">
              {devices.map(d => {
                const isSelected = selected === d.devEUI;
                // lastSeen stored as formatted string — recompute relative from raw if available
                const seenLabel = d.lastSeen;
                return (
                  <button
                    key={d.devEUI}
                    onClick={() => setSelected(d.devEUI)}
                    className={`w-full text-left rounded-xl px-4 py-4 transition-all border ${
                      isSelected
                        ? "bg-blue-950/60 border-blue-600 shadow-lg shadow-blue-950/30"
                        : "bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-sm tracking-wider text-white">
                        {d.devEUI}
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                    {d.location && (
                      <div className="text-xs text-slate-400 mt-1">{d.location}</div>
                    )}
                    <div className="text-xs text-slate-600 mt-1.5">{seenLabel}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleStart}
              disabled={!selected}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-40 text-base"
            >
              Start Survey →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
