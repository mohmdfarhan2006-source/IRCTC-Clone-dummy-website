const { BHARAT_TRAINS } = require('../js/data.js');
const NTESLiveStatusProvider = require('../js/live_status_provider.js');

module.exports = (req, res) => {
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

  const totalTrains = Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.length : 0;
  const payload = {
    status: 'UP',
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
