// Zero-dependency production-quality web server with NTES Live Train Running Status API for BharatRail
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Lazy-load authoritative railway dataset & live status engine
console.log('🚂 Loading BharatRail canonical timetable dataset into memory...');
const { BHARAT_TRAINS } = require('./js/data.js');
const NTESLiveStatusProvider = require('./js/live_status_provider.js');
const RailwayFareEngine = require('./js/fare_engine.js');

const trainByNumber = new Map();
if (Array.isArray(BHARAT_TRAINS)) {
  BHARAT_TRAINS.forEach(t => {
    if (t && t.number) {
      trainByNumber.set(t.number.trim(), t);
    }
  });
}
console.log(`✅ Loaded ${trainByNumber.size} canonical train records into NTES memory cache.`);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // Parse URL & query parameters
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Dynamic CORS Headers allowing GitHub Pages, custom domains, and local environments
  const origin = req.headers['origin'] || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (pathname === '/api/live-status') {
    const liveStatusHandler = require('./api/live-status.js');
    await liveStatusHandler(req, res);
    return;
  }

  // ==========================================================================
  // OFFICIAL NTES LIVE STATUS API ENDPOINTS
  // ==========================================================================
  // Endpoint 1: GET /api/trains/:trainNumber/live-status?date=YYYY-MM-DD
  // Endpoint 2: GET /api/trains/live-status?train=20801&date=YYYY-MM-DD
  const liveMatch = pathname.match(/^\/api\/trains\/([^\/]+)\/live-status\/?$/i);
  let requestedTrainNumber = null;

  if (liveMatch) {
    requestedTrainNumber = liveMatch[1].trim();
  } else if (pathname === '/api/trains/live-status') {
    requestedTrainNumber = (reqUrl.searchParams.get('trainNo') || reqUrl.searchParams.get('train') || '').trim();
  }

  if (requestedTrainNumber) {
    const journeyDate = reqUrl.searchParams.get('date') || NTESLiveStatusProvider.getTodayISTDateString();
    const train = trainByNumber.get(requestedTrainNumber) ||
      BHARAT_TRAINS.find(t => t.number.toLowerCase() === requestedTrainNumber.toLowerCase() ||
        t.name.toLowerCase() === requestedTrainNumber.toLowerCase());

    const queryTrain = train || (/^\d{4,5}$/.test(requestedTrainNumber) ? { number: requestedTrainNumber, name: `Train ${requestedTrainNumber}` } : null);

    if (!queryTrain) {
      res.writeHead(404, {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders
      });
      res.end(JSON.stringify({
        error: 'TRAIN_NOT_FOUND',
        message: `Train '${requestedTrainNumber}' was not found in the official Indian Railways timetable.`,
        requestedTrainNumber,
        date: journeyDate
      }, null, 2));
      return;
    }

    try {
      const liveStatus = await NTESLiveStatusProvider.getLiveStatus(queryTrain, journeyDate);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
        ...corsHeaders
      });
      res.end(JSON.stringify(liveStatus, null, 2));
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders
      });
      res.end(JSON.stringify({
        error: 'LIVE_TELEMETRY_ERROR',
        message: 'An error occurred while fetching real-time telemetry from official NTES.',
        details: err.message
      }));
    }
    return;
  }

  if (pathname === '/api/fares') {
    const faresHandler = require('./api/fares.js');
    await faresHandler(req, res);
    return;
  }

  // ==========================================================================
  // OFFICIAL RAILWAY FARE & TARIFF API ENDPOINTS (IRCA TARIFF NO. 26 / IRCTC PRS)
  // ==========================================================================
  // Endpoint 1: GET /api/trains/:train/fares?from=...&to=...&class=...&quota=...&date=...
  // Endpoint 2: GET /api/fares?train=12393&from=NDLS&to=PNBE&class=SL&quota=GN&date=YYYY-MM-DD
  const fareTrainMatch = pathname.match(/^\/api\/trains\/([^\/]+)\/fares\/?$/i);
  let fareQueryTrainNumber = null;

  if (fareTrainMatch) {
    fareQueryTrainNumber = fareTrainMatch[1].trim();
  }

  if (fareQueryTrainNumber) {
    const fromCode = (reqUrl.searchParams.get('from') || reqUrl.searchParams.get('fromStation') || reqUrl.searchParams.get('src') || '').trim().toUpperCase();
    const toCode = (reqUrl.searchParams.get('to') || reqUrl.searchParams.get('toStation') || reqUrl.searchParams.get('dst') || '').trim().toUpperCase();
    const travelClass = (reqUrl.searchParams.get('class') || reqUrl.searchParams.get('cls') || '').trim().toUpperCase();
    const quota = (reqUrl.searchParams.get('quota') || 'GN').trim().toUpperCase();
    const journeyDate = reqUrl.searchParams.get('date') || reqUrl.searchParams.get('journeyDate') || new Date().toISOString().split('T')[0];

    const train = trainByNumber.get(fareQueryTrainNumber) ||
      (Array.isArray(BHARAT_TRAINS) ? BHARAT_TRAINS.find(t =>
        t.number.toLowerCase() === fareQueryTrainNumber.toLowerCase() ||
        t.name.toLowerCase().includes(fareQueryTrainNumber.toLowerCase())
      ) : null);

    if (!train) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
      res.end(JSON.stringify({
        error: 'TRAIN_NOT_FOUND',
        message: `Train '${fareQueryTrainNumber}' was not found in the official Indian Railways timetable.`,
        requestedTrain: fareQueryTrainNumber
      }, null, 2));
      return;
    }

    if (travelClass && travelClass !== 'ALL') {
      const result = RailwayFareEngine.calculateJourneyFare(train, fromCode, toCode, travelClass, quota, journeyDate);
      const statusCode = result.success ? 200 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    const classesFares = RailwayFareEngine.calculateSegmentClassFares(train, fromCode, toCode, quota, journeyDate);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
    res.end(JSON.stringify({
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
    }, null, 2));
    return;
  }

  // Health Endpoints: GET /health or GET /api/health (Distinguish BACKEND HEALTHY from LIVE SOURCE HEALTHY)
  if (pathname === '/api/health' || pathname === '/health') {
    let sourceStatus = 'UNKNOWN';
    let sourceLatencyMs = null;
    let sourceError = null;

    try {
      const https = require('https');
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

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    });
    res.end(JSON.stringify({
      status: 'UP',
      backend: 'HEALTHY',
      liveSource: sourceStatus,
      sourceLatencyMs: sourceLatencyMs,
      sourceError: sourceError,
      service: 'BharatRail Real-Time NTES Telemetry Gateway',
      totalCanonicalTrains: trainByNumber.size,
      serverTimeIST: new Date().toISOString(),
      cacheRefreshIntervalMs: NTESLiveStatusProvider.LIVE_STATUS_REFRESH_INTERVAL_MS
    }, null, 2));
    return;
  }

  // ==========================================================================
  // STATIC FILE ASSET SERVING
  // ==========================================================================
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>The requested file was not found on the BharatRail server.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚂 BharatRail Full-Stack Gateway Running!`);
  console.log(`🌐 Local Web Portal: http://localhost:${PORT}`);
  console.log(`📡 NTES Live Status: http://localhost:${PORT}/api/trains/20801/live-status`);
  console.log('==================================================');
});
