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

  // Common CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
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
    requestedTrainNumber = (reqUrl.searchParams.get('train') || '').trim();
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

  // Health Endpoint: GET /api/health
  if (pathname === '/api/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    });
    res.end(JSON.stringify({
      status: 'UP',
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
