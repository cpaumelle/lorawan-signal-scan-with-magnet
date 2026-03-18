export function EnvBadge({ env }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${env === 'prod' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
      {env?.toUpperCase()}
    </span>
  );
}
