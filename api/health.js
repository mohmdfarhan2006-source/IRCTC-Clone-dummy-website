const https = require('https');
const { BHARAT_TRAINS } = require('../js/data.js');
const NTESLiveStatusProvider = require('../js/live_status_provider.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    if (typeof res.writeHead === 'function') {
      res.writeHead(204);
      return res.end();
    }
    return res.end();
  }

  let sourceStatus = 'UNKNOWN';
  let sourceLatencyMs = null;
  let sourceError = null;

  try {
    const t0 = Date.now();
    await new Promise((resolve) => {
      const probeReq = https.get('https://enquiry.indianrail.gov.in/mntes/', {
        timeout: 4000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }, (probeRes) => {
        sourceLatencyMs = Date.now() - t0;
        sourceStatus = (probeRes.statusCode >= 200 && probeRes.statusCode < 400) ? 'HEALTHY' : `HTTP_${probeRes.statusCode}`;
        probeRes.resume();
        resolve();
      });
      probeReq.on('timeout', () => {
        probeReq.destroy();
        sourceStatus = 'SOURCE_TIMEOUT';
        sourceError = 'Connection to official NTES gateway timed out (4s)';
        resolve();
      });
      probeReq.on('error', (e) => {
        sourceStatus = 'SOURCE_UNAVAILABLE';
        sourceError = e.message;
        resolve();
      });
    });
  } catch (e) {
    sourceStatus = 'SOURCE_UNAVAILABLE';
    sourceError = e.message;
  }

  const totalTrains = Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.length : 0;
  const payload = {
    status: 'UP',
    backend: 'HEALTHY',
    liveSource: sourceStatus,
    sourceLatencyMs: sourceLatencyMs,
    sourceError: sourceError,
    service: 'BharatRail Real-Time NTES Telemetry Gateway (Serverless)',
    totalCanonicalTrains: totalTrains,
    serverTimeIST: new Date().toISOString(),
    cacheRefreshIntervalMs: NTESLiveStatusProvider.LIVE_STATUS_REFRESH_INTERVAL_MS
  };

  if (typeof res.status === 'function') {
    const s = res.status(200);
    if (s && typeof s.json === 'function') return s.json(payload);
  }
  if (typeof res.json === 'function') {
    return res.json(payload);
  }
  if (typeof res.writeHead === 'function') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  }
  return res.end(JSON.stringify(payload, null, 2));
};
