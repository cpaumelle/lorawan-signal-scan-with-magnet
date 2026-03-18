import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const R = 38;
const CIRC = 2 * Math.PI * R;

export function CheckInButton({ state, remaining, windowMs, onPress }) {
  const isPending  = state === "pending";
  const isResolved = state === "resolved";
  const isExpired  = state === "expired";

  const progress = isPending ? remaining / windowMs : 1;
  const dashOffset = CIRC * (1 - progress);

  // Flash effect refs
  const flashRef = useRef(false);
  useEffect(() => { flashRef.current = false; }, [state]);

  const ringColor = isPending  ? "#3b82f6"
                  : isResolved ? "#22c55e"
                  : isExpired  ? "#ef4444"
                  : "#3b82f6";

  const fillColor = isPending  ? "transparent"
                  : isResolved ? "#16a34a"
                  : isExpired  ? "#b91c1c"
                  : "#2563eb";

  const label = isPending  ? `${(remaining / 1000).toFixed(1)}s`
              : isResolved ? "✓"
              : isExpired  ? "✗ Retry"
              : "CHECK IN";

  const labelColor = isPending  ? "#93c5fd"
                   : isResolved ? "#fff"
                   : isExpired  ? "#fca5a5"
                   : "#fff";

  return (
    <motion.button
      onClick={onPress}
      disabled={isPending}
      whileTap={!isPending ? { scale: 0.93 } : {}}
      className="relative select-none outline-none focus:outline-none"
      style={{ width: 96, height: 96 }}
    >
      <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
        {/* Background track */}
        <circle
          cx="48" cy="48" r={R}
          fill={fillColor}
          stroke="#1e293b"
          strokeWidth="6"
        />
        {/* Progress ring */}
        {(isPending || isResolved || isExpired) && (
          <circle
            cx="48" cy="48" r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 48 48)"
            style={{ transition: isPending ? "stroke-dashoffset 0.1s linear" : "none" }}
          />
        )}
        {/* Idle ring */}
        {!isPending && !isResolved && !isExpired && (
          <circle
            cx="48" cy="48" r={R}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            opacity="0.5"
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold text-sm leading-tight text-center px-1"
        style={{ color: labelColor }}
      >
        {label}
      </div>
    </motion.button>
  );
}
