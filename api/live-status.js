/**
 * BharatRail - NTES Live Train Running Status Serverless Endpoint
 * Tries official NTES first; falls back to canonical timetable from data.js
 *
 * GET /api/live-status?trainNo=20801&date=2026-09-29
 */

const https = require('https');
const { BHARAT_TRAINS } = require('../js/data.js');

// Build fast lookup map
const trainByNumber = new Map();
if (Array.isArray(BHARAT_TRAINS)) {
  BHARAT_TRAINS.forEach(t => {
    if (t && t.number) trainByNumber.set(t.number.trim(), t);
  });
}

// ─── CORS helper ────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, code, payload) {
  if (typeof res.status === 'function') {
    const s = res.status(code);
    if (s && typeof s.json === 'function') return s.json(payload);
  }
  if (typeof res.json === 'function') return res.json(payload);
  if (typeof res.writeHead === 'function') {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  }
  return res.end(JSON.stringify(payload, null, 2));
}

// ─── NTES direct JSON API (3s timeout) ──────────────────────────────────────
function fetchNTES(trainNo, startDay) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'enquiry.indianrail.gov.in',
      path: `/api/TrainRunning/TrainRunningStatus?trainNo=${encodeURIComponent(trainNo)}&startDay=${startDay}`,
      method: 'GET',
      timeout: 3000,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://enquiry.indianrail.gov.in/mntes/',
        'Origin': 'https://enquiry.indianrail.gov.in',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (ntesRes) => {
      let body = '';
      ntesRes.on('data', c => { body += c; });
      ntesRes.on('end', () => {
        if (ntesRes.statusCode >= 200 && ntesRes.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            if (parsed && (parsed.TrainRunningStations || parsed.trainRunningStations)) {
              return resolve(parsed);
            }
          } catch (_) {}
        }
        reject(new Error(`NTES HTTP ${ntesRes.statusCode}`));
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('NTES_TIMEOUT')); });
    req.on('error', err => reject(err));
    req.end();
  });
}

