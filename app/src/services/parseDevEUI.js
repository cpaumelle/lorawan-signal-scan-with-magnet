/**
 * Parse a DevEUI from raw QR scan text.
 *
 * Supported formats:
 *   1. LoRa Alliance Device Identification QR:
 *      LW:D0:<JoinEUI>:<DevEUI>[:<ProfileID>...]
 *      e.g. LW:D0:70B3D57ED0000000:A840410000000001:0000
 *
 *   2. Plain DevEUI — 16 hex chars, optionally separated by dashes or colons:
 *      A840410000000001
 *      A8-40-41-00-00-00-00-01
 *      A8:40:41:00:00:00:00:01
 *
 * Returns uppercase dash-separated EUI (A8-40-41-00-00-00-00-01) or null if not recognised.
 */
export function parseDevEUI(raw) {
  if (!raw) return null;
  const text = raw.trim();

  // LoRa Alliance format: LW:D0:<JoinEUI>:<DevEUI>
  if (/^LW:/i.test(text)) {
    const parts = text.split(':');
    // parts[0]=LW, parts[1]=D0, parts[2]=JoinEUI, parts[3]=DevEUI
    if (parts.length >= 4) {
      return normalisedEUI(parts[3]);
    }
    return null;
  }

  // Plain hex — strip separators and validate length
  const hex = text.replace(/[:\-]/g, '');
  if (/^[0-9A-Fa-f]{16}$/.test(hex)) {
    return normalisedEUI(hex);
  }

  return null;
}

function normalisedEUI(raw) {
  const hex = raw.replace(/[:\-]/g, '').toUpperCase();
  if (hex.length !== 16 || !/^[0-9A-F]{16}$/.test(hex)) return null;
  return hex.match(/.{2}/g).join('-');
}
