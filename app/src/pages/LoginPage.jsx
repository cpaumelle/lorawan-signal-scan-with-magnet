import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/microshareApi";

const DEFAULT_CLIENT_ID = "2761E567-69D7-46A7-8D1F-524780731EA2";

function SignalTowerIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-6 mx-auto">
      {/* Tower mast */}
      <rect x="22" y="26" width="4" height="14" rx="1" fill="#475569" />
      {/* Base platform */}
      <rect x="16" y="38" width="16" height="3" rx="1.5" fill="#334155" />
      {/* Signal arcs */}
      <path d="M12 20 Q24 8 36 20" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M15.5 23 Q24 13.5 32.5 23" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M19 26 Q24 19 29 26" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Center dot */}
      <circle cx="24" cy="27" r="2.5" fill="#60a5fa" />
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode,        setMode]        = useState(() => localStorage.getItem("ms-login-mode") || "oauth");
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [clientId,    setClientId]    = useState(DEFAULT_CLIENT_ID);
  const [manualToken, setManualToken] = useState("");
  const [tagPath,     setTagPath]     = useState(() => localStorage.getItem("ms-tag-path") || "tags/CBRE/occupancytesting/people");
  const [env,         setEnv]         = useState(() => localStorage.getItem("ms-env") || "prod");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [showAdv,     setShowAdv]     = useState(false);
  const nav = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let token;
      if (mode === "token") {
        token = manualToken.replace(/^Bearer\s+/i, "").trim();
        if (!token) throw new Error("Please paste a Bearer token");
      } else {
        const result = await login(username, password, env);
        if (!result.access_token) throw new Error(result.error_description || "No token received");
        token = result.access_token;
      }
      localStorage.setItem("ms-env", env);
      localStorage.setItem("ms-login-mode", mode);
      localStorage.setItem("ms-tag-path", tagPath);
      onLogin({ token, env, tagPath });
      nav("/sensor");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-800 text-white rounded-xl px-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <SignalTowerIcon />

        <h1 className="text-3xl font-bold text-white mb-1 text-center">SiteScan</h1>
        <p className="text-slate-400 text-sm text-center mb-8">LoRaWAN Signal Survey Tool</p>

        {/* Environment selector */}
        <div className="flex gap-2 mb-4">
          {["prod", "dev"].map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEnv(e)}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                env === e
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {e.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-5">
          {[["oauth", "OAuth2 Login"], ["token", "Paste Token"]].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-colors ${
                mode === m
                  ? "bg-slate-600 text-white"
                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "oauth" ? (
            <>
              <input
                className={inputCls}
                type="email"
                placeholder="Email"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <div className="relative">
                <input
                  className={inputCls + " pr-12"}
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm px-1"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                className={inputCls + " text-xs font-mono h-24 resize-none"}
                placeholder={"Paste Bearer token from browser DevTools\n(Network tab → any /share/ request → Authorization header)"}
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                required
              />
              <p className="text-slate-500 text-xs">
                Get token: app.microshare.io → DevTools → Network → copy Authorization header value
              </p>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowAdv(v => !v)}
            className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
          >
            {showAdv ? "▲ Hide" : "▼ Advanced options"}
          </button>

          {showAdv && (
            <div className="space-y-2 pt-1">
              {mode === "oauth" && (
                <input
                  className={inputCls + " text-sm"}
                  placeholder="Client ID"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                />
              )}
              <input
                className={inputCls + " text-sm"}
                placeholder="Tag path (e.g. tags/CBRE/occupancytesting/people)"
                value={tagPath}
                onChange={e => setTagPath(e.target.value)}
              />
              <p className="text-slate-600 text-xs">Leave tag path empty to query without tags</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? "Connecting…" : "Connect →"}
          </button>
        </form>
      </div>
    </div>
  );
}
