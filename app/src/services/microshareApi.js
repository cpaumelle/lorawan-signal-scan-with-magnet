/**
 * Microshare API adapter for io.microshare.openclose.unpacked (TBDW100).
 *
 * CONFIRMED field structure from live device data (2026-03-13):
 *
 *   obj.data.meta.iot = {
 *     device_id: "58-A0-CB-00-00-10-2A-FC",   // dash-separated DevEUI
 *     rssi: -40,                                // best-gateway RSSI (float)
 *     snr: 10.0,                               // best-gateway SNR (float)
 *     sf: 7,                                   // spreading factor (int)
 *     time: "2026-03-13T15:17:18.235Z",        // uplink timestamp (ISO)
 *     gateways: [                              // per-gateway detail array
 *       { id: "1000BCC3", rssi: -40, snr: 10.0, sf: 7, channel: 6 }
 *     ],
 *     fcnt_up: 7,
 *     type: "uplink"
 *   }
 *
 *   obj.data.open[0].value   → boolean (door open/closed state)
 *   obj.data.device_health.charge[0].value  → battery %
 *   obj.data.device_health.voltage[0].value → battery V
 *   obj.tags  → ["Wokingham", "Open Shut", "Testing", "Sensor"]
 *
 * CRITICAL: Must use details=true on list queries — without it data is empty.
 *
 * Auth: PLAY_SESSION browser-login replication via proxy (not OAuth2).
 * OAuth2 tokens cannot read records written by robot accounts.
 */

const BASE = '/proxy';

export const RECTYPE_OPENCLOSE = 'io.microshare.openclose.unpacked';

/**
 * Authenticate via PLAY_SESSION method (proxy handles the browser-login dance).
 * Returns {access_token, token_type, expires_in} or throws.
 */
export async function login(username, password, env = 'prod') {
  const resp = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, env }),
  });
  if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

/**
 * Parse a raw Microshare unpacked object into a normalized signal record.
 * Uses confirmed field paths from io.microshare.openclose.unpacked.
 */
function parseUplink(obj) {
  try {
    const iot = obj?.data?.meta?.iot;
    if (!iot || iot.type !== 'uplink') return null;

    const deveui = (iot.device_id || '').toUpperCase();
    if (!deveui) return null;

    const ts = iot.time || obj.createDate || new Date().toISOString();
    const gateways = iot.gateways || [];

    // Microshare already normalises rssi/snr to best gateway
    // but we also expose per-gateway array for diversity display
    const rssi = iot.rssi != null ? parseFloat(iot.rssi) : null;
    const snr  = iot.snr  != null ? parseFloat(iot.snr)  : null;
    const sf   = iot.sf   ?? null;

    // Best gateway id (match by rssi)
    let gwId = '';
    if (gateways.length > 0) {
      const best = gateways.reduce((a, b) =>
        (b.rssi ?? -999) > (a.rssi ?? -999) ? b : a, gateways[0]);
      gwId = best.id || '';
    }

    return {
      id: obj.id,
      devEUI: deveui,
      rssi,
      snr,
      sf,
      timestamp: new Date(ts).toISOString(),
      gatewayId: gwId,
      gatewayCount: gateways.length,
      fcntUp: iot.fcnt_up ?? 0,
      latencyMs: null, // computed by caller when check-in window is known
      gateways,        // full array for advanced display
    };
  } catch {
    return null;
  }
}

/**
 * Poll for recent uplinks for a specific device.
 *
 * @param {string} devEUI - Device EUI (any separator format)
 * @param {string|null} since - ISO timestamp — only return uplinks after this
 * @param {string} token - Bearer token
 * @param {string} env - 'dev' or 'prod'
 * @param {string|null} _tagPath - Unused (kept for API compat; filtering is by device_id)
 * @param {string} recType - RecType (default: io.microshare.openclose.unpacked)
 * @returns {Promise<Array>} Normalized uplink records, newest first
 */
export async function pollUplinks(devEUI, since, token, env = 'prod', _tagPath = null, recType = RECTYPE_OPENCLOSE) {
  const params = new URLSearchParams({ details: 'true' });

  // Normalise DevEUI to dash-separated format for the filter
  const normEUI = devEUI.replace(/[:\s]/g, '-').toUpperCase();
  params.set('filter[data.meta.iot.device_id]', normEUI);

  if (since) params.set('since', since);

  const resp = await fetch(`${BASE}/share/${recType}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-MS-Env': env,
    },
  });

  if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);
  const data = await resp.json();

  const sinceMs = since ? new Date(since).getTime() : 0;

  return (data.objs || [])
    .map(parseUplink)
    .filter(u => u !== null)
    .filter(u => !since || new Date(u.timestamp).getTime() > sinceMs)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Discover recently active devices.
 * Queries the last 100 uplinks, deduplicates by DevEUI.
 *
 * @returns {Promise<Array<{devEUI, lastSeen}>>} sorted by lastSeen desc
 */
export async function discoverDevices(token, env = 'prod', _tagPath = null, recType = RECTYPE_OPENCLOSE) {
  try {
    const params = new URLSearchParams({ details: 'true' });

    const resp = await fetch(`${BASE}/share/${recType}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-MS-Env': env },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    const seen = new Map(); // devEUI → {lastSeen ISO, location}
    for (const obj of data.objs || []) {
      const u = parseUplink(obj);
      if (!u) continue;
      const prev = seen.get(u.devEUI);
      if (!prev || u.timestamp > prev.lastSeen) {
        // Location comes from the tags array (e.g. ["Wokingham","Open Shut","Testing","Sensor"])
        const loc = (obj.tags || []).slice(1).join(' / ') || '';
        seen.set(u.devEUI, { lastSeen: u.timestamp, location: loc });
      }
    }

    return Array.from(seen.entries())
      .map(([devEUI, { lastSeen, location }]) => ({
        devEUI,
        location,
        lastSeen: new Date(lastSeen).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
      }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  } catch {
    return [];
  }
}
