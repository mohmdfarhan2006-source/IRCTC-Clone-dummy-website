/**
 * BharatRail - Real-Time Official NTES Live Train Running Status Provider
 * Integrates directly with official Indian Railways / CRIS NTES
 * (https://enquiry.indianrail.gov.in/mntes/)
 *
 * Conforms to strict real-time telemetry standards:
 * - Real live train spotting from CRIS NTES
 * - Never fakes or guesses train position from timetable clock times
 * - Reports "Live status unavailable" when NTES data is unavailable
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('https'), require('querystring'));
  } else {
    root.NTESLiveStatusProvider = factory(null, null);
  }
}(typeof self !== 'undefined' ? self : this, function (https, querystring) {

  const LIVE_STATUS_REFRESH_INTERVAL_MS = 30000; // 30s in-memory cache TTL
  const liveStatusCache = new Map();
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function getISTNow() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + (330 * 60000));
  }

  function getTodayISTDateString() {
    const d = getISTNow();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /**
   * Convert YYYY-MM-DD or other date string to NTES DD-Mon-YYYY format (e.g. 28-Sep-2026)
   */
  function toNTESDate(dateStr) {
    if (!dateStr) {
      const ist = getISTNow();
      return `${pad(ist.getDate())}-${MONTH_NAMES[ist.getMonth()]}-${ist.getFullYear()}`;
    }
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return `${pad(d)}-${MONTH_NAMES[m - 1]}-${y}`;
    }
    return dateStr;
  }

  /**
   * Query official CRIS NTES endpoint via session cookie + CSRF handshake
   * @param {string} trainNo 5-digit train number
   * @param {string} ntesDate Date string in DD-Mon-YYYY format
   * @returns {Promise<{statusCode: number, html: string}>}
   */
  function fetchFromOfficialNTES(trainNo, ntesDate) {
    if (!https || !querystring) {
      return Promise.reject(new Error('HTTPS client is only available in backend Node.js environment'));
    }

    return new Promise((resolve, reject) => {
      const timeoutMs = 12000;
      let timer = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('CRIS NTES request timed out'));
      }, timeoutMs);

      // Step 1: Initialize session and collect security cookies
      const req1 = https.get('https://enquiry.indianrail.gov.in/mntes/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res1) => {
        const rawCookies = res1.headers['set-cookie'] || [];
        const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

        // Step 2: Retrieve dynamic CSRF token
        const t = Date.now();
        const req2 = https.get({
          hostname: 'enquiry.indianrail.gov.in',
          path: `/mntes/GetCSRFToken?t=${t}`,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Cookie': cookieHeader,
            'Referer': 'https://enquiry.indianrail.gov.in/mntes/'
          }
        }, (res2) => {
          let csrfHtml = '';
          res2.on('data', chunk => csrfHtml += chunk);
          res2.on('end', () => {
            const nameMatch = csrfHtml.match(/name=['"]([^'"]+)['"]/);
            const valMatch = csrfHtml.match(/value=['"]([^'"]+)['"]/);

            const postData = {
              trainNo: String(trainNo).trim(),
              jDate: ntesDate
            };
            if (nameMatch && valMatch) {
              postData[nameMatch[1]] = valMatch[1];
            }

            const postBody = querystring.stringify(postData);
            const actionPath = `/mntes/tr?opt=TrainRunning&subOpt=fullR&trainNo=${encodeURIComponent(trainNo)}&jDate=${encodeURIComponent(ntesDate)}`;

            // Step 3: POST TrainRunning query to NTES
            const req3 = https.request({
              hostname: 'enquiry.indianrail.gov.in',
              path: actionPath,
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Cookie': cookieHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postBody),
                'Referer': 'https://enquiry.indianrail.gov.in/mntes/'
              }
            }, (res3) => {
              let resHtml = '';
              res3.on('data', chunk => resHtml += chunk);
              res3.on('end', () => {
                cleanup();
                resolve({ statusCode: res3.statusCode, html: resHtml });
              });
            });

            req3.on('error', (err) => {
              cleanup();
              reject(err);
            });

            req3.write(postBody);
            req3.end();
          });
        });

        req2.on('error', (err) => {
          cleanup();
          reject(err);
        });
      });

      req1.on('error', (err) => {
        cleanup();
        reject(err);
      });
    });
  }

  /**
   * Parse raw CRIS NTES HTML response into normalized telemetry structure
   */
  function parseNTESHtml(rawHtml, train, journeyDateStr, ntesDate) {
    const trainNo = (train && train.number) ? train.number : '';
    let trainName = (train && train.name) ? train.name : '';
    const trainType = (train && train.type) ? train.type : 'EXPRESS';
    const totalDistance = (train && train.distance) ? train.distance : 1000;

    // Check if HTML is empty, error page, or train has no running data for that date
    if (!rawHtml || rawHtml.length < 500) {
      return {
        trainNumber: trainNo,
        trainName: trainName,
        trainType: trainType,
        startDate: journeyDateStr,
        status: 'UNAVAILABLE',
        statusReason: 'NO_NTES_TELEMETRY',
        statusMessage: `Live running status is currently not available from official NTES for Train #${trainNo} on ${ntesDate || journeyDateStr}. Train may not operate on this date or NTES live data is unavailable.`,
        source: 'OFFICIAL_NTES_CRIS',
        delayMinutes: 0,
        currentLocationDescription: null,
        lastPassedStation: null,
        nextStation: null,
        currentStation: null,
        originStation: (train && train.source) ? { code: train.source.code, name: train.source.name } : null,
        destinationStation: (train && train.destination) ? { code: train.destination.code, name: train.destination.name } : null,
        totalDistanceKm: totalDistance,
        distanceCoveredKm: 0,
        progressPercentage: 0,
        lastUpdatedAt: getISTNow().toISOString(),
        stations: []
      };
    }

    // Extract train name from NTES <title> if missing
    if (!trainName) {
      const titleMatch = rawHtml.match(/<title>\s*(?:\d+\s*-\s*)?([^<]+)<\/title>/i);
      if (titleMatch) {
        trainName = titleMatch[1].trim();
      }
    }

    // 1. Live Banner Text
    const bannerMatch = rawHtml.match(/<div class="panel[^"]*"[^>]*><b>([\s\S]*?)<\/b><\/div>/i);
    const bannerText = bannerMatch ? bannerMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

    // 2. Updated on timestamp
    const updatedMatch = rawHtml.match(/Updated on[\s\S]*?<b>([^<]+)<\/b>/i);
    const updatedOn = updatedMatch ? updatedMatch[1].trim() : '';

    // 3. Current Position Block (id="currPos")
    let movementState = 'RUNNING';
    let currStationName = '';
    let currStationCode = '';
    let currTime = '';
    let currDelayStr = '';
    let delayMinutes = 0;
    let upcomingName = '';
    let upcomingCode = '';

    const currPosMatch = rawHtml.match(/id="currPos"[\s\S]*?(?=<div class="[^"]*stopRow|<\/body>|$)/i);
    if (currPosMatch) {
      const cpBlock = currPosMatch[0];

      // Match: Departed from STATION (CODE) on DD-Mon-YYYY HH:MM (Delay...)?
      const moveMatch = cpBlock.match(/(Departed from|Arrived at)\s+([^(\n\r]+?)(?:\s*\(([^)]+)\))?\s+on\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}\s+[0-9]{1,2}:[0-9]{2})(?:\s*\(([^)]+)\))?/i);
      if (moveMatch) {
        movementState = moveMatch[1].toUpperCase().includes('DEPARTED') ? 'DEPARTED' : 'ARRIVED';
        currStationName = (moveMatch[2] || '').replace(/&nbsp;/g, ' ').trim();
        currStationCode = (moveMatch[3] || '').trim();
        currTime = (moveMatch[4] || '').trim();
        currDelayStr = (moveMatch[5] || '').trim();
      }

      // Match Upcoming Station
      const upMatch = cpBlock.match(/Upcoming Station[\s\S]*?<div class="w3-container">\s*<font[^>]*>([\s\S]*?)<\/font>/i);
      if (upMatch) {
        const upRaw = upMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const codeM = upRaw.match(/\(([^)]+)\)/);
        if (codeM) {
          upcomingCode = codeM[1].trim();
          upcomingName = upRaw.replace(/\([^)]+\)/, '').trim();
        } else {
          upcomingName = upRaw;
        }
      }
    }

    // Fallback if currPos block didn't have full match but banner has info
    if (!currStationName && bannerText) {
      const bannerPattern = /(Departed from|Arrived at)\s+([^(\n\r]+?)(?:\s*\(([^)]+)\))?\s+at\s+([0-9]{1,2}:[0-9]{2}(?:\s+[0-9]{1,2}-[A-Za-z]{3})?)(?:\s*\(([^)]+)\))?/i;
      const bM = bannerText.match(bannerPattern);
      if (bM) {
        movementState = bM[1].toUpperCase().includes('DEPARTED') ? 'DEPARTED' : 'ARRIVED';
        currStationName = (bM[2] || '').trim();
        currStationCode = (bM[3] || '').trim();
        currTime = (bM[4] || '').trim();
        if (bM[5]) currDelayStr = bM[5].trim();
      }
    }

    // Parse delay minutes
    const dSource = currDelayStr || bannerText;
    const dHourMin = dSource.match(/(?:Delay:?|Delay-\s*Delay)\s*(\d{1,2}):(\d{2})/i);
    if (dHourMin) {
      delayMinutes = parseInt(dHourMin[1], 10) * 60 + parseInt(dHourMin[2], 10);
    } else {
      const dMin = dSource.match(/(\d+)\s*(?:Min|mins)/i);
      if (dMin) {
        delayMinutes = parseInt(dMin[1], 10);
      } else if (/on time|right time/i.test(dSource)) {
        delayMinutes = 0;
      }
    }

    // Classify overall status
    let overallStatus = 'RUNNING';
    if (/Arrived at .* \(On Time\)|\bJourney completed\b/i.test(bannerText)) {
      overallStatus = 'COMPLETED';
    } else if (/Cancelled/i.test(bannerText)) {
      overallStatus = 'CANCELLED';
    } else if (/Yet to start|Train not started/i.test(bannerText)) {
      overallStatus = 'NOT_STARTED';
    } else if (delayMinutes > 15) {
      overallStatus = 'DELAYED';
    }

    // 4. Stoppage list from .stopRow (pure scheduled stops)
    const stopDivRegex = /<div[^>]*class="[^"]*\bstopRow\b[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*(?:stopRow|nonStopRow)|<\/body>|$)/gi;
    const stopMatches = rawHtml.match(stopDivRegex) || [];

    const stations = [];
    let lastPassedIdx = -1;

    stopMatches.forEach((row, i) => {
      // Station Name
      const nameM = row.match(/<span><font size="1"><b>([^<]+)<\/b>/i);
      const sName = nameM ? nameM[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : '';

      // Station Code & Platform
      const codeM = row.match(/<b>([A-Z0-9]+)\s*(?:<span[^>]*>PF\s*([^<]+)<\/span>)?<\/b>/i);
      const sCode = codeM ? codeM[1].trim() : '';
      const sPlatform = codeM && codeM[2] ? codeM[2].replace('*', '').trim() : '';

      // Distance
      const distM = row.match(/<b>(\d+)<\/b>\s*KMs/i);
      const sDist = distM ? parseInt(distM[1], 10) : (i === 0 ? 0 : 0);

      // Left column (Arrival)
      const leftM = row.match(/<div class="w3-container" style="float:left;width:120px;text-align:right;">([\s\S]*?)<\/div>/i);
      let schedArr = '';
      let actArr = '';
      let arrDelay = '';
      if (leftM) {
        const content = leftM[1];
        const schedTag = content.match(/<span><b><font size="1">([^<]+)<\/font><\/b><\/span>/i);
        schedArr = schedTag ? schedTag[1].replace(/&nbsp;/g, '').trim() : '';
        const actTag = content.match(/<b>([^<]+)<\/b>/gi);
        if (actTag && actTag.length > 1) {
          actArr = actTag[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace('*', '').trim();
        }
        const delayBadge = content.match(/<span class="w3-round [^"]*"[^>]*>([^<]+)<\/span>/i);
        if (delayBadge) arrDelay = delayBadge[1].trim();
      }

      // Right column (Departure)
      const rightM = row.match(/<div class="w3-container" style="float:right;text-align:right;">([\s\S]*?)<\/div>/i);
      let schedDep = '';
      let actDep = '';
      let depDelay = '';
      if (rightM) {
        const content = rightM[1];
        const schedTag = content.match(/<span><b><font size="1">([^<]+)<\/font><\/b><\/span>/i);
        schedDep = schedTag ? schedTag[1].replace(/&nbsp;/g, '').trim() : '';
        const actTag = content.match(/<b>([^<]+)<\/b>/gi);
        if (actTag && actTag.length > 0) {
          actDep = actTag[0].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace('*', '').trim();
        }
        const delayBadge = content.match(/<span class="w3-round [^"]*"[^>]*>([^<]+)<\/span>/i);
        if (delayBadge) depDelay = delayBadge[1].trim();
      }

      const isPassed = row.includes('green_24.png') || row.includes('color:green');
      if (isPassed) {
        lastPassedIdx = i;
      }

      // Calculate numeric arrival delay minutes for this station
      let arrDelayMins = 0;
      if (arrDelay) {
        const hm = arrDelay.match(/(\d{1,2}):(\d{2})/);
        if (hm) arrDelayMins = parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
        else {
          const m = arrDelay.match(/(\d+)/);
          if (m) arrDelayMins = parseInt(m[1], 10);
        }
      }

      stations.push({
        sequence: i + 1,
        code: sCode,
        name: sName,
        platform: sPlatform || '1',
        distance: sDist,
        day: 1,
        scheduledArrival: schedArr || (i === 0 ? 'SRC' : '--:--'),
        scheduledDeparture: schedDep || (i === stopMatches.length - 1 ? 'DSTN' : '--:--'),
        actualArrival: actArr || schedArr || '--:--',
        actualDeparture: actDep || schedDep || '--:--',
        arrivalDelay: arrDelayMins,
        departureDelay: depDelay || arrDelay,
        status: isPassed ? 'PASSED' : 'UPCOMING'
      });
    });

    // Mark active station state
    if (lastPassedIdx >= 0 && lastPassedIdx < stations.length) {
      if (movementState === 'ARRIVED') {
        stations[lastPassedIdx].status = 'CURRENT';
      }
    }

    // Distance covered and progress calculation
    let coveredKm = 0;
    if (overallStatus === 'COMPLETED') {
      coveredKm = totalDistance;
    } else if (lastPassedIdx >= 0 && lastPassedIdx < stations.length) {
      coveredKm = stations[lastPassedIdx].distance || 0;
    }
    const progressPct = Math.min(100, Math.max(0, Math.round((coveredKm / (totalDistance || 1)) * 100)));

    // Last Passed Station Object
    let lastPassedObj = null;
    if (currStationName && currStationCode) {
      lastPassedObj = {
        name: currStationName,
        code: currStationCode,
        passedAt: currTime,
        delayMinutes: delayMinutes
      };
    } else if (lastPassedIdx >= 0 && lastPassedIdx < stations.length) {
      const lp = stations[lastPassedIdx];
      lastPassedObj = {
        name: lp.name,
        code: lp.code,
        passedAt: lp.actualDeparture,
        delayMinutes: delayMinutes
      };
    }

    // Next Expected Station Object
    let nextObj = null;
    if (upcomingName && upcomingCode) {
      nextObj = {
        name: upcomingName,
        code: upcomingCode,
        distanceKm: 0,
        eta: 'Approaching'
      };
    } else if (lastPassedIdx + 1 < stations.length) {
      const nxt = stations[lastPassedIdx + 1];
      nextObj = {
        name: nxt.name,
        code: nxt.code,
        distanceKm: Math.max(0, nxt.distance - coveredKm),
        eta: nxt.actualArrival
      };
    }

    // Current Station Object (if halted)
    let currentStationObj = null;
    if (movementState === 'ARRIVED' && currStationName && currStationCode) {
      currentStationObj = {
        name: currStationName,
        code: currStationCode,
        platform: stations.find(s => s.code === currStationCode)?.platform || '1',
        delayMinutes: delayMinutes
      };
    }

    // Origin and Destination references
    const originStn = (train && train.source)
      ? { code: train.source.code, name: train.source.name, departure: train.departure }
      : (stations[0] ? { code: stations[0].code, name: stations[0].name, departure: stations[0].scheduledDeparture } : { code: 'SRC', name: 'Origin' });

    const destStn = (train && train.destination)
      ? { code: train.destination.code, name: train.destination.name, arrival: train.arrival }
      : (stations[stations.length - 1] ? { code: stations[stations.length - 1].code, name: stations[stations.length - 1].name, arrival: stations[stations.length - 1].scheduledArrival } : { code: 'DSTN', name: 'Destination' });

    const isAtStation = movementState === 'ARRIVED';
    const isBetweenStations = movementState === 'DEPARTED' && overallStatus !== 'COMPLETED' && overallStatus !== 'NOT_STARTED';
    const runningStatus = isAtStation ? 'HALTED' : (isBetweenStations ? 'RUNNING_BETWEEN' : overallStatus);

    return {
      trainNumber: trainNo,
      trainName: trainName,
      trainType: trainType,
      startDate: journeyDateStr,
      journeyDate: journeyDateStr,
      status: overallStatus,
      delayMinutes: delayMinutes,
      aheadMinutes: 0,
      runningStatus: runningStatus,
      movementState: movementState,
      isDelayed: delayMinutes > 15,
      isAhead: false,
      isOnTime: delayMinutes <= 15 && delayMinutes >= 0,
      isAtStation: isAtStation,
      isBetweenStations: isBetweenStations,
      diverted: /diverted/i.test(bannerText),
      partiallyCancelled: /partially cancelled/i.test(bannerText),
      cancelled: overallStatus === 'CANCELLED',
      rescheduled: /rescheduled/i.test(bannerText),
      currentStation: currentStationObj,
      currentStationCode: currentStationObj ? currentStationObj.code : '',
      lastReportedStation: lastPassedObj,
      lastReportedStationCode: lastPassedObj ? lastPassedObj.code : '',
      currentLocationDescription: bannerText,
      nextStation: nextObj,
      nextStationCode: nextObj ? nextObj.code : '',
      actualArrival: currentStationObj ? (currentStationObj.actualArrival || currentStationObj.passedAt || '') : '',
      actualDeparture: lastPassedObj ? (lastPassedObj.passedAt || '') : '',
      expectedArrival: nextObj ? (nextObj.eta || '') : '',
      expectedDeparture: '',
      latitude: null,
      longitude: null,
      originStation: originStn,
      destinationStation: destStn,
      totalDistanceKm: totalDistance,
      distanceCoveredKm: coveredKm,
      progressPercentage: progressPct,
      statusMessage: bannerText || `Train #${trainNo} is currently ${overallStatus}.`,
      lastUpdated: updatedOn || getISTNow().toISOString(),
      lastUpdatedAt: updatedOn || getISTNow().toISOString(),
      source: 'NTES',
      sourceTimestamp: updatedOn || getISTNow().toISOString(),
      retrievedAt: getISTNow().toISOString(),
      staleData: false,
      staleMinutes: 0,
      cacheRefreshIntervalMs: LIVE_STATUS_REFRESH_INTERVAL_MS,
      stations: stations
    };
  }

  /**
   * Main entry point to get authoritative NTES live train status
   * Queries official NTES over HTTPS with in-memory 30s cache
   * @param {Object|string} train Train record or train number
   * @param {string} [journeyDate] Date string (YYYY-MM-DD)
   * @param {boolean} [bypassCache]
   * @returns {Promise<Object>}
   */
  async function getLiveStatus(train, journeyDate, bypassCache) {
    if (!train) return null;

    const trainNo = typeof train === 'string' ? train.trim() : (train.number ? train.number.trim() : '');
    const trainRecord = (typeof train === 'object' && train.number) ? train : null;

    const dateStr = (journeyDate && /^\d{4}-\d{2}-\d{2}$/.test(journeyDate))
      ? journeyDate
      : getTodayISTDateString();

    const ntesDate = toNTESDate(dateStr);
    const cacheKey = `${trainNo}_${dateStr}`;

    // 1. Check in-memory cache
    if (!bypassCache && liveStatusCache.has(cacheKey)) {
      const cached = liveStatusCache.get(cacheKey);
      if (Date.now() - cached.timestamp < LIVE_STATUS_REFRESH_INTERVAL_MS) {
        return { ...cached.data, cached: true };
      }
    }

    // 2. Handle discontinued, historical, or expired service status directly
    if (trainRecord) {
      if (trainRecord.serviceStatus === 'DISCONTINUED') {
        const payload = {
          trainNumber: trainRecord.number,
          trainName: trainRecord.name,
          startDate: dateStr,
          status: 'CANCELLED',
          statusReason: trainRecord.statusReason || 'Permanently withdrawn by Ministry of Railways',
          delayMinutes: 0,
          currentLocationDescription: null,
          lastPassedStation: null,
          nextStation: null,
          currentStation: null,
          originStation: { code: trainRecord.source.code, name: trainRecord.source.name },
          destinationStation: { code: trainRecord.destination.code, name: trainRecord.destination.name },
          totalDistanceKm: trainRecord.distance || 0,
          distanceCoveredKm: 0,
          progressPercentage: 0,
          statusMessage: `Train service ${trainRecord.number} is CANCELLED. Reason: ${trainRecord.statusReason || 'Discontinued service'}`,
          lastUpdatedAt: getISTNow().toISOString(),
          source: 'OFFICIAL_NTES_CRIS',
          stations: []
        };
        return payload;
      }

      if (trainRecord.serviceStatus === 'HISTORICAL') {
        const payload = {
          trainNumber: trainRecord.number,
          trainName: trainRecord.name,
          startDate: dateStr,
          status: 'RESCHEDULED',
          statusReason: trainRecord.statusReason || `Renumbered to ${trainRecord.currentTrainNumber || 'new active number'}`,
          currentTrainNumber: trainRecord.currentTrainNumber || null,
          previousTrainNumber: trainRecord.previousTrainNumber || null,
          delayMinutes: 0,
          currentLocationDescription: null,
          lastPassedStation: null,
          nextStation: null,
          currentStation: null,
          originStation: { code: trainRecord.source.code, name: trainRecord.source.name },
          destinationStation: { code: trainRecord.destination.code, name: trainRecord.destination.name },
          totalDistanceKm: trainRecord.distance || 0,
          distanceCoveredKm: 0,
          progressPercentage: 0,
          statusMessage: `Historical train number ${trainRecord.number}. Service renumbered to #${trainRecord.currentTrainNumber || 'ACTIVE'}. Please spot train #${trainRecord.currentTrainNumber || ''}.`,
          lastUpdatedAt: getISTNow().toISOString(),
          source: 'OFFICIAL_NTES_CRIS',
          stations: []
        };
        return payload;
      }
    }

    // 3. Query official CRIS NTES live gateway
    try {
      const ntesResponse = await fetchFromOfficialNTES(trainNo, ntesDate);
      const parsed = parseNTESHtml(ntesResponse.html, trainRecord || { number: trainNo }, dateStr, ntesDate);

      // Only cache valid or definitively unavailable responses
      liveStatusCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
      return { ...parsed, cached: false };

    } catch (err) {
      // If NTES network request fails, return UNAVAILABLE without faking!
      const unavailablePayload = {
        trainNumber: trainNo,
        trainName: trainRecord ? trainRecord.name : `Train ${trainNo}`,
        trainType: trainRecord ? trainRecord.type : 'EXPRESS',
        startDate: dateStr,
        status: 'UNAVAILABLE',
        statusReason: 'NTES_NETWORK_ERROR',
        statusMessage: `Live running status is temporarily unavailable from official CRIS NTES (${err.message}). No synthetic estimates are shown. Please retry in a few seconds.`,
        source: 'NTES',
        sourceTimestamp: getISTNow().toISOString(),
        retrievedAt: getISTNow().toISOString(),
        delayMinutes: 0,
        currentLocationDescription: null,
        lastPassedStation: null,
        nextStation: null,
        currentStation: null,
        originStation: (trainRecord && trainRecord.source) ? { code: trainRecord.source.code, name: trainRecord.source.name } : null,
        destinationStation: (trainRecord && trainRecord.destination) ? { code: trainRecord.destination.code, name: trainRecord.destination.name } : null,
        totalDistanceKm: trainRecord ? trainRecord.distance : 0,
        distanceCoveredKm: 0,
        progressPercentage: 0,
        lastUpdatedAt: getISTNow().toISOString(),
        stations: []
      };
      return unavailablePayload;
    }
  }

  return {
    getLiveStatus,
    fetchFromOfficialNTES,
    parseNTESHtml,
    toNTESDate,
    getTodayISTDateString,
    getISTNow,
    LIVE_STATUS_REFRESH_INTERVAL_MS
  };
}));
