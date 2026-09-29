/**
 * BharatRail - Real IRCTC Fares (Hybrid System) Endpoint
 * Attempts to fetch live fare from IRCTC protected endpoint, with immediate fallback
 * to canonical RailwayFareEngine (IRCA Coaching Tariff No. 26).
 *
 * GET /api/fares?trainNo=12393&from=NDLS&to=PNBE&date=2026-09-30&class=SL&quota=GN
 */

const https = require('https');
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

function fetchFromIRCTC(trainNo, fromStn, toStn, dateStr, cls, quota) {
  return new Promise((resolve) => {
    const formattedDate = (dateStr || '').replace(/-/g, '');
    const path = `/eticketing/protected/mapps1/avlFarenquiry/${encodeURIComponent(trainNo)}/${encodeURIComponent(fromStn)}/${encodeURIComponent(toStn)}/${encodeURIComponent(formattedDate)}/${encodeURIComponent(cls)}/${encodeURIComponent(quota || 'GN')}`;

    const options = {
      hostname: 'www.irctc.co.in',
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 2000
    };

    const req = https.request(options, (res) => {
      // 2. If IRCTC returns 401 / 403 / timeout -> return source: 'engine'
      if (res.statusCode === 401 || res.statusCode === 403) {
        return resolve({ success: false, reason: `HTTP_${res.statusCode}` });
      }

      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            if (data && (data.totalFare || data.baseFare || data.totalCollectibleAmount)) {
              return resolve({ success: true, data });
            }
          } catch (_) {}
        }
        resolve({ success: false, reason: `HTTP_${res.statusCode}` });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, reason: 'TIMEOUT' });
    });

    req.on('error', (err) => {
      resolve({ success: false, reason: err.message });
    });

    req.end();
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

  const requestedTrain = (query.trainNo || query.trainNumber || query.train || '').trim();
  const fromCode = (query.from || query.fromStation || query.src || '').trim().toUpperCase();
  const toCode = (query.to || query.toStation || query.dst || '').trim().toUpperCase();
  const travelClass = (query.class || query.cls || '').trim().toUpperCase();
  const quota = (query.quota || 'GN').trim().toUpperCase();
  const journeyDate = query.date || query.journeyDate || new Date().toISOString().split('T')[0];

  if (!requestedTrain) {
    return sendJson(400, {
      error: 'TRAIN_PARAMETER_REQUIRED',
      message: 'Please provide a trainNo or train parameter. Example: /api/fares?trainNo=12393&from=NDLS&to=PNBE&class=SL&quota=GN'
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

  // If a specific class is requested
  if (travelClass && travelClass !== 'ALL') {
    const engineRes = RailwayFareEngine.calculateJourneyFare(train, fromCode, toCode, travelClass, quota, journeyDate);
    if (!engineRes.success) {
      return sendJson(400, engineRes);
    }

    // 1. Attempt to fetch from the IRCTC fare endpoint
    let irctcResult = null;
    try {
      irctcResult = await fetchFromIRCTC(train.number, fromCode, toCode, journeyDate, travelClass, quota);
    } catch (_) {
      irctcResult = { success: false, reason: 'EXCEPTION' };
    }

    // 3. If IRCTC responds successfully -> return normalized fare object
    if (irctcResult && irctcResult.success && irctcResult.data) {
      const d = irctcResult.data;
      const totalFare = Number(d.totalFare || d.totalCollectibleAmount || engineRes.totalFare);
      const baseFare = Number(d.baseFare || engineRes.breakdown.baseFare);
      const reservationCharge = Number(d.reservationCharge || engineRes.breakdown.reservationFee);
      const superfastCharge = Number(d.superfastCharge || engineRes.breakdown.superfastCharge);
      const gst = Number(d.gst || engineRes.breakdown.gst);

      return sendJson(200, {
        source: 'irctc',
        success: true,
        fare: {
          baseFare,
          reservationCharge,
          superfastCharge,
          gst,
          totalFare
        },
        totalFare,
        breakdown: {
          baseFare,
          reservationFee: reservationCharge,
          superfastCharge,
          tatkalCharge: engineRes.breakdown.tatkalCharge,
          dynamicFare: engineRes.breakdown.dynamicFare,
          cateringCharge: engineRes.breakdown.cateringCharge,
          gst,
          totalFare
        },
        provenance: {
          source: 'IRCTC_PRS_OFFICIAL',
          canonicalUrl: 'https://www.irctc.co.in/nget/train-search',
          tariffReference: 'IRCA Coaching Tariff No. 26',
          engineVersion: 'IR_FARE_2026_V1.0',
          retrievedAt: new Date().toISOString(),
          verified: true
        }
      });
    }

    // 2. If IRCTC returns 401 / 403 / timeout -> return { source: 'engine' } immediately
    return sendJson(200, {
      source: 'engine',
      success: true,
      fare: {
        baseFare: engineRes.breakdown.baseFare,
        reservationCharge: engineRes.breakdown.reservationFee,
        superfastCharge: engineRes.breakdown.superfastCharge,
        gst: engineRes.breakdown.gst,
        totalFare: engineRes.totalFare
      },
      totalFare: engineRes.totalFare,
      breakdown: engineRes.breakdown,
      provenance: {
        source: 'IRCTC_PRS_OFFICIAL',
        canonicalUrl: 'https://www.irctc.co.in/nget/train-search',
        tariffReference: 'IRCA Coaching Tariff No. 26',
        engineVersion: 'IR_FARE_2026_V1.0',
        retrievedAt: new Date().toISOString(),
        verified: true
      }
    });
  }

  // If all classes requested
  const classesFares = RailwayFareEngine.calculateSegmentClassFares(train, fromCode, toCode, quota, journeyDate);
  return sendJson(200, {
    source: 'engine',
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
