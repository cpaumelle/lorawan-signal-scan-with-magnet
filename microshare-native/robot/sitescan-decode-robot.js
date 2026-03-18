// SiteScan — Payload Decode Robot
// Trigger recType : io.microshare.openclose.unpacked
// Writes recType  : io.microshare.sitescan.decoded
//
// Field paths confirmed from live Browan Tabs TBDW100 data (2026-03-13):
//   data.meta.iot.device_id   — dash-separated DevEUI  e.g. "58-A0-CB-00-00-10-2A-FC"
//   data.meta.iot.rssi        — best-gateway RSSI (float, dBm)
//   data.meta.iot.snr         — best-gateway SNR  (float, dB)
//   data.meta.iot.sf          — spreading factor  (int)
//   data.meta.iot.time        — ISO timestamp string
//   data.meta.iot.gateways[]  — per-gateway array {id, rssi, snr, sf, channel}
//   data.meta.iot.fcnt_up     — uplink frame counter
//   data.meta.iot.type        — "uplink" | "join" etc.

var lib = require('./libs/helpers');

function main(text, auth) {
    var rec = lib.parseMsg(text);
    var obj = rec.objs[0];
    var data = obj.data;

    // Guard: only process uplinks
    var iot = (data.meta && data.meta.iot) ? data.meta.iot : {};
    if (iot.type !== 'uplink') {
        print('SiteScan Robot: skipping type=' + iot.type);
        return;
    }

    // Normalise DevEUI: "58-A0-CB-00-00-10-2A-FC" → "58A0CB0000102AFC"
    var rawId  = iot.device_id || '';
    var devEui = rawId.split('-').join('').toUpperCase();
    if (!devEui) {
        print('SiteScan Robot: no device_id, skipping');
        return;
    }

    var rssi = iot.rssi != null ? parseFloat(iot.rssi) : null;
    var snr  = iot.snr  != null ? parseFloat(iot.snr)  : null;
    var sf   = iot.sf   != null ? parseInt(iot.sf, 10)  : null;
    var ts   = iot.time || obj.createDate || new Date().toISOString();
    var fcnt = iot.fcnt_up != null ? parseInt(iot.fcnt_up, 10) : null;

    // Effective Signal Power (used for band thresholds)
    var esp = null;
    if (rssi !== null && snr !== null) {
        esp = (snr < 0) ? rssi + snr : rssi;
    }

    // Signal quality band (matches client-side getSignalBand())
    var band = 'NO_SIGNAL';
    if (rssi !== null && snr !== null) {
        if      (snr > 10 && rssi > -95)  band = 'STRONG';
        else if (snr > 3  && rssi > -105) band = 'MEDIUM';
        else if (snr > -5)                band = 'LOW';
    }

    // Best gateway by RSSI
    var gateways     = iot.gateways || [];
    var gatewayCount = gateways.length;
    var gatewayId    = '';
    if (gatewayCount > 0) {
        var bestGw = gateways[0];
        var i;
        for (i = 1; i < gateways.length; i++) {
            if ((gateways[i].rssi || -999) > (bestGw.rssi || -999)) {
                bestGw = gateways[i];
            }
        }
        gatewayId = bestGw.id || '';
    }

    var decoded = {
        devEui:       devEui,
        rssi:         rssi,
        snr:          snr,
        sf:           sf,
        esp:          esp,
        band:         band,
        timestamp:    ts,
        fcntUp:       fcnt,
        gatewayId:    gatewayId,
        gatewayCount: gatewayCount,
        gateways:     gateways,
        sourceId:     obj.id || ''
    };

    var tags = ['sitescan', 'decoded', band.toLowerCase()];
    lib.writeShare(auth, 'io.microshare.sitescan.decoded', decoded, tags);

    print('SiteScan Robot: wrote decoded devEui=' + devEui +
          ' band=' + band + ' rssi=' + rssi + ' snr=' + snr + ' sf=' + sf +
          ' gw=' + gatewayCount);
}
