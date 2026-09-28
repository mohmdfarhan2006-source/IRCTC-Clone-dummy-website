const { BHARAT_TRAINS } = require('../js/data.js');
const NTESLiveStatusProvider = require('../js/live_status_provider.js');

const trainByNumber = new Map();
if (Array.isArray(BHARAT_TRAINS)) {
  BHARAT_TRAINS.forEach(t => {
    if (t && t.number) {
      trainByNumber.set(t.number.trim(), t);
    }
  });
}

module.exports = async (req, res) => {
  // Global CORS
  const origin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    if (typeof res.writeHead === 'function') {
      res.writeHead(204);
      return res.end();
    }
    return res.end();
  }

  // Parse query parameters
  const query = req.query || {};
  const requestedTrainNumber = (query.train || '').trim();
  const journeyDate = query.date || NTESLiveStatusProvider.getTodayISTDateString();

  const sendJson = (statusCode, payload) => {
    if (typeof res.status === 'function') {
      const s = res.status(statusCode);
      if (s && typeof s.json === 'function') return s.json(payload);
    }
    if (typeof res.json === 'function') {
      return res.json(payload);
    }
    if (typeof res.writeHead === 'function') {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    return res.end(JSON.stringify(payload, null, 2));
  };

  if (!requestedTrainNumber) {
    return sendJson(400, {
      error: 'TRAIN_NUMBER_REQUIRED',
      message: 'Please provide a valid train number or name query parameter.'
    });
  }

  const train = trainByNumber.get(requestedTrainNumber) ||
    (Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.find(t =>
      t.number.toLowerCase() === requestedTrainNumber.toLowerCase() ||
      t.name.toLowerCase().includes(requestedTrainNumber.toLowerCase())
    ) : null);

  const queryTrain = train || (/^\d{4,5}$/.test(requestedTrainNumber)
    ? { number: requestedTrainNumber, name: `Train ${requestedTrainNumber}` }
    : null);

  if (!queryTrain) {
    return sendJson(404, {
      error: 'TRAIN_NOT_FOUND',
      message: `Train '${requestedTrainNumber}' was not found in the official Indian Railways timetable.`,
      requestedTrainNumber,
      date: journeyDate
    });
  }

  try {
    const liveStatus = await NTESLiveStatusProvider.getLiveStatus(queryTrain, journeyDate);
    res.setHeader('Cache-Control', 'public, max-age=30');
    return sendJson(200, liveStatus);
  } catch (err) {
    return sendJson(500, {
      error: 'LIVE_TELEMETRY_ERROR',
      message: 'An error occurred while fetching real-time telemetry from official NTES.',
      details: err.message
    });
  }
};
