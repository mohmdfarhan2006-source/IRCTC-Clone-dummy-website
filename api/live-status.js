/**
 * BharatRail - Real NTES Live Train Running Status Serverless Endpoint
 * Queries official NTES API and returns normalized live running status.
 *
 * GET /api/live-status?trainNo=20801&date=2026-09-29
 */

const https = require('https');
const { BHARAT_TRAINS } = require('../js/data.js');
let NTESLiveStatusProvider = null;
try {
  NTESLiveStatusProvider = require('../js/live_status_provider.js');
} catch (_) {}

const trainByNumber = new Map();
if (Array.isArray(BHARAT_TRAINS)) {
  BHARAT_TRAINS.forEach(t => {
    if (t && t.number) {
      trainByNumber.set(t.number.trim(), t);
    }
  });
}

module.exports = async (req, res) => {
  // 5. CORS headers
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

  const trainNo = (query.trainNo || query.trainNumber || query.train || '').trim();
  const dateStr = (query.date || query.journeyDate || '').trim();

  if (!trainNo) {
    return sendJson(400, {
      status: 'unavailable',
      error: 'TRAIN_PARAMETER_REQUIRED',
      message: 'Please provide a trainNo parameter. Example: /api/live-status?trainNo=20801&date=2026-09-29'
    });
  }

  // 3. Calculate startDay as: Math.floor((today - requestedDate) / 86400000)
  const today = new Date();
  const requestedDate = dateStr ? new Date(dateStr) : today;
  let startDay = 0;
  if (!isNaN(requestedDate.getTime())) {
    const todayMidnight = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const reqMidnight = new Date(Date.UTC(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()));
    startDay = Math.max(0, Math.floor((todayMidnight.getTime() - reqMidnight.getTime()) / 86400000));
  }

  const staticTrain = trainByNumber.get(trainNo) ||
    (Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.find(t => t.number.toLowerCase() === trainNo.toLowerCase()) : null);

  // 1. Official NTES API query function
  function fetchFromNTES(trainNum, dayParam) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'enquiry.indianrail.gov.in',
        path: `/api/TrainRunning/TrainRunningStatus?trainNo=${encodeURIComponent(trainNum)}&startDay=${dayParam}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://enquiry.indianrail.gov.in/mntes/',
          'Origin': 'https://enquiry.indianrail.gov.in',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      };

      const ntesReq = https.request(options, (ntesRes) => {
        let body = '';
        ntesRes.on('data', chunk => { body += chunk; });
        ntesRes.on('end', () => {
          if (ntesRes.statusCode >= 200 && ntesRes.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              if (parsed && (parsed.TrainRunningStations || parsed.trainRunningStations)) {
                return resolve(parsed);
              }
            } catch (_) {}
          }
          reject(new Error(`NTES response invalid or non-JSON (HTTP ${ntesRes.statusCode})`));
        });
      });

      ntesReq.on('timeout', () => {
        ntesReq.destroy();
        reject(new Error('NTES request timed out'));
      });
      ntesReq.on('error', (err) => {
        reject(err);
      });
      ntesReq.end();
    });
  }

  try {
    let ntesData = null;
    try {
      ntesData = await fetchFromNTES(trainNo, startDay);
    } catch (e) {
      // If direct API endpoint encounters downtime or needs session cookie,
      // fallback gracefully to NTESLiveStatusProvider session handshake
      if (NTESLiveStatusProvider && typeof NTESLiveStatusProvider.getLiveStatus === 'function') {
        const queryTrain = staticTrain || { number: trainNo, name: `Train ${trainNo}` };
        const providerData = await NTESLiveStatusProvider.getLiveStatus(queryTrain, dateStr || today.toISOString().split('T')[0]);
        if (providerData && providerData.status !== 'UNAVAILABLE' && !providerData.error) {
          return sendJson(200, providerData);
        }
      }
      throw e;
    }

    if (!ntesData) {
      return sendJson(200, { status: 'unavailable', error: 'NTES_UNREACHABLE' });
    }

    // 4. Parse fields from the NTES response:
    // - From TrainRunningStations[]:
    //   - Station where IsCurrent: true -> current train location
    //   - DelayInArrival -> delay in minutes
    //   - ActualPlatform -> platform number
    //   - StationName, ScheduledArrival, ActualArrival -> for timeline display
    const stationsRaw = ntesData.TrainRunningStations || ntesData.trainRunningStations || [];
    let currentStationObj = null;
    let delayMinutes = 0;
    let actualPlatform = '1';
    let currentStationIndex = -1;

    const normalizedStations = stationsRaw.map((stn, idx) => {
      const isCurrent = !!(stn.IsCurrent || stn.isCurrent);
      const stnDelay = parseInt(stn.DelayInArrival || stn.delayInArrival || 0, 10) || 0;
      const stnPlatform = String(stn.ActualPlatform || stn.actualPlatform || stn.Platform || '1');
      const stnName = stn.StationName || stn.stationName || `Station ${idx + 1}`;
      const schedArr = stn.ScheduledArrival || stn.scheduledArrival || '--:--';
      const actualArr = stn.ActualArrival || stn.actualArrival || '--:--';
      const schedDep = stn.ScheduledDeparture || stn.scheduledDeparture || '--:--';
      const actualDep = stn.ActualDeparture || stn.actualDeparture || '--:--';

      if (isCurrent) {
        currentStationObj = {
          name: stnName,
          code: stn.StationCode || stn.stationCode || '',
          platform: stnPlatform
        };
        delayMinutes = stnDelay;
        actualPlatform = stnPlatform;
        currentStationIndex = idx;
      }

      return {
        sequence: idx + 1,
        name: stnName,
        code: stn.StationCode || stn.stationCode || '',
        platform: stnPlatform,
        distance: stn.Distance || stn.distance || 0,
        day: stn.Day || stn.day || 1,
        scheduledArrival: schedArr,
        scheduledDeparture: schedDep,
        actualArrival: actualArr,
        actualDeparture: actualDep,
        arrivalDelay: stnDelay,
        status: isCurrent ? 'CURRENT' : (currentStationIndex === -1 ? 'PASSED' : 'UPCOMING'),
        isScheduledOnly: false
      };
    });

    const journeyDateFormatted = dateStr || today.toISOString().split('T')[0];
    const isCompleted = currentStationIndex === normalizedStations.length - 1;
    const isRunning = currentStationIndex >= 0 && !isCompleted;
    const status = isCompleted ? 'COMPLETED' : (isRunning ? (delayMinutes > 15 ? 'DELAYED' : 'RUNNING') : 'RIGHT_TIME');

    return sendJson(200, {
      status,
      trainNumber: trainNo,
      trainName: staticTrain ? staticTrain.name : (ntesData.TrainName || ntesData.trainName || `Train ${trainNo}`),
      trainType: staticTrain ? staticTrain.type : 'EXPRESS',
      startDate: journeyDateFormatted,
      journeyDate: journeyDateFormatted,
      delayMinutes,
      aheadMinutes: 0,
      isDelayed: delayMinutes > 15,
      isAhead: false,
      isOnTime: delayMinutes <= 15,
      isAtStation: isRunning,
      isBetweenStations: false,
      currentStation: currentStationObj,
      lastReportedStation: currentStationObj,
      currentLocationDescription: currentStationObj
        ? `Currently at ${currentStationObj.name} (Platform ${currentStationObj.platform}), ${delayMinutes > 0 ? delayMinutes + ' min late' : 'Right Time'}`
        : 'Running on schedule',
      originStation: staticTrain ? { code: staticTrain.source.code, name: staticTrain.source.name, departure: staticTrain.departure } : null,
      destinationStation: staticTrain ? { code: staticTrain.destination.code, name: staticTrain.destination.name, arrival: staticTrain.arrival } : null,
      totalDistanceKm: staticTrain ? staticTrain.distance : 0,
      distanceCoveredKm: currentStationObj ? (normalizedStations[currentStationIndex]?.distance || 0) : 0,
      progressPercentage: (staticTrain && staticTrain.distance > 0 && currentStationObj)
        ? Math.min(100, Math.round(((normalizedStations[currentStationIndex]?.distance || 0) / staticTrain.distance) * 100))
        : 0,
      source: 'NTES',
      sourceUpdatedAt: new Date().toLocaleTimeString(),
      retrievedAt: new Date().toISOString(),
      stations: normalizedStations
    });

  } catch (err) {
    // 6. If NTES fails for any reason, return: { status: 'unavailable', error: 'NTES_UNREACHABLE' }
    return sendJson(200, {
      status: 'unavailable',
      error: 'NTES_UNREACHABLE'
    });
  }
};
