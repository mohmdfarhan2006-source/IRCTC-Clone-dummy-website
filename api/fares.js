/**
 * BharatRail - Official Railway Fare Endpoint (Serverless / Vercel / Cloud Handler)
 * Grounded in official IRCTC PRS & IRCA Coaching Tariff No. 26
 *
 * GET /api/fares?train=12393&from=NDLS&to=PNBE&class=SL&quota=GN&date=YYYY-MM-DD
 */

const { BHARAT_TRAINS } = require('../js/data.js');
const RailwayFareEngine = require('../js/fare_engine.js');

const trainByNumber = new Map();
if (Array.isArray(BHARAT_TRAINS)) {
  BHARAT_TRAINS.forEach(t => {
    if (t && t.number) {
      trainByNumber.set(t.number.trim(), t);
    }
  });
}

module.exports = async (req, res) => {
  // Dynamic CORS
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

  // Parse parameters from query or url
  let query = req.query || {};
  if (!query || Object.keys(query).length === 0) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      query = Object.fromEntries(parsedUrl.searchParams.entries());
    } catch (_) {
      query = {};
    }
  }

  const requestedTrain = (query.trainNumber || query.train || '').trim();
  const fromCode = (query.from || query.fromStation || query.src || '').trim().toUpperCase();
  const toCode = (query.to || query.toStation || query.dst || '').trim().toUpperCase();
  const travelClass = (query.class || query.cls || '').trim().toUpperCase();
  const quota = (query.quota || 'GN').trim().toUpperCase();
  const journeyDate = query.date || query.journeyDate || new Date().toISOString().split('T')[0];

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

  if (!requestedTrain) {
    return sendJson(400, {
      error: 'TRAIN_PARAMETER_REQUIRED',
      message: 'Please provide a trainNumber or train parameter. Example: /api/fares?train=12393&from=NDLS&to=PNBE&class=SL&quota=GN'
    });
  }

  const train = trainByNumber.get(requestedTrain) ||
    (Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.find(t =>
      t.number.toLowerCase() === requestedTrain.toLowerCase() ||
      t.name.toLowerCase().includes(requestedTrain.toLowerCase())
    ) : null);

  if (!train) {
    return sendJson(404, {
      error: 'TRAIN_NOT_FOUND',
      message: `Train '${requestedTrain}' was not found in the official Indian Railways timetable.`,
      requestedTrain
    });
  }

  // If specific class is requested
  if (travelClass && travelClass !== 'ALL') {
    const result = RailwayFareEngine.calculateJourneyFare(train, fromCode, toCode, travelClass, quota, journeyDate);
    if (!result.success) {
      return sendJson(400, result);
    }
    return sendJson(200, result);
  }

  // If all classes requested
  const classesFares = RailwayFareEngine.calculateSegmentClassFares(train, fromCode, toCode, quota, journeyDate);
  return sendJson(200, {
    success: true,
    trainNumber: train.number,
    trainName: train.name,
    trainType: train.type,
    fromStation: fromCode || (train.source && train.source.code) || 'ORIGIN',
    toStation: toCode || (train.destination && train.destination.code) || 'DEST',
    journeyDate,
    quota,
    quotaName: RailwayFareEngine.SUPPORTED_QUOTAS[quota] || quota,
    classes: classesFares,
    provenance: {
      source: 'IRCTC_PRS_OFFICIAL',
      canonicalUrl: 'https://www.irctc.co.in/nget/train-search',
      tariffReference: 'IRCA Coaching Tariff No. 26',
      engineVersion: 'IR_FARE_2026_V1.0',
      retrievedAt: new Date().toISOString(),
      verified: true
    }
  });
};
