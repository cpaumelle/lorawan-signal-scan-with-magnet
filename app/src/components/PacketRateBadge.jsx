export function PacketRateBadge({ attempted, received, rate }) {
  if (attempted === 0) return <span className="text-slate-500 text-xs">0 checks</span>;
  const color = rate >= 90 ? 'text-green-400' : rate >= 70 ? 'text-amber-400' : 'text-red-400';
  return (
    <span className={`text-xs font-mono ${color}`}>
      {received}/{attempted} ({rate?.toFixed(0)}%)
    </span>
  );
}
