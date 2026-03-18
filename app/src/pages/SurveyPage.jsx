import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUplinkStream } from "../hooks/useUplinkStream";
import { useCheckIn } from "../hooks/useCheckIn";
import { usePacketRate } from "../hooks/usePacketRate";
import { getSignalBand, BAND_COLORS } from "../services/signalQuality";
import { CheckInButton } from "../components/CheckInButton";
import { PacketRateBadge } from "../components/PacketRateBadge";
import { EnvBadge } from "../components/EnvBadge";
import { ActivityFeed } from "../components/ActivityFeed";
import { SignalHeroCard } from "../components/SignalHeroCard";
import { NoteSheet } from "../components/NoteSheet";

export default function SurveyPage({ auth, sensor, onSessionEnd }) {
  const nav = useNavigate();
  const [events,      setEvents]      = useState([]);
  const [lastUplink,  setLastUplink]  = useState(null);
  const [startedAt]                   = useState(() => new Date().toISOString());
  const [elapsed,     setElapsed]     = useState(0);
  const [noteOpen,    setNoteOpen]    = useState(false);

  const { attempted, received, rate, recordAttempt, recordReceived } = usePacketRate();

  useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const { uplinks, error, isOnline } = useUplinkStream({
    devEUI:  sensor?.devEUI,
    token:   auth?.token,
    env:     auth?.env,
    enabled: true,
  });

  const addEvent = ev => setEvents(prev => [ev, ...prev]);

  const { state, checkInAt, remaining, checkIn, resolve, reset } = useCheckIn({
    windowMs: 15000,
    onResult: uplink => {
      recordReceived();
      setLastUplink(uplink);
      addEvent({
        type: "uplink",
        id: `${Date.now()}-r`,
        ...uplink,
      });
    },
    onTimeout: () => {
      addEvent({
        type: "timeout",
        id: `${Date.now()}-t`,
        checkInAt: checkInAt?.toISOString(),
      });
    },
  });

  // Match incoming uplinks to the pending check-in window.
  // Accept uplinks up to LOOKBACK_MS before checkInAt to handle the common
  // field pattern of triggering the sensor just before tapping CHECK IN.
  const LOOKBACK_MS = 8000;
  useEffect(() => {
    if (state !== "pending" || !checkInAt) return;
    const windowStart = new Date(checkInAt.getTime() - LOOKBACK_MS);
    const windowEnd   = new Date(checkInAt.getTime() + 15000);
    console.log(`[match] window ${windowStart.toISOString()} -> ${windowEnd.toISOString()} | stream=${uplinks.length}`);
    const candidate = uplinks.find(u => {
      const t = new Date(u.timestamp);
      return t >= windowStart && t <= windowEnd;
    });
    if (candidate) {
      const age = checkInAt.getTime() - new Date(candidate.timestamp).getTime();
      console.log(`[match] CANDIDATE id=${candidate.id} ts=${candidate.timestamp} age=${age > 0 ? "-" + age : "+" + Math.abs(age)}ms`);
      const band = getSignalBand(candidate.rssi, candidate.snr);
      resolve({ ...candidate, band });
    } else if (uplinks.length > 0) {
      console.log(`[match] no candidate — newest=${uplinks[0].timestamp} outside window`);
    }
  }, [uplinks, state, checkInAt, resolve]);

  const handleCheckIn = () => {
    const at = new Date();
    console.log(`[handleCheckIn] tapped at ${at.toISOString()}`);
    recordAttempt();
    addEvent({
      type:      "trigger",
      id:        `${Date.now()}-c`,
      checkInAt: at.toISOString(),
      windowMs:  15000,
    });
    checkIn();
  };

  const handleNote = ({ floor, location, text }) => {
    addEvent({
      type:      "note",
      id:        `${Date.now()}-n`,
      createdAt: new Date().toISOString(),
      floor,
      location,
      text,
    });
    setNoteOpen(false);
  };

  const handleEnd = () => {
    const session = {
      sessionId: (typeof crypto !== "undefined" && crypto.randomUUID)
                   ? crypto.randomUUID()
                   : `${Date.now()}`,
      startedAt,
      env:        auth?.env,
      sensor,
      packetRate: { attempted, received },
      readings: events
        .filter(e => e.type === "uplink")
        .map(e => ({
          timestamp:    e.timestamp,
          rssi:         e.rssi,
          snr:          e.snr,
          band:         e.band,
          latencyMs:    e.latencyMs ?? null,
          gatewayId:    e.gatewayId,
          gatewayCount: e.gatewayCount,
          sf:           e.sf ?? null,
        })),
    };
    onSessionEnd(session);
    nav("/summary");
  };

  const lastBand = lastUplink ? getSignalBand(lastUplink.rssi, lastUplink.snr) : null;
  const isIdle   = !lastUplink;

  const fmt = s =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">

      {/* Zone A — status bar */}
      <div className="flex-none flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs gap-2">
        <EnvBadge env={auth?.env} />
        <span className="text-slate-500 font-mono">{fmt(elapsed)}</span>
        <PacketRateBadge attempted={attempted} received={received} rate={rate} />
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? "bg-green-500" : "bg-red-500"}`}
          title={isOnline ? "Online" : "Offline"}
        />
        <button
          onClick={handleEnd}
          className="text-slate-500 hover:text-white font-semibold px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Zone B — hero card */}
      <div className="flex-none p-4">
        <SignalHeroCard
          band={lastBand}
          rssi={lastUplink?.rssi}
          snr={lastUplink?.snr}
          sf={lastUplink?.sf}
          gatewayCount={lastUplink?.gatewayCount}
          latencyMs={lastUplink?.latencyMs}
          isIdle={isIdle}
        />
        {error && (
          <div className="mt-2 text-red-400 text-xs bg-red-950 px-3 py-1.5 rounded-lg text-center">
            {error}
          </div>
        )}
        {state === "resolved" && (
          <button
            onClick={() => setNoteOpen(true)}
            className="mt-2 w-full text-center text-slate-400 text-sm hover:text-slate-200 transition-colors py-1"
          >
            📝 Add note
          </button>
        )}
      </div>

      {/* Zone C — activity feed */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center text-slate-600 text-sm mt-10 px-6">
            Trigger the sensor, then tap CHECK IN
          </div>
        ) : (
          <ActivityFeed events={events} />
        )}
      </div>

      {/* Zone D — action bar */}
      <div
        className="flex-none bg-slate-950 border-t border-slate-800 pt-4 pb-8 flex items-center justify-center gap-6"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col items-center gap-2">
          <CheckInButton
            state={state}
            remaining={remaining}
            windowMs={15000}
            onPress={handleCheckIn}
          />
          {(state === "resolved" || state === "expired") && (
            <button
              onClick={reset}
              className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
            >
              Reset for next point
            </button>
          )}
        </div>
        <button
          onClick={() => setNoteOpen(true)}
          className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xl flex items-center justify-center"
          title="Add note"
        >
          📝
        </button>
      </div>

      <NoteSheet open={noteOpen} onSave={handleNote} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