// ─── Build scheduled fallback from data.js ───────────────────────────────────
function buildScheduledFallback(train, dateStr) {
  const stoppages = train.stoppages || [];
  const stations = stoppages.map((stn, i) => ({
    sequence: i + 1,
    name: stn.name || stn.station || `Station ${i + 1}`,
    code: stn.code || '',
    platform: stn.platform || '1',
    distance: stn.distance || 0,
    day: stn.day || 1,
    scheduledArrival: i === 0 ? 'Source' : (stn.arrival || '--:--'),
    scheduledDeparture: i === stoppages.length - 1 ? 'Destination' : (stn.departure || '--:--'),
    actualArrival: '--:--',
    actualDeparture: '--:--',
    arrivalDelay: 0,
    status: 'SCHEDULED',
    isScheduledOnly: true
  }));

  return {
    status: 'SCHEDULED',
    trainNumber: train.number,
    trainName: train.name,
    trainType: train.type || 'EXPRESS',
    startDate: dateStr,
    journeyDate: dateStr,
    delayMinutes: 0,
    aheadMinutes: 0,
    isDelayed: false,
    isAhead: false,
    isOnTime: false,
    isAtStation: false,
    isBetweenStations: false,
    currentStation: null,
    lastReportedStation: null,
    nextStation: null,
    currentLocationDescription: `Live NTES telemetry unavailable. Showing scheduled timetable for ${train.name}.`,
    statusMessage: 'NTES live data is currently unavailable from cloud servers. Scheduled timetable shown below.',
    statusReason: 'NTES_CLOUD_BLOCKED',
    originStation: train.source ? { code: train.source.code, name: train.source.name, departure: train.departure } : null,
    destinationStation: train.destination ? { code: train.destination.code, name: train.destination.name, arrival: train.arrival } : null,
    totalDistanceKm: train.distance || 0,
    distanceCoveredKm: 0,
    progressPercentage: 0,
    source: 'STATIC_TIMETABLE',
    sourceUpdatedAt: null,
    retrievedAt: new Date().toISOString(),
    stations
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.writeHead && res.writeHead(204);
    return res.end();
  }

  // Parse query params
  let query = req.query || {};
  if (!query || Object.keys(query).length === 0) {
    try {
      const u = new URL(req.url, 'http://localhost');
      query = Object.fromEntries(u.searchParams.entries());
    } catch (_) { query = {}; }
  }

  const trainNo = (query.trainNo || query.trainNumber || query.train || '').trim();
  const dateStr = (query.date || query.journeyDate || '').trim() || new Date().toISOString().split('T')[0];

  if (!trainNo) {
    return sendJson(res, 400, {
      status: 'unavailable',
      error: 'TRAIN_PARAMETER_REQUIRED',
      message: 'Provide trainNo parameter. Example: /api/live-status?trainNo=20801&date=2026-09-29'
    });
  }

  const staticTrain = trainByNumber.get(trainNo) ||
    (Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.find(t => t.number.toLowerCase() === trainNo.toLowerCase()) : null);

  // Calculate startDay (0=today, 1=yesterday, 2=day before)
  const todayMidnight = new Date(Date.UTC(...new Date().toISOString().split('T')[0].split('-').map(Number)));
  const reqMidnight = new Date(Date.UTC(...dateStr.split('-').map(Number)));
  const startDay = Math.max(0, Math.min(2, Math.floor((todayMidnight - reqMidnight) / 86400000)));

  // ── Try NTES (3s budget) ───────────────────────────────────────────────────
  try {
    const ntesData = await fetchNTES(trainNo, startDay);
    const stationsRaw = ntesData.TrainRunningStations || ntesData.trainRunningStations || [];

    let currentStationObj = null, delayMinutes = 0, currentStationIndex = -1;

    const normalizedStations = stationsRaw.map((stn, idx) => {
      const isCurrent = !!(stn.IsCurrent || stn.isCurrent);
      const stnDelay = parseInt(stn.DelayInArrival || stn.delayInArrival || 0, 10) || 0;
      const stnPlatform = String(stn.ActualPlatform || stn.actualPlatform || '1');
      const stnName = stn.StationName || stn.stationName || `Station ${idx + 1}`;

      if (isCurrent) {
        currentStationObj = { name: stnName, code: stn.StationCode || '', platform: stnPlatform };
        delayMinutes = stnDelay;
        currentStationIndex = idx;
      }

      return {
        sequence: idx + 1,
        name: stnName,
        code: stn.StationCode || stn.stationCode || '',
        platform: stnPlatform,
        distance: stn.Distance || stn.distance || 0,
        day: stn.Day || 1,
        scheduledArrival: stn.ScheduledArrival || stn.scheduledArrival || '--:--',
        scheduledDeparture: stn.ScheduledDeparture || stn.scheduledDeparture || '--:--',
        actualArrival: stn.ActualArrival || stn.actualArrival || '--:--',
        actualDeparture: stn.ActualDeparture || stn.actualDeparture || '--:--',
        arrivalDelay: stnDelay,
        status: isCurrent ? 'CURRENT' : (currentStationIndex === -1 ? 'PASSED' : 'UPCOMING'),
        isScheduledOnly: false
      };
    });

    const isCompleted = currentStationIndex === normalizedStations.length - 1;
    const runStatus = isCompleted ? 'COMPLETED' : (currentStationIndex >= 0 ? (delayMinutes > 15 ? 'DELAYED' : 'RUNNING') : 'RIGHT_TIME');

    return sendJson(res, 200, {
      status: runStatus,
      trainNumber: trainNo,
      trainName: staticTrain ? staticTrain.name : (ntesData.TrainName || `Train ${trainNo}`),
      trainType: staticTrain ? staticTrain.type : 'EXPRESS',
      startDate: dateStr, journeyDate: dateStr,
      delayMinutes, aheadMinutes: 0,
      isDelayed: delayMinutes > 15, isAhead: false, isOnTime: delayMinutes <= 15,
      isAtStation: currentStationIndex >= 0, isBetweenStations: false,
      currentStation: currentStationObj, lastReportedStation: currentStationObj,
      currentLocationDescription: currentStationObj
        ? `At ${currentStationObj.name} (Pf ${currentStationObj.platform}), ${delayMinutes > 0 ? delayMinutes + ' min late' : 'Right Time'}`
        : 'Running on schedule',
      originStation: staticTrain ? { code: staticTrain.source.code, name: staticTrain.source.name, departure: staticTrain.departure } : null,
      destinationStation: staticTrain ? { code: staticTrain.destination.code, name: staticTrain.destination.name, arrival: staticTrain.arrival } : null,
      totalDistanceKm: staticTrain ? staticTrain.distance : 0,
      distanceCoveredKm: currentStationObj ? (normalizedStations[currentStationIndex]?.distance || 0) : 0,
      progressPercentage: (staticTrain?.distance > 0 && currentStationObj)
        ? Math.min(100, Math.round(((normalizedStations[currentStationIndex]?.distance || 0) / staticTrain.distance) * 100)) : 0,
      source: 'NTES',
      sourceUpdatedAt: new Date().toLocaleTimeString(),
      retrievedAt: new Date().toISOString(),
      stations: normalizedStations
    });

  } catch (_) {
    // NTES failed or timed out → return scheduled timetable from data.js
    if (staticTrain) {
      return sendJson(res, 200, buildScheduledFallback(staticTrain, dateStr));
    }

    // Train not found anywhere
    return sendJson(res, 200, {
      status: 'unavailable',
      error: 'NTES_CLOUD_BLOCKED',
      trainNumber: trainNo,
      message: 'NTES live data unavailable from cloud. Train not found in static dataset either.',
      source: 'NONE',
      stations: []
    });
  }
};
