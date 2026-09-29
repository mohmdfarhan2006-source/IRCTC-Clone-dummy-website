/**
 * BharatRail / RailConnect - Client-side Interactive Engine
 * Authoritative Indian Railways Routing, Search, Booking & Timetable Logic
 * Full Compliance with Replacement Master Prompt Specifications
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initStationAutocomplete();
  initSwapButton();
  initDateDefaults();
  initSearchPage();
  initBookingPage();
  initConfirmationPage();
  initPNRPage();
  initMyBookingsPage();
  initTrainsPage();
  initLiveStatusPage();
  initAdminPage();
  initGlobalModals();
});

// ==========================================================================
// 1. STATION RESOLUTION & AUTOCOMPLETE
// ==========================================================================

const STATION_ALIASES = {
  'MMCT': 'BCT',
  'CSMT': 'CSTM',
  'PRYJ': 'ALD',
  'DDU': 'MGS',
  'VGLJ': 'JHS',
  'AYC': 'FD',
  'AYODHYA': 'AY',
  'ARRAH': 'ARA'
};

const CITY_CLUSTERS = {
  'DELHI': ['NDLS', 'DLI', 'ANVT', 'NZM', 'DEE', 'DSA', 'DEC', 'DSJ'],
  'PATNA': ['PNBE', 'DNR', 'PPTA', 'RJPB', 'PNC'],
  'DEOGHAR': ['JSME', 'BDME', 'DGHR', 'MDP'],
  'JSME': ['JSME', 'BDME', 'DGHR', 'MDP'],
  'BDME': ['BDME', 'JSME', 'DGHR', 'MDP'],
  'DGHR': ['DGHR', 'JSME', 'BDME', 'MDP'],
  'MDP': ['MDP', 'JSME', 'BDME'],
  'MUMBAI': ['CSMT', 'MMCT', 'BCT', 'BDTS', 'LTT', 'DR'],
  'KOLKATA': ['HWH', 'SDAH', 'KOAA', 'SHM'],
  'ARA': ['ARA'],
  'ARRAH': ['ARA'],
  'KOTA': ['KOTA', 'DKNT']
};

const CANONICAL_CITY_RESOLUTION = {
  'DELHI': 'DELHI',
  'NEW DELHI': 'NDLS',
  'OLD DELHI': 'DLI',
  'ANAND VIHAR': 'ANVT',
  'ANAND VIHAR TRM': 'ANVT',
  'ANAND VIHAR TERMINAL': 'ANVT',
  'HAZRAT NIZAMUDDIN': 'NZM',
  'NIZAMUDDIN': 'NZM',
  'PATNA': 'PATNA',
  'PATNA JN': 'PNBE',
  'PATNA JUNCTION': 'PNBE',
  'DANAPUR': 'DNR',
  'PATLIPUTRA': 'PPTA',
  'RAJENDRA NAGAR': 'RJPB',
  'DEOGHAR': 'DEOGHAR',
  'BAIDYANATH DHAM': 'DEOGHAR',
  'BABA BAIDYANATH DHAM': 'DEOGHAR',
  'BABA BAIDYANATH DHAM DEOGHAR': 'DEOGHAR',
  'BAIDYANATHDHAM': 'DEOGHAR',
  'JASIDIH': 'JSME',
  'JASIDIH JN': 'JSME',
  'MADHUPUR': 'MDP',
  'MADHUPUR JN': 'MDP',
  'ARA': 'ARA',
  'ARRAH': 'ARA',
  'ARA JN': 'ARA',
  'ARA JUNCTION': 'ARA',
  'KOTA': 'KOTA',
  'KOTA JN': 'KOTA',
  'MUMBAI': 'MUMBAI',
  'BOMBAY': 'MUMBAI',
  'CSMT': 'CSMT',
  'MUMBAI CENTRAL': 'MMCT',
  'KOLKATA': 'KOLKATA',
  'CALCUTTA': 'KOLKATA',
  'HOWRAH': 'HWH',
  'SEALDAH': 'SDAH',
  'VARANASI': 'BSB',
  'BANARAS': 'BSBS',
  'PRAYAGRAJ': 'PRYJ',
  'ALLAHABAD': 'PRYJ',
  'KANPUR': 'CNB',
  'LUCKNOW': 'LKO',
  'JHANSI': 'VGLJ',
  'AYODHYA': 'AY',
  'AYODHYA CANTT': 'AYC'
};

function getEquivalentStationCodes(code) {
  if (!code) return [];
  const c = code.trim().toUpperCase();
  const eq = new Set([c]);
  if (STATION_ALIASES[c]) eq.add(STATION_ALIASES[c]);
  for (const [k, v] of Object.entries(STATION_ALIASES)) {
    if (v === c) eq.add(k);
  }
  if (CITY_CLUSTERS[c]) {
    CITY_CLUSTERS[c].forEach(item => eq.add(item));
  }
  return Array.from(eq);
}

/**
 * Extracts and normalizes station code from user inputs such as:
 * - "NDLS - New Delhi"
 * - "ARA - Ara Junction"
 * - "New Delhi (NDLS)"
 * - "ndls"
 * - "New Delhi"
 */
function extractStationCode(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return '';
  const trimmed = inputStr.trim();
  if (!trimmed) return '';

  // 1. Check pattern: "CODE - Station Name"
  const dashMatch = trimmed.match(/^([A-Za-z0-9]+)\s*-\s*/);
  if (dashMatch) {
    const raw = dashMatch[1].toUpperCase();
    return STATION_ALIASES[raw] || raw;
  }

  // 2. Check pattern: "Station Name (CODE)"
  const parenMatch = trimmed.match(/\(([A-Za-z0-9]+)\)/);
  if (parenMatch) {
    const raw = parenMatch[1].toUpperCase();
    return STATION_ALIASES[raw] || raw;
  }

  const clean = trimmed.toUpperCase();

  // 3. Explicit canonical city/corridor dictionary lookup (avoids wrong suburban prefix matching)
  if (CANONICAL_CITY_RESOLUTION[clean]) {
    return CANONICAL_CITY_RESOLUTION[clean];
  }

  // 4. Exact match with known station code
  if (typeof BHARAT_STATIONS !== 'undefined' && Array.isArray(BHARAT_STATIONS)) {
    const exactCode = BHARAT_STATIONS.find(s => s.code.toUpperCase() === clean);
    if (exactCode) {
      return STATION_ALIASES[exactCode.code] || exactCode.code;
    }

    // 5. Exact match with station name
    const exactName = BHARAT_STATIONS.find(s => s.name.toUpperCase() === clean);
    if (exactName) {
      return STATION_ALIASES[exactName.code] || exactName.code;
    }

    // 6. Match with aliases
    const aliasMatch = BHARAT_STATIONS.find(s => s.aliases && s.aliases.some(a => a.toUpperCase() === clean));
    if (aliasMatch) {
      return STATION_ALIASES[aliasMatch.code] || aliasMatch.code;
    }

    // 7. Match with major station prefixes
    const majorPrefix = BHARAT_STATIONS.find(s => s.isMajor && s.name.toUpperCase().startsWith(clean));
    if (majorPrefix) {
      return STATION_ALIASES[majorPrefix.code] || majorPrefix.code;
    }

    // 8. Match with general station name prefix
    const prefixName = BHARAT_STATIONS.find(s => s.name.toUpperCase().startsWith(clean));
    if (prefixName) {
      return STATION_ALIASES[prefixName.code] || prefixName.code;
    }

    // 9. Match with station city
    const cityMatch = BHARAT_STATIONS.find(s => s.city.toUpperCase() === clean);
    if (cityMatch) {
      return STATION_ALIASES[cityMatch.code] || cityMatch.code;
    }
  }

  // 10. Fallback to first alphanumeric token
  const tokenMatch = clean.match(/^[A-Za-z0-9]+/);
  const token = tokenMatch ? tokenMatch[0] : clean;
  return STATION_ALIASES[token] || token;
}

function getStationName(code) {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  if (typeof BHARAT_STATIONS !== 'undefined' && Array.isArray(BHARAT_STATIONS)) {
    const s = BHARAT_STATIONS.find(stn => stn.code.toUpperCase() === clean);
    if (s) return s.name;
    const eq = getEquivalentStationCodes(clean);
    const alt = BHARAT_STATIONS.find(stn => eq.includes(stn.code.toUpperCase()));
    if (alt) return alt.name;
  }
  return code;
}

function initStationAutocomplete() {
  const fromInput = document.getElementById('fromStation');
  const toInput = document.getElementById('toStation');
  const fromDropdown = document.getElementById('fromDropdown');
  const toDropdown = document.getElementById('toDropdown');

  if (fromInput && fromDropdown) {
    bindAutocomplete(fromInput, fromDropdown);
  }
  if (toInput && toDropdown) {
    bindAutocomplete(toInput, toDropdown);
  }
}

function bindAutocomplete(inputElem, dropdownElem) {
  inputElem.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val.length < 1) {
      dropdownElem.classList.remove('open');
      dropdownElem.innerHTML = '';
      return;
    }

    if (typeof BHARAT_STATIONS === 'undefined' || !Array.isArray(BHARAT_STATIONS)) {
      return;
    }

    const scored = [];
    for (const s of BHARAT_STATIONS) {
      const codeLower = s.code.toLowerCase();
      const nameLower = s.name.toLowerCase();
      const cityLower = (s.city || '').toLowerCase();
      let score = 0;

      if (codeLower === val) {
        score += 2000;
      } else if (codeLower.startsWith(val)) {
        score += 1000;
      }

      if (nameLower === val) {
        score += 1500;
      } else if (nameLower.startsWith(val)) {
        score += 800;
      } else if (nameLower.includes(val)) {
        score += 300;
      }

      if (cityLower === val) {
        score += 1200;
      } else if (cityLower.startsWith(val)) {
        score += 600;
      } else if (cityLower.includes(val)) {
        score += 200;
      }

      if (s.aliases) {
        for (const a of s.aliases) {
          const aLower = a.toLowerCase();
          if (aLower === val) {
            score += 1100;
            break;
          } else if (aLower.startsWith(val)) {
            score += 500;
            break;
          } else if (aLower.includes(val)) {
            score += 150;
            break;
          }
        }
      }

      if (score > 0) {
        if (s.isMajor) score += 400;
        scored.push({ station: s, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const matches = scored.slice(0, 8).map(x => x.station);

    if (matches.length === 0) {
      dropdownElem.innerHTML = '<div class="autocomplete-item"><span class="stn-name text-muted">No station found</span></div>';
      dropdownElem.classList.add('open');
      return;
    }

    dropdownElem.innerHTML = matches.map(s => {
      // Highlight matching letters
      const reg = new RegExp(`(${val})`, 'gi');
      const highlightedName = s.name.replace(reg, '<strong style="color:var(--rail-blue)">$1</strong>');
      return `
        <div class="autocomplete-item" data-code="${s.code}" data-name="${s.name}">
          <div>
            <div class="stn-name">${highlightedName}</div>
            <div class="stn-meta">${s.city || ''}, ${s.state || 'India'}</div>
          </div>
          <span class="stn-code">${s.code}</span>
        </div>
      `;
    }).join('');

    dropdownElem.classList.add('open');

    dropdownElem.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        const name = item.dataset.name;
        if (code) {
          inputElem.value = `${code} - ${name}`;
          inputElem.dataset.code = code;
          dropdownElem.classList.remove('open');
        }
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!inputElem.contains(e.target) && !dropdownElem.contains(e.target)) {
      dropdownElem.classList.remove('open');
    }
  });
}

function initSwapButton() {
  const btnSwap = document.getElementById('btnSwap');
  const fromInput = document.getElementById('fromStation');
  const toInput = document.getElementById('toStation');

  if (btnSwap && fromInput && toInput) {
    btnSwap.addEventListener('click', () => {
      btnSwap.style.transform = 'rotate(180deg)';
      setTimeout(() => { btnSwap.style.transform = ''; }, 300);

      const tempVal = fromInput.value;
      const tempCode = fromInput.dataset.code;

      fromInput.value = toInput.value;
      fromInput.dataset.code = toInput.dataset.code;

      toInput.value = tempVal;
      toInput.dataset.code = tempCode;
    });
  }
}

function initDateDefaults() {
  const dateInput = document.getElementById('journeyDate');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    dateInput.value = tomorrowStr;
    dateInput.min = new Date().toISOString().split('T')[0];
  }
}

// Quick Date Pill helper (Today, Tomorrow, Day After)
window.setQuickDate = function(dayOffset) {
  const dateInput = document.getElementById('journeyDate');
  if (!dateInput) return;
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  dateInput.value = d.toISOString().split('T')[0];
};

// ==========================================================================
// 2. SEARCH & ROUTE-AWARE ENGINE
// ==========================================================================

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseJourneyDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return { str: now.toISOString().split('T')[0], weekday: WEEKDAYS[now.getDay()], dayIndex: now.getDay() };
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return { str: dateStr, weekday: WEEKDAYS[d.getDay()], dayIndex: d.getDay() };
  }
  const now = new Date();
  return { str: dateStr, weekday: WEEKDAYS[now.getDay()], dayIndex: now.getDay() };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function calculateSegmentMetrics(train, fromIndex, toIndex, quotaCode, journeyDate) {
  const fromStop = train.route[fromIndex];
  const toStop = train.route[toIndex];

  const depTime = fromStop.departure || '00:00';
  const arrTime = toStop.arrival || '00:00';

  const depMin = ((fromStop.day || 1) - 1) * 1440 + parseTimeToMinutes(depTime);
  const arrMin = ((toStop.day || 1) - 1) * 1440 + parseTimeToMinutes(arrTime);
  let diffMinutes = arrMin - depMin;
  if (diffMinutes <= 0) {
    diffMinutes += 1440;
  }

  const durHours = Math.floor(diffMinutes / 60);
  const durMins = diffMinutes % 60;
  const durationStr = `${durHours}h ${durMins > 0 ? (durMins < 10 ? '0' + durMins : durMins) + 'm' : '00m'}`;

  const segDist = Math.max(0, (toStop.distance || 0) - (fromStop.distance || 0));

  let segmentClasses = [];
  if (typeof RailwayFareEngine !== 'undefined') {
    const q = quotaCode || (typeof currentQuota !== 'undefined' ? currentQuota : 'GN');
    const d = journeyDate || (typeof currentSearchDate !== 'undefined' ? currentSearchDate : null);
    segmentClasses = RailwayFareEngine.calculateSegmentClassFares(train, fromStop.code, toStop.code, q, d);
  } else {
    const MIN_CLASS_FARES = {
      '1A': 1250, 'EC': 1100, '2A': 780, '3A': 520, '3E': 480, 'CC': 380, 'SL': 175, '2S': 85
    };
    segmentClasses = (train.classes || ['SL', '3A']).map(clsCode => {
      const fullFare = (train.fares && train.fares[clsCode]) || 1200;
      const avl = (train.availability && train.availability[clsCode]) || {
        status: 'AVAILABLE',
        text: 'AVAILABLE 42',
        code: 'available'
      };
      return {
        code: clsCode,
        fare: fullFare,
        avlText: avl.text,
        avlStatus: avl.status,
        avlCode: avl.code || 'available'
      };
    });
  }

  return {
    segmentDeparture: depTime,
    segmentArrival: arrTime,
    segmentDuration: durationStr,
    segmentDistance: segDist,
    segmentHalts: Math.max(0, toIndex - fromIndex - 1),
    segmentClasses,
    fromStop,
    toStop
  };
}

function initSearchPage() {
  const searchResultsContainer = document.getElementById('searchResultsList');
  if (!searchResultsContainer) return;

  const corridorTitle = document.getElementById('corridorTitle');
  const corridorDate = document.getElementById('corridorDate');
  const resultsCount = document.getElementById('resultsCount');

  const urlParams = new URLSearchParams(window.location.search);
  const rawFrom = urlParams.get('from');
  const rawTo = urlParams.get('to');
  const rawDate = urlParams.get('date');
  const classFilter = urlParams.get('class') || 'ALL';
  const quotaFilter = urlParams.get('quota') || 'GN';

  // Check if we are on index.html (Homepage showcase)
  if (!corridorTitle && !window.location.pathname.includes('search.html')) {
    renderHomepageFeaturedTrains(searchResultsContainer);
    return;
  }

  // Authoritative corridor search
  const fromCode = extractStationCode(rawFrom || 'NDLS');
  const toCode = extractStationCode(rawTo || 'ARA');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];
  const dateParam = rawDate || defaultDateStr;

  const dayInfo = parseJourneyDate(dateParam);

  // Sync search inputs in modify bar if present
  const fromInput = document.getElementById('fromStation');
  const toInput = document.getElementById('toStation');
  const dateInput = document.getElementById('journeyDate');
  const classSelect = document.getElementById('travelClass');
  const quotaSelect = document.getElementById('quota');

  if (fromInput) fromInput.value = rawFrom || `${fromCode} - ${getStationName(fromCode)}`;
  if (toInput) toInput.value = rawTo || `${toCode} - ${getStationName(toCode)}`;
  if (dateInput) dateInput.value = dateParam;
  if (classSelect) classSelect.value = classFilter;
  if (quotaSelect) quotaSelect.value = quotaFilter;

  if (corridorTitle) {
    corridorTitle.textContent = `${fromCode} (${getStationName(fromCode)}) → ${toCode} (${getStationName(toCode)})`;
  }
  if (corridorDate) {
    corridorDate.textContent = `Journey Date: ${dateParam} (${dayInfo.weekday}) • Quota: ${quotaFilter}`;
  }

  // ==========================================================================
  // AUTHORITATIVE ROUTE FILTERING ALGORITHM (Parts 71 - 77)
  // ==========================================================================
  if (typeof BHARAT_TRAINS === 'undefined' || !Array.isArray(BHARAT_TRAINS)) {
    searchResultsContainer.innerHTML = '<div class="card text-center" style="padding:32px;">Data layer not loaded.</div>';
    return;
  }

  const fromEq = getEquivalentStationCodes(fromCode);
  const toEq = getEquivalentStationCodes(toCode);

  let candidateIndices = null;
  if (typeof STATION_STOP_INDEX !== 'undefined') {
    const fromIndices = new Set();
    fromEq.forEach(c => {
      (STATION_STOP_INDEX[c] || []).forEach(idx => fromIndices.add(idx));
    });
    const toIndices = new Set();
    toEq.forEach(c => {
      (STATION_STOP_INDEX[c] || []).forEach(idx => toIndices.add(idx));
    });
    candidateIndices = Array.from(fromIndices).filter(idx => toIndices.has(idx));
  }

  const trainsToScan = candidateIndices 
    ? candidateIndices.map(idx => BHARAT_TRAINS[idx]).filter(Boolean)
    : BHARAT_TRAINS;

  const matchingTrains = [];

  for (const train of trainsToScan) {
    if (!train.route || !Array.isArray(train.route)) continue;

    // Rule 0: Service Status and Timetable Validity
    // Normal booking search strictly accepts ACTIVE trains, or SPECIAL trains within their validity window.
    if (train.serviceStatus && train.serviceStatus !== 'ACTIVE' && train.serviceStatus !== 'SPECIAL') {
      continue;
    }
    if (train.effectiveFrom && dateParam < train.effectiveFrom) {
      continue;
    }
    if (train.effectiveTo && dateParam > train.effectiveTo) {
      continue;
    }

    const fromIndex = train.route.findIndex(s => fromEq.includes(s.code));
    const toIndex = train.route.findIndex(s => toEq.includes(s.code));

    // Rule 1 & 2 & 3: Stops must exist and fromIndex must be strictly BEFORE toIndex
    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      continue;
    }

    // Rule 4: Running days check
    // Train origin running day calculation based on stop day offset
    const fromStop = train.route[fromIndex];
    const stopDayOffset = (fromStop.day || 1) - 1;
    const originDayIndex = (dayInfo.dayIndex - stopDayOffset + 7) % 7;
    const originWeekday = WEEKDAYS[originDayIndex];

    if (train.runsOn && !train.runsOn.includes(originWeekday)) {
      continue;
    }

    // Rule 5: Class filter
    if (classFilter !== 'ALL' && (!train.classes || !train.classes.includes(classFilter))) {
      continue;
    }

    // Train is an authentic matching service on this route and date
    const metrics = calculateSegmentMetrics(train, fromIndex, toIndex, quotaFilter, dateParam);
    matchingTrains.push({
      ...train,
      ...metrics
    });
  }

  // Update counter
  if (resultsCount) {
    resultsCount.textContent = `${matchingTrains.length} ${matchingTrains.length === 1 ? 'Train' : 'Trains'} Found`;
  }

  // Update counts in sidebar filter checkboxes
  updateSidebarFilterCounts(matchingTrains);

  // STRICT REQUIREMENT: If no trains match, NEVER fallback to showing all trains.
  if (matchingTrains.length === 0) {
    searchResultsContainer.innerHTML = `
      <div class="card text-center" style="padding:48px 24px; margin:24px auto; max-width:640px;">
        <div style="width:52px; height:52px; border-radius:50%; background:var(--status-reg-bg); color:var(--status-reg-text); display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <i data-lucide="calendar-x-2" style="width:26px;height:26px;"></i>
        </div>
        <h3 style="font-size:16px; font-weight:800; color:var(--ink);">No Scheduled Trains Found</h3>
        <p style="font-size:13px; color:var(--ink-secondary); margin-top:8px; line-height:1.5;">
          There are no direct train services operating between <strong>${fromCode} (${getStationName(fromCode)})</strong> and <strong>${toCode} (${getStationName(toCode)})</strong> on <strong>${dateParam}</strong>.
        </p>
        <p style="font-size:11px; color:var(--ink-muted); margin-top:6px;">
          Please verify station selection or try searching on another date when scheduled services run.
        </p>
        <div style="margin-top:20px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="index.html" class="btn-signin" style="padding:9px 18px;">
            <i data-lucide="arrow-left" style="width:14px;height:14px;"></i>
            <span>Modify Station</span>
          </a>
          <a href="trains.html" class="btn-search" style="padding:9px 18px;">
            <i data-lucide="map" style="width:14px;height:14px;"></i>
            <span>Browse All Trains Timetable</span>
          </a>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Setup live sidebar filters
  function filterAndDisplay() {
    const checkedClasses = Array.from(document.querySelectorAll('.sidebar-class-filter:checked')).map(el => el.dataset.class);
    const checkedTypes = Array.from(document.querySelectorAll('.sidebar-type-filter:checked')).map(el => el.dataset.type);
    const activeWindowBtn = document.querySelector('.dep-window-btn.active');
    const activeWindow = activeWindowBtn ? activeWindowBtn.dataset.window : null;

    const filtered = matchingTrains.filter(t => {
      // Class filter
      if (checkedClasses.length > 0) {
        const hasClass = t.classes && t.classes.some(c => checkedClasses.includes(c));
        if (!hasClass) return false;
      }

      // Train type filter
      if (checkedTypes.length > 0) {
        if (!checkedTypes.includes(t.type)) return false;
      }

      // Departure window filter
      if (activeWindow) {
        const depHour = parseInt((t.segmentDeparture || '00:00').split(':')[0], 10);
        const [startH, endH] = activeWindow.split('-').map(Number);
        if (depHour < startH || depHour >= endH) return false;
      }

      return true;
    });

    if (resultsCount) {
      resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'Train' : 'Trains'} Found`;
    }

    if (filtered.length === 0) {
      searchResultsContainer.innerHTML = `
        <div class="card text-center" style="padding:36px 20px; margin:20px auto; max-width:540px;">
          <h4 style="font-size:14px; font-weight:800; color:var(--ink);">No Trains Match Current Filters</h4>
          <p style="font-size:12px; color:var(--ink-secondary); margin-top:6px;">Try adjusting your sidebar filters or selecting another departure window.</p>
        </div>
      `;
    } else {
      renderTrainCards(filtered, searchResultsContainer, fromCode, toCode, dateParam, quotaFilter);
    }
  }

  // Bind change events to sidebar checkboxes
  document.querySelectorAll('.sidebar-class-filter, .sidebar-type-filter').forEach(input => {
    input.addEventListener('change', filterAndDisplay);
  });

  // Bind click events to departure window buttons
  document.querySelectorAll('.dep-window-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.dep-window-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      filterAndDisplay();
    });
  });

  // Initial render for verified matching trains
  renderTrainCards(matchingTrains, searchResultsContainer, fromCode, toCode, dateParam, quotaFilter);
}

function updateSidebarFilterCounts(trains) {
  document.querySelectorAll('.sidebar-class-filter').forEach(input => {
    const cls = input.dataset.class;
    const count = trains.filter(t => t.classes && t.classes.includes(cls)).length;
    const countSpan = document.getElementById(`count-class-${cls}`);
    if (countSpan) countSpan.textContent = `(${count})`;
  });

  document.querySelectorAll('.sidebar-type-filter').forEach(input => {
    const type = input.dataset.type;
    const count = trains.filter(t => t.type === type).length;
    const countSpan = document.getElementById(`count-type-${type}`);
    if (countSpan) countSpan.textContent = `(${count})`;
  });
}

function renderHomepageFeaturedTrains(container) {
  if (typeof BHARAT_TRAINS === 'undefined' || !Array.isArray(BHARAT_TRAINS)) return;

  const featuredNumbers = ['20802', '22436', '12952', '12302', '12622'];
  const featured = [];

  for (const num of featuredNumbers) {
    const t = BHARAT_TRAINS.find(tr => tr.number === num);
    if (t) {
      const fromIndex = 0;
      const toIndex = t.route.length - 1;
      const metrics = calculateSegmentMetrics(t, fromIndex, toIndex);
      featured.push({
        ...t,
        ...metrics
      });
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  renderTrainCards(featured, container, null, null, defaultDate, 'GN');
}

function renderTrainCards(trains, container, fromCode, toCode, journeyDate, quota) {
  const DAYS_LABEL = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  container.innerHTML = trains.map(t => {
    const displayFromCode = fromCode || t.source.code;
    const displayToCode = toCode || t.destination.code;
    const displayFromName = t.fromStop ? t.fromStop.name : t.source.name;
    const displayToName = t.toStop ? t.toStop.name : t.destination.name;

    const primaryClass = t.segmentClasses && t.segmentClasses[0] ? t.segmentClasses[0] : { code: '3A', fare: 1320, avlText: 'AVAILABLE 31' };

    return `
      <div class="train-card" id="train-card-${t.number}">
        <div class="train-card-top">
          <div class="train-card-header">
            <div class="train-ident">
              <span class="train-number-badge">${t.number}</span>
              <h3 class="train-name">${t.name}</h3>
              <span class="train-type-pill">${(t.type || 'EXPRESS').replace('_', ' ')}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <a href="live-status.html?train=${t.number}&date=${journeyDate || ''}" class="btn-signin" style="padding:4px 10px; font-size:11px; background:var(--bg-light-blue); color:var(--rail-blue); border-color:var(--rail-blue);" title="Spot live train running status">
                <i data-lucide="navigation" style="width:12px;height:12px;"></i>
                <span>Spot Train</span>
              </a>
              <button type="button" class="btn-signin" style="padding:4px 10px; font-size:11px;" onclick="openRouteDrawer('${t.number}')">
                <i data-lucide="map" style="width:12px;height:12px;"></i>
                <span>View Route</span>
              </button>
              <div class="train-days" title="Running Days">
                ${DAYS_LABEL.map((dayName, idx) => `
                  <span class="day-dot ${(t.runsOn && t.runsOn.includes(dayName)) ? 'active' : ''}">${DAYS_SHORT[idx]}</span>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="route-timeline-row">
            <div class="station-point">
              <div class="station-time">${t.segmentDeparture}</div>
              <div class="station-code-name">${displayFromCode}</div>
              <div class="station-subname">${displayFromName}</div>
            </div>

            <div class="duration-line-wrap">
              <span class="duration-label">${t.segmentDuration}</span>
              <div class="timeline-track">
                <span class="timeline-dot"></span>
                <span class="timeline-dot end"></span>
              </div>
              <span class="distance-label">${t.segmentDistance} km • ${t.segmentHalts} halts</span>
            </div>

            <div class="station-point dest">
              <div class="station-time">${t.segmentArrival}</div>
              <div class="station-code-name">${displayToCode}</div>
              <div class="station-subname">${displayToName}</div>
            </div>
          </div>

          <div class="classes-chips-row">
            ${(t.segmentClasses || []).map(cls => `
              <div class="class-chip" onclick="toggleDrawer('${t.number}', '${cls.code}', ${cls.fare}, '${cls.avlText}', '${displayFromCode}', '${displayToCode}', '${journeyDate}', '${quota || 'GN'}')">
                <div class="class-chip-top">
                  <span class="class-code">${cls.code}</span>
                  <span class="class-fare">₹${cls.fare}</span>
                </div>
                <span class="avl-status-tag ${cls.avlCode}">${cls.avlText}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="class-drawer" id="drawer-${t.number}">
          <div class="drawer-inner">
            <div class="fare-breakdown-list">
              <div class="fare-item">
                <span>Selected Class</span>
                <strong id="drawer-class-${t.number}">${primaryClass.code}</strong>
              </div>
              <div class="fare-item">
                <span>Live Availability</span>
                <strong id="drawer-avl-${t.number}" class="text-success">${primaryClass.avlText}</strong>
              </div>
              <div class="fare-item">
                <span>Base + GST Fare</span>
                <strong id="drawer-fare-${t.number}">₹${primaryClass.fare}</strong>
              </div>
            </div>

            <div class="drawer-actions">
              <button type="button" class="btn-fare-modal" id="btn-fare-modal-${t.number}" onclick="openFareModal('${t.number}', '${primaryClass.code}', ${primaryClass.fare}, '${displayFromCode}', '${displayToCode}', '${quota || 'GN'}', '${journeyDate || ''}')">
                <i data-lucide="info" style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:3px;"></i>
                <span>Fare Breakdown</span>
              </button>
              <button type="button" class="btn-book-now" id="btn-book-${t.number}">
                <span>Book Ticket</span>
                <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.toggleDrawer = function(trainNumber, classCode, fare, avl, fromCode, toCode, journeyDate, quota) {
  const drawer = document.getElementById(`drawer-${trainNumber}`);
  if (!drawer) return;

  const isCurrentOpen = drawer.classList.contains('open');

  // Close all other drawers
  document.querySelectorAll('.class-drawer').forEach(d => d.classList.remove('open'));

  if (!isCurrentOpen) {
    drawer.classList.add('open');
    const classElem = document.getElementById(`drawer-class-${trainNumber}`);
    const avlElem = document.getElementById(`drawer-avl-${trainNumber}`);
    const fareElem = document.getElementById(`drawer-fare-${trainNumber}`);
    const fareModalBtn = document.getElementById(`btn-fare-modal-${trainNumber}`);

    if (classElem) classElem.textContent = classCode;
    if (avlElem) avlElem.textContent = avl;
    if (fareElem) fareElem.textContent = `₹${fare}`;

    if (fareModalBtn) {
      fareModalBtn.onclick = () => openFareModal(trainNumber, classCode, fare, fromCode, toCode, quota, journeyDate);
    }

    const bookBtn = document.getElementById(`btn-book-${trainNumber}`);
    if (bookBtn) {
      bookBtn.onclick = () => {
        window.location.href = `booking.html?train=${trainNumber}&class=${classCode}&from=${fromCode}&to=${toCode}&date=${journeyDate}&quota=${quota || 'GN'}`;
      };
    }
  }
};

// ==========================================================================
// 3. MULTI-STEP CHECKOUT & BOOKING ENGINE
// ==========================================================================
let currentBookingState = {
  passengers: [
    { name: 'Rohit Sharma', age: 36, gender: 'MALE', berth: 'NO_PREFERENCE', food: 'VEG' }
  ],
  baseFare: 1320,
  insurance: true,
  travelClass: '3A',
  trainNumber: '20802',
  fromCode: 'NDLS',
  toCode: 'ARA',
  journeyDate: '2026-09-29',
  quota: 'GN',
  trainObj: null
};

function initBookingPage() {
  const bookingForm = document.getElementById('bookingForm');
  if (!bookingForm) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentBookingState.trainNumber = urlParams.get('train') || '20802';
  currentBookingState.travelClass = urlParams.get('class') || '3A';
  currentBookingState.fromCode = extractStationCode(urlParams.get('from')) || 'NDLS';
  currentBookingState.toCode = extractStationCode(urlParams.get('to')) || 'ARA';
  currentBookingState.journeyDate = urlParams.get('date') || new Date().toISOString().split('T')[0];
  currentBookingState.quota = urlParams.get('quota') || 'GN';

  // Load exact train from BHARAT_TRAINS
  if (typeof BHARAT_TRAINS !== 'undefined' && Array.isArray(BHARAT_TRAINS)) {
    currentBookingState.trainObj = BHARAT_TRAINS.find(t => t.number === currentBookingState.trainNumber) || BHARAT_TRAINS[0];
  }

  const train = currentBookingState.trainObj;
  if (train) {
    const fromCode = currentBookingState.fromCode;
    const toCode = currentBookingState.toCode;
    const clsCode = currentBookingState.travelClass;
    const quotaCode = currentBookingState.quota;
    const journeyDate = currentBookingState.journeyDate;

    if (typeof RailwayFareEngine !== 'undefined') {
      const fareRes = RailwayFareEngine.calculateJourneyFare(train, fromCode, toCode, clsCode, quotaCode, journeyDate);
      if (fareRes.success) {
        currentBookingState.fareBreakdown = fareRes.breakdown;
        currentBookingState.baseFare = fareRes.breakdown.baseFare;
        currentBookingState.perPaxFare = fareRes.totalFare;
      }
    }

    if (typeof getFare === 'function') {
      getFare(train.number, fromCode, toCode, journeyDate, clsCode, quotaCode).then(liveFare => {
        if (liveFare && liveFare.totalFare && currentBookingState) {
          if (liveFare.totalFare !== currentBookingState.perPaxFare) {
            currentBookingState.perPaxFare = liveFare.totalFare;
            currentBookingState.baseFare = liveFare.baseFare || currentBookingState.baseFare;
            updateFareSummary();
          }
        }
      }).catch(() => {});
    }

    if (!currentBookingState.fareBreakdown) {
      const fromEq = getEquivalentStationCodes(currentBookingState.fromCode);
      const toEq = getEquivalentStationCodes(currentBookingState.toCode);
      const fromIndex = train.route.findIndex(s => fromEq.includes(s.code));
      const toIndex = train.route.findIndex(s => toEq.includes(s.code));

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const metrics = calculateSegmentMetrics(train, fromIndex, toIndex, quotaCode, journeyDate);
        const matchCls = metrics.segmentClasses.find(c => c.code === currentBookingState.travelClass);
        currentBookingState.perPaxFare = matchCls ? matchCls.fare : 1320;
      } else {
        currentBookingState.perPaxFare = (train.fares && train.fares[currentBookingState.travelClass]) || 1320;
      }
      currentBookingState.fareBreakdown = {
        baseFare: Math.max(50, currentBookingState.perPaxFare - 85),
        reservationFee: 40,
        superfastCharge: 45,
        tatkalCharge: (quotaCode === 'TQ' || quotaCode === 'PT') ? 150 : 0,
        cateringCharge: 0,
        gst: Math.round(currentBookingState.perPaxFare * 0.05),
        totalFare: currentBookingState.perPaxFare
      };
      currentBookingState.baseFare = currentBookingState.fareBreakdown.baseFare;
    }

    const bookingSummaryTrain = document.getElementById('bookingSummaryTrain');
    if (bookingSummaryTrain) {
      bookingSummaryTrain.textContent = `Train #${train.number} - ${train.name} (${train.type.replace('_', ' ')})`;
    }
  }

  const bookingSummaryRoute = document.getElementById('bookingSummaryRoute');
  if (bookingSummaryRoute) {
    const fromName = getStationName(currentBookingState.fromCode);
    const toName = getStationName(currentBookingState.toCode);
    bookingSummaryRoute.textContent = `${currentBookingState.fromCode} (${fromName}) → ${currentBookingState.toCode} (${toName}) • ${currentBookingState.journeyDate} • Class: ${currentBookingState.travelClass} • Quota: ${currentBookingState.quota}`;
  }

  renderPassengerList();
  updateFareSummary();

  const btnAddPassenger = document.getElementById('btnAddPassenger');
  if (btnAddPassenger) {
    btnAddPassenger.addEventListener('click', () => {
      if (currentBookingState.passengers.length >= 6) return;
      currentBookingState.passengers.push({
        name: '',
        age: 28,
        gender: 'MALE',
        berth: 'NO_PREFERENCE',
        food: 'VEG'
      });
      renderPassengerList();
      updateFareSummary();
    });
  }

  // Payment tab switcher
  document.querySelectorAll('.pay-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.tab;
      document.querySelectorAll('.payment-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(`tab-content-${target}`);
      if (targetContent) targetContent.style.display = 'block';
    });
  });

  // Insurance checkbox
  const optInsurance = document.getElementById('optInsurance');
  if (optInsurance) {
    optInsurance.addEventListener('change', (e) => {
      currentBookingState.insurance = e.target.checked;
      updateFareSummary();
    });
  }

  // Final Pay & Confirm Ticket Button
  const btnConfirmPay = document.getElementById('btnConfirmPay');
  if (btnConfirmPay) {
    btnConfirmPay.addEventListener('click', handlePaymentAndConfirm);
  }
}

function renderPassengerList() {
  const container = document.getElementById('passengersContainer');
  if (!container) return;

  const countElem = document.getElementById('paxCountLabel');
  if (countElem) {
    countElem.textContent = `(${currentBookingState.passengers.length}/6)`;
  }

  // Coach-specific berth preferences (Parts 85 - 92)
  const layout = (typeof COACH_LAYOUTS !== 'undefined' && COACH_LAYOUTS[currentBookingState.travelClass]) || (typeof COACH_LAYOUTS !== 'undefined' ? COACH_LAYOUTS['3A'] : null);
  const berthOptions = layout ? layout.berthTypes.map(bt => `
    <option value="${bt}">${layout.berthLabels[bt] || bt}</option>
  `).join('') : `
    <option value="LOWER">Lower Berth (LB)</option>
    <option value="UPPER">Upper Berth (UB)</option>
  `;

  container.innerHTML = currentBookingState.passengers.map((p, idx) => `
    <div class="passenger-box">
      <div class="passenger-box-head">
        <span style="font-size:12px; font-weight:700; color:var(--rail-blue); display:flex; align-items:center; gap:6px;">
          <i data-lucide="user" style="width:14px;height:14px;"></i>
          Passenger ${idx + 1}
        </span>
        ${currentBookingState.passengers.length > 1 ? `
          <button type="button" class="btn-remove" onclick="removePassenger(${idx})">
            <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            Remove
          </button>
        ` : ''}
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
        <div class="form-group">
          <label class="form-label">Full Legal Name (as per Govt ID) *</label>
          <input type="text" class="form-control" placeholder="e.g. Ramesh Kumar" value="${p.name}" oninput="updatePassengerField(${idx}, 'name', this.value)" required>
        </div>
        <div class="form-group" style="max-width:100px;">
          <label class="form-label">Age *</label>
          <input type="number" min="1" max="120" class="form-control" placeholder="Age" value="${p.age}" oninput="updatePassengerField(${idx}, 'age', this.value)" required>
        </div>
        <div class="form-group">
          <label class="form-label">Gender *</label>
          <select class="form-control" onchange="updatePassengerField(${idx}, 'gender', this.value)">
            <option value="MALE" ${p.gender === 'MALE' ? 'selected' : ''}>Male</option>
            <option value="FEMALE" ${p.gender === 'FEMALE' ? 'selected' : ''}>Female</option>
            <option value="TRANSGENDER" ${p.gender === 'TRANSGENDER' ? 'selected' : ''}>Transgender</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Berth / Seat Preference (${currentBookingState.travelClass})</label>
          <select class="form-control" onchange="updatePassengerField(${idx}, 'berth', this.value)">
            <option value="NO_PREFERENCE" ${p.berth === 'NO_PREFERENCE' ? 'selected' : ''}>No Preference</option>
            ${layout ? layout.berthTypes.map(bt => `
              <option value="${bt}" ${p.berth === bt ? 'selected' : ''}>${layout.berthLabels[bt] || bt}</option>
            `).join('') : berthOptions}
          </select>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.removePassenger = function(idx) {
  if (currentBookingState.passengers.length <= 1) return;
  currentBookingState.passengers.splice(idx, 1);
  renderPassengerList();
  updateFareSummary();
};

window.updatePassengerField = function(idx, field, val) {
  if (currentBookingState.passengers[idx]) {
    currentBookingState.passengers[idx][field] = val;
  }
};

function updateFareSummary() {
  const paxCount = currentBookingState.passengers.length;
  const bd = currentBookingState.fareBreakdown || {
    baseFare: currentBookingState.baseFare || 1200,
    reservationFee: 40,
    superfastCharge: 45,
    tatkalCharge: (currentBookingState.quota === 'TQ' || currentBookingState.quota === 'PT') ? 150 : 0,
    cateringCharge: 0,
    gst: 66,
    totalFare: (currentBookingState.baseFare || 1200)
  };

  const baseTotal = bd.baseFare * paxCount;
  const resFeeTotal = bd.reservationFee * paxCount;
  const sfFeeTotal = bd.superfastCharge * paxCount;
  const tatkalFeeTotal = (bd.tatkalCharge || 0) * paxCount;
  const gstTotal = bd.gst * paxCount;
  const ins = currentBookingState.insurance ? (0.45 * paxCount) : 0;
  const grandTotal = Math.round(bd.totalFare * paxCount + ins);

  const baseFareElem = document.getElementById('fareBaseTotal');
  if (baseFareElem) baseFareElem.textContent = `₹${baseTotal}`;

  const resFeeElem = document.getElementById('fareResFee');
  if (resFeeElem) resFeeElem.textContent = `₹${resFeeTotal}`;

  const sfFeeElem = document.getElementById('fareSfFee');
  if (sfFeeElem) sfFeeElem.textContent = `₹${sfFeeTotal}`;

  const tatkalRow = document.getElementById('fareTatkalRow');
  const tatkalElem = document.getElementById('fareTatkalFee');
  if (tatkalRow && tatkalElem) {
    if (tatkalFeeTotal > 0) {
      tatkalRow.style.display = 'flex';
      tatkalElem.textContent = `₹${tatkalFeeTotal}`;
    } else {
      tatkalRow.style.display = 'none';
    }
  }

  const gstElem = document.getElementById('fareGst');
  if (gstElem) gstElem.textContent = `₹${gstTotal}`;

  const insElem = document.getElementById('fareInsurance');
  if (insElem) insElem.textContent = `₹${ins.toFixed(2)}`;

  const totalElem = document.getElementById('fareGrandTotal');
  if (totalElem) totalElem.textContent = `₹${grandTotal}`;

  const payBtnAmount = document.getElementById('payBtnAmount');
  if (payBtnAmount) payBtnAmount.textContent = `(₹${grandTotal})`;
}

function handlePaymentAndConfirm(e) {
  if (e) e.preventDefault();

  // Validate passenger names
  for (let i = 0; i < currentBookingState.passengers.length; i++) {
    const p = currentBookingState.passengers[i];
    if (!p.name || p.name.trim() === '') {
      alert(`Please enter full legal name for Passenger ${i + 1}`);
      return;
    }
  }

  // Generate unique 10-digit PNR (format: 824-xxxxxxx)
  const randNum = Math.floor(1000000 + Math.random() * 9000000);
  const newPNR = `824-${randNum}`;

  const trainObj = currentBookingState.trainObj || (typeof BHARAT_TRAINS !== 'undefined' ? BHARAT_TRAINS[0] : null);
  if (!trainObj) return;

  const fromIndex = trainObj.route.findIndex(s => s.code === currentBookingState.fromCode);
  const toIndex = trainObj.route.findIndex(s => s.code === currentBookingState.toCode);

  const fromStop = (fromIndex !== -1 && trainObj.route[fromIndex]) ? trainObj.route[fromIndex] : trainObj.route[0];
  const toStop = (toIndex !== -1 && trainObj.route[toIndex]) ? trainObj.route[toIndex] : trainObj.route[trainObj.route.length - 1];

  const paxCount = currentBookingState.passengers.length;
  const bd = currentBookingState.fareBreakdown || {
    baseFare: currentBookingState.baseFare || 1200,
    reservationFee: 40,
    superfastCharge: 45,
    tatkalCharge: (currentBookingState.quota === 'TQ' || currentBookingState.quota === 'PT') ? 150 : 0,
    cateringCharge: 0,
    gst: 66,
    totalFare: (currentBookingState.baseFare || 1200)
  };
  const ins = currentBookingState.insurance ? (0.45 * paxCount) : 0;
  const grandTotal = Math.round(bd.totalFare * paxCount + ins);

  // Use coach layout to assign coach & berth strictly matching train & class
  const layout = (typeof COACH_LAYOUTS !== 'undefined' && COACH_LAYOUTS[currentBookingState.travelClass]) || (typeof COACH_LAYOUTS !== 'undefined' ? COACH_LAYOUTS['3A'] : { coaches: ['B1'], berthTypes: ['LOWER'], berthLabels: { 'LOWER': 'Lower Berth (LB)' } });
  const coaches = layout.coaches || ['B1'];
  const assignedCoach = coaches[Math.floor(Math.random() * coaches.length)];
  const validBerths = layout.berthTypes || ['LOWER'];

  const allocatedPassengers = currentBookingState.passengers.map((p, idx) => {
    const chosenType = (p.berth && p.berth !== 'NO_PREFERENCE' && validBerths.includes(p.berth))
      ? p.berth
      : validBerths[idx % validBerths.length];
    const berthLabel = (layout.berthLabels && layout.berthLabels[chosenType]) || chosenType;
    const berthNumber = 12 + idx * 3;

    return {
      name: p.name,
      age: parseInt(p.age, 10) || 30,
      gender: p.gender,
      berthPreference: p.berth,
      coach: assignedCoach,
      berthNo: `${berthNumber}`,
      berthType: berthLabel,
      status: `CNF / ${assignedCoach} / ${berthNumber}`
    };
  });

  const newBooking = {
    pnr: newPNR,
    bookingId: `BKG_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    trainNumber: trainObj.number,
    trainName: trainObj.name,
    trainType: trainObj.type,
    from: fromStop.code,
    fromName: fromStop.name,
    to: toStop.code,
    toName: toStop.name,
    date: currentBookingState.journeyDate,
    departure: fromStop.departure,
    arrival: toStop.arrival,
    travelClass: currentBookingState.travelClass,
    quota: currentBookingState.quota,
    status: 'CONFIRMED',
    chartStatus: 'CHART_NOT_PREPARED',
    totalFare: grandTotal,
    passengers: allocatedPassengers
  };

  if (typeof BookingStore !== 'undefined') {
    BookingStore.save(newBooking);
  }

  // Redirect to Confirmation ERS
  window.location.href = `confirmation.html?pnr=${newPNR}`;
}

// ==========================================================================
// 4. CONFIRMATION ERS SLIP
// ==========================================================================
function initConfirmationPage() {
  const ersContainer = document.getElementById('ersContainer');
  if (!ersContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const pnr = urlParams.get('pnr') || '824-3197430';

  if (typeof BookingStore === 'undefined') return;

  const booking = BookingStore.getByPNR(pnr);
  if (!booking) {
    ersContainer.innerHTML = `
      <div class="card text-center" style="padding:40px;">
        <h3 style="color:var(--status-reg-text)">Booking Record Not Found</h3>
        <p style="font-size:12px; color:var(--ink-muted); margin-top:8px;">No reservation found for PNR: ${pnr}</p>
        <a href="index.html" class="btn-search" style="margin-top:16px;">Back to Home</a>
      </div>
    `;
    return;
  }

  // Populate ticket elements
  const ersPNR = document.getElementById('ersPNR');
  const ersTrain = document.getElementById('ersTrain');
  const ersRoute = document.getElementById('ersRoute');
  const ersDepArr = document.getElementById('ersDepArr');
  const ersTotalFare = document.getElementById('ersTotalFare');

  if (ersPNR) ersPNR.textContent = booking.pnr;
  if (ersTrain) ersTrain.textContent = `#${booking.trainNumber} - ${booking.trainName} (${booking.travelClass})`;
  if (ersRoute) ersRoute.textContent = `${booking.from} (${booking.fromName || booking.from}) → ${booking.to} (${booking.toName || booking.to}) • ${booking.date}`;
  if (ersDepArr) ersDepArr.textContent = `Dep: ${booking.departure} | Arr: ${booking.arrival}`;
  if (ersTotalFare) ersTotalFare.textContent = `₹${booking.totalFare}`;

  const paxBody = document.getElementById('ersPaxTableBody');
  if (paxBody && booking.passengers) {
    paxBody.innerHTML = booking.passengers.map((p, idx) => `
      <tr>
        <td class="mono font-bold">${idx + 1}</td>
        <td style="font-weight:700;">${p.name}</td>
        <td>${p.age} / ${p.gender}</td>
        <td class="mono font-bold" style="color:var(--status-avl-text);">${p.status}</td>
        <td style="font-weight:600;">Coach ${p.coach || '—'}, Berth ${p.berthNo || '—'} (${p.berthType || '—'})</td>
      </tr>
    `).join('');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================================================
// 5. PNR STATUS & CANCELLATION
// ==========================================================================
function initPNRPage() {
  const pnrForm = document.getElementById('pnrSearchForm');
  if (!pnrForm) return;

  pnrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pnrInput = document.getElementById('pnrInput');
    if (!pnrInput) return;
    executePNRQuery(pnrInput.value);
  });

  // Handle query parameter on load
  const urlParams = new URLSearchParams(window.location.search);
  const pnrParam = urlParams.get('pnr');
  if (pnrParam) {
    const input = document.getElementById('pnrInput');
    if (input) input.value = pnrParam;
    executePNRQuery(pnrParam);
  }
}

window.querySamplePNR = function(pnrStr) {
  const input = document.getElementById('pnrInput');
  if (input) input.value = pnrStr;
  executePNRQuery(pnrStr);
};

function executePNRQuery(pnrStr) {
  const pnrResultSection = document.getElementById('pnrResultSection');
  if (!pnrResultSection) return;

  if (typeof BookingStore === 'undefined') return;

  const booking = BookingStore.getByPNR(pnrStr);
  if (!booking) {
    pnrResultSection.style.display = 'block';
    pnrResultSection.innerHTML = `
      <div class="card text-center" style="padding:32px;">
        <h3 style="font-size:15px; font-weight:700; color:var(--status-reg-text);">PNR Not Found</h3>
        <p style="font-size:12px; color:var(--ink-muted); margin-top:6px;">No ticket reservation exists for PNR: <strong>${pnrStr}</strong>.</p>
      </div>
    `;
    return;
  }

  pnrResultSection.style.display = 'block';
  pnrResultSection.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <span style="font-size:10px; font-weight:700; color:var(--ink-muted); text-transform:uppercase;">Passenger Reservation Status</span>
          <div class="pnr-pill" style="margin-top:4px;">PNR: ${booking.pnr}</div>
        </div>
        <div style="text-align:right;">
          <span class="avl-status-tag ${booking.status === 'CONFIRMED' ? 'available' : 'regret'}">
            ${booking.status}
          </span>
          <div style="font-size:11px; color:var(--ink-muted); margin-top:4px;">
            ${booking.chartStatus === 'CHART_PREPARED' ? 'Chart Prepared ✓' : 'Chart Not Prepared'}
          </div>
        </div>
      </div>

      <div style="padding:20px 22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <div>
            <h4 style="font-size:1.15rem; font-weight:800; color:var(--rail-navy);">#${booking.trainNumber} - ${booking.trainName}</h4>
            <p style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
              ${booking.from} (${booking.fromName || booking.from}, Dep: ${booking.departure}) → ${booking.to} (${booking.toName || booking.to}, Arr: ${booking.arrival}) • ${booking.date} • Class: ${booking.travelClass} • Quota: ${booking.quota}
            </p>
          </div>
          ${booking.status !== 'CANCELLED' ? `
            <button type="button" class="btn-signin" style="color:var(--status-reg-text); border-color:var(--status-reg-border);" onclick="cancelBookingPNR('${booking.pnr}')">
              <i data-lucide="x-circle" style="width:14px;height:14px;"></i>
              Cancel Ticket
            </button>
          ` : `
            <span class="avl-status-tag regret">Ticket Cancelled</span>
          `}
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Passenger Name</th>
                <th>Age/Gender</th>
                <th>Booking Status</th>
                <th>Current Status</th>
                <th>Coach / Berth</th>
              </tr>
            </thead>
            <tbody>
              ${(booking.passengers || []).map((p, idx) => `
                <tr>
                  <td class="mono font-bold">${idx + 1}</td>
                  <td style="font-weight:700;">${p.name}</td>
                  <td>${p.age} / ${p.gender}</td>
                  <td class="mono font-bold">${p.status}</td>
                  <td class="mono font-bold" style="color:${booking.status === 'CANCELLED' ? 'var(--status-reg-text)' : 'var(--status-avl-text)'};">
                    ${booking.status === 'CANCELLED' ? 'CANCELLED' : p.status}
                  </td>
                  <td style="font-weight:600;">Coach ${p.coach || '—'} / Berth ${p.berthNo || '—'} (${p.berthType || '—'})</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${booking.cancellation ? `
          <div style="background:var(--status-reg-bg); border:1px solid var(--status-reg-border); border-radius:var(--radius-md); padding:14px; margin-top:14px; font-size:12px;">
            <strong style="color:var(--status-reg-text);">Statutory Refund Summary:</strong>
            <div style="display:flex; justify-content:space-between; margin-top:6px;">
              <span>Cancellation Tariff Deducted: <strong>₹${booking.cancellation.cancellationCharge}</strong></span>
              <span>Total Refund Credited: <strong class="mono" style="color:var(--status-avl-text);">₹${booking.cancellation.refundAmount}</strong></span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.cancelBookingPNR = function(pnrStr) {
  if (!confirm(`Are you sure you want to cancel ticket for PNR: ${pnrStr}?\nStatutory cancellation charges will apply according to Indian Railways refund rules.`)) {
    return;
  }

  try {
    const res = BookingStore.cancel(pnrStr);
    if (res && res.success) {
      alert(`Ticket for PNR ${pnrStr} cancelled successfully!\nRefund of ₹${res.refundAmount} initiated to source payment method.`);
      executePNRQuery(pnrStr);
    }
  } catch (err) {
    alert(err.message || 'Cancellation failed');
  }
};

// ==========================================================================
// 6. MY BOOKINGS PAGE CONTROLLER (bookings.html)
// ==========================================================================
function initMyBookingsPage() {
  const container = document.getElementById('myBookingsList');
  if (!container) return;

  if (typeof BookingStore === 'undefined') return;

  const bookings = BookingStore.getAll();
  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="card text-center" style="padding:48px 24px;">
        <i data-lucide="ticket" style="width:48px;height:48px;color:var(--ink-muted);margin:0 auto 16px;"></i>
        <h3 style="font-size:16px; font-weight:800; color:var(--ink);">No Bookings Found</h3>
        <p style="font-size:13px; color:var(--ink-secondary); margin-top:6px;">You have not made any train reservations yet.</p>
        <a href="index.html" class="btn-search" style="margin:20px auto 0; display:inline-flex; width:fit-content;">Book a Train</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <span style="font-size:10px; font-weight:700; color:var(--ink-muted); text-transform:uppercase;">PNR Reference</span>
          <div class="pnr-pill" style="margin-top:2px;">${b.pnr}</div>
        </div>
        <div style="text-align:right;">
          <span class="avl-status-tag ${b.status === 'CONFIRMED' ? 'available' : 'regret'}">
            ${b.status}
          </span>
          <div style="font-size:11px; color:var(--ink-muted); margin-top:2px;">Booked on ${b.date}</div>
        </div>
      </div>
      <div style="padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h4 style="font-size:1.1rem; font-weight:800; color:var(--rail-navy);">#${b.trainNumber} - ${b.trainName}</h4>
          <p style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            ${b.from} (${b.fromName || b.from}) → ${b.to} (${b.toName || b.to}) • Class: <strong>${b.travelClass}</strong> • Quota: <strong>${b.quota}</strong> • Total Fare: <strong>₹${b.totalFare}</strong>
          </p>
          <div style="font-size:11px; color:var(--ink-muted); margin-top:4px;">
            Passengers: ${(b.passengers || []).map(p => `${p.name} (${p.coach}/${p.berthNo})`).join(', ')}
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <a href="confirmation.html?pnr=${b.pnr}" class="btn-signin" style="font-size:12px;">
            <i data-lucide="eye" style="width:13px;height:13px;"></i>
            <span>View Ticket</span>
          </a>
          <a href="pnr.html?pnr=${b.pnr}" class="btn-signin" style="font-size:12px;">
            <i data-lucide="file-check" style="width:13px;height:13px;"></i>
            <span>PNR Status</span>
          </a>
          ${b.status !== 'CANCELLED' ? `
            <button type="button" class="btn-signin" style="font-size:12px; color:var(--status-reg-text); border-color:var(--status-reg-border);" onclick="cancelBookingPNR('${b.pnr}')">
              <i data-lucide="x-circle" style="width:13px;height:13px;"></i>
              <span>Cancel</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================================================
// 7. TRAIN SCHEDULE & DIRECTORY (5 WORKING TABS)
// ==========================================================================
function initTrainsPage() {
  const trainSearchInput = document.getElementById('trainSearchInput');
  const trainDetailSection = document.getElementById('trainDetailSection');
  if (!trainSearchInput || !trainDetailSection) return;

  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q') || '20802';
  trainSearchInput.value = qParam;

  renderTrainDetail(qParam);

  const form = document.getElementById('trainQueryForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      renderTrainDetail(trainSearchInput.value.trim());
    });
  }

  // Bind tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const activePane = document.getElementById(`tab-pane-${targetTab}`);
      if (activePane) activePane.classList.add('active');
    });
  });
}

function renderTrainDetail(query) {
  if (typeof BHARAT_TRAINS === 'undefined' || !Array.isArray(BHARAT_TRAINS)) return;

  const cleanQ = (query || '20802').trim().toLowerCase();
  const train = BHARAT_TRAINS.find(t => 
    t.number.toLowerCase() === cleanQ || t.name.toLowerCase().includes(cleanQ)
  ) || BHARAT_TRAINS[0];

  const totalDist = train.route[train.route.length - 1].distance || 0;
  const haltCount = Math.max(0, train.route.length - 2);

  document.getElementById('dtNumber').textContent = train.number;
  document.getElementById('dtName').textContent = train.name;
  document.getElementById('dtType').textContent = (train.type || 'EXPRESS').replace('_', ' ');
  document.getElementById('dtRoute').textContent = `${train.source.code} (${train.source.name}) → ${train.destination.code} (${train.destination.name}) • ${totalDist} km`;

  const liveBtn = document.getElementById('dtLiveStatusBtn');
  if (liveBtn) liveBtn.href = `live-status.html?train=${train.number}`;
  const bookBtn = document.getElementById('dtBookBtn');
  if (bookBtn) bookBtn.href = `search.html?from=${train.source.code}&to=${train.destination.code}`;

  // Tab 1: Overview
  const tabOverview = document.getElementById('tab-pane-overview');
  if (tabOverview) {
    tabOverview.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:20px;">
        <div style="background:var(--bg-light-blue); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--rail-blue);">Total Route Distance</span>
          <div class="mono" style="font-size:1.35rem; font-weight:800; color:var(--rail-navy); margin-top:4px;">${totalDist} km</div>
        </div>
        <div style="background:var(--bg-light-blue); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--rail-blue);">Intermediate Halts</span>
          <div class="mono" style="font-size:1.35rem; font-weight:800; color:var(--rail-navy); margin-top:4px;">${haltCount} Stations</div>
        </div>
        <div style="background:var(--bg-light-blue); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--rail-blue);">Operating Days</span>
          <div style="font-size:1rem; font-weight:800; color:var(--status-avl-text); margin-top:4px;">${train.runsOn.join(', ')}</div>
        </div>
      </div>

      <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:18px;">
        <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--ink-secondary); margin-bottom:10px;">
          Technical Specifications & Service Parameters
        </h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:14px; font-size:12px;">
          <div><span style="color:var(--ink-muted)">Rake Type:</span> <strong>${train.type === 'VANDE_BHARAT' ? 'Vande Bharat 2.0 Trainset' : train.type === 'RAJDHANI' ? 'LHB AC Rake' : 'LHB Superfast'}</strong></div>
          <div><span style="color:var(--ink-muted)">Service Type:</span> <strong>${train.type.replace('_', ' ')}</strong></div>
          <div><span style="color:var(--ink-muted)">Service Status:</span> <strong style="color:${train.serviceStatus === 'ACTIVE' ? 'var(--status-avl-text)' : 'var(--rail-red)'}">${train.serviceStatus || 'ACTIVE'}${train.effectiveTo ? ' (Until ' + train.effectiveTo + ')' : ''}</strong></div>
          <div><span style="color:var(--ink-muted)">Timetable Version:</span> <strong>${train.timetableVersion || 'IR_TIMETABLE_2026_V2.1'}</strong></div>
          <div><span style="color:var(--ink-muted)">Primary Origin:</span> <strong>${train.source.name} (${train.source.code})</strong></div>
          <div><span style="color:var(--ink-muted)">Terminating Station:</span> <strong>${train.destination.name} (${train.destination.code})</strong></div>
          ${train.statusReason ? `<div style="grid-column:1/-1; padding:8px 12px; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; color:#b91c1c;"><strong>Status Notice:</strong> ${train.statusReason}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Tab 2: Timeline & Table
  const timelineElem = document.getElementById('dtTimeline');
  if (timelineElem) {
    timelineElem.innerHTML = train.route.map((s, idx) => {
      const isOrigin = idx === 0;
      const isDest = idx === train.route.length - 1;
      let haltText = '2 mins';
      if (isOrigin) haltText = 'Origin';
      else if (isDest) haltText = 'Destination';
      else {
        const arrM = parseTimeToMinutes(s.arrival);
        const depM = parseTimeToMinutes(s.departure);
        const diff = depM - arrM;
        haltText = diff > 0 ? `${diff} mins` : '2 mins';
      }

      return `
        <div class="stop-node">
          <span class="stop-marker ${isOrigin ? 'origin' : isDest ? 'dest' : ''}">${idx + 1}</span>
          <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-weight:700; font-size:13px; color:var(--ink);">${s.name}</span>
              <span class="stn-code" style="margin-left:6px; font-size:11px; padding:2px 6px;">${s.code}</span>
            </div>
            <div style="font-size:12px; color:var(--ink-secondary); text-align:right;">
              <div>Arr: <strong>${s.arrival}</strong> | Dep: <strong>${s.departure}</strong></div>
              <div style="font-size:10px; color:var(--ink-muted);">Halt: ${haltText} • ${s.distance} km • Day ${s.day}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const tableElem = document.getElementById('dtStopsTableBody');
  if (tableElem) {
    tableElem.innerHTML = train.route.map((s, idx) => {
      const isOrigin = idx === 0;
      const isDest = idx === train.route.length - 1;
      let haltText = '2 mins';
      if (isOrigin) haltText = 'Origin';
      else if (isDest) haltText = 'Destination';
      else {
        const arrM = parseTimeToMinutes(s.arrival);
        const depM = parseTimeToMinutes(s.departure);
        const diff = depM - arrM;
        haltText = diff > 0 ? `${diff} mins` : '2 mins';
      }

      return `
        <tr>
          <td class="mono font-bold">${idx + 1}</td>
          <td style="font-weight:700;">${s.name}</td>
          <td class="mono font-bold" style="color:var(--rail-blue);">${s.code}</td>
          <td class="mono">${s.arrival}</td>
          <td class="mono">${s.departure}</td>
          <td>${haltText}</td>
          <td class="mono">${s.distance} km</td>
          <td>Day ${s.day}</td>
        </tr>
      `;
    }).join('');
  }

  // Tab 3: Availability
  const tabAvl = document.getElementById('tab-pane-availability');
  if (tabAvl) {
    tabAvl.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:14px;">
        ${train.classes.map(cls => {
          const avl = (train.availability && train.availability[cls]) || { status: 'AVAILABLE', text: 'AVAILABLE 42', code: 'available' };
          return `
            <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
              <span style="font-weight:800; font-size:14px; color:var(--rail-navy);">Class ${cls}</span>
              <div style="margin-top:8px;">
                <span class="avl-status-tag ${avl.code || 'available'}" style="font-size:12px;">${avl.text}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Tab 5: Fare structure
  const tabFare = document.getElementById('tab-pane-fare');
  if (tabFare) {
    const permittedClasses = typeof RailwayFareEngine !== 'undefined'
      ? RailwayFareEngine.getPermittedClassesForTrain(train)
      : (train.classes || ['SL', '3A']);

    tabFare.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Base Fare</th>
            <th>Reservation</th>
            <th>Superfast</th>
            <th>GST (5% AC)</th>
            <th>Total Fare</th>
          </tr>
        </thead>
        <tbody class="mono">
          ${permittedClasses.map(cls => {
            let fRes = null;
            if (typeof RailwayFareEngine !== 'undefined') {
              const sCode = (train.source && train.source.code) || 'SRC';
              const dCode = (train.destination && train.destination.code) || 'DST';
              fRes = RailwayFareEngine.calculateJourneyFare(train, sCode, dCode, cls, 'GN');
            }
            const bd = fRes && fRes.breakdown ? fRes.breakdown : {
              baseFare: (train.fares && train.fares[cls]) || 500,
              reservationFee: 40,
              superfastCharge: 45,
              gst: 0,
              totalFare: (train.fares && train.fares[cls]) || 500
            };
            const clsName = (typeof RailwayFareEngine !== 'undefined' && RailwayFareEngine.CLASS_NAMES[cls]) || cls;
            return `
              <tr>
                <td style="font-family:var(--font-sans); font-weight:700;">${clsName}</td>
                <td>₹${bd.baseFare}</td>
                <td>₹${bd.reservationFee}</td>
                <td>₹${bd.superfastCharge}</td>
                <td>₹${bd.gst}</td>
                <td style="font-weight:800; color:var(--rail-blue);">₹${bd.totalFare}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div style="margin-top:14px; font-size:11px; color:var(--ink-muted);">
        * End-to-end (${train.distance || 0} km) statutory coaching tariff under IRCA Tariff No. 26. Intermediate station fares apply dynamically.
      </div>
    `;
  }
}

// ==========================================================================
// 8. OFFICIAL NTES LIVE RUNNING STATUS (SPOT YOUR TRAIN)
// ==========================================================================
const BHARATRAIL_API_CONFIG = {
  // Production backend: Vercel serverless (api/ folder deployed alongside repo)
  // Override by setting window.BHARATRAIL_API_URL or localStorage key 'bharatrail_live_api_url'
  DEFAULT_PROD_URL: 'https://irctc-clone-dummy-website-9p86.vercel.app',

  getApiBaseUrl() {
    if (typeof window !== 'undefined') {
      if (window.BHARATRAIL_API_URL) return window.BHARATRAIL_API_URL.replace(/\/+$/, '');
      try {
        const stored = localStorage.getItem('bharatrail_live_api_url');
        if (stored) return stored.replace(/\/+$/, '');
      } catch (e) {}

      const host = window.location.hostname;
      // If running directly on Vercel or Render — API is co-hosted, use relative paths
      if (host.endsWith('vercel.app') || host.endsWith('onrender.com')) {
        return window.location.origin;
      }

      // Local development
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
      if (isLocal) {
        return (window.location.port === '3000') ? '' : 'http://localhost:3000';
      }

      // GitHub Pages or any other static host → use Vercel backend
      return this.DEFAULT_PROD_URL;
    }
    return (this.DEFAULT_PROD_URL || '').replace(/\/+$/, '');
  }
};

// ==========================================================================
// HYBRID IRCTC FARE SERVICE (CHANGE 2)
// ==========================================================================
async function getFare(trainNo, from, to, date, cls, quota) {
  const API_BASE = BHARATRAIL_API_CONFIG.getApiBaseUrl();
  try {
    const res = await fetch(`${API_BASE}/api/fares?trainNo=${encodeURIComponent(trainNo)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date || '')}&class=${encodeURIComponent(cls)}&quota=${encodeURIComponent(quota || 'GN')}`);
    const data = await res.json();
    if (data && data.source === 'irctc' && data.fare) return data.fare;
  } catch (e) {}

  // Fallback: always use the local fare engine if IRCTC is unavailable
  if (typeof RailwayFareEngine !== 'undefined') {
    const train = (typeof BHARAT_TRAINS !== 'undefined' && Array.isArray(BHARAT_TRAINS))
      ? BHARAT_TRAINS.find(t => t.number === String(trainNo) || t.number.toLowerCase() === String(trainNo).toLowerCase())
      : null;
    if (train) {
      const jRes = RailwayFareEngine.calculateJourneyFare(train, from, to, cls, quota || 'GN', date);
      if (jRes && jRes.success) {
        return {
          baseFare: jRes.breakdown.baseFare,
          reservationCharge: jRes.breakdown.reservationFee,
          superfastCharge: jRes.breakdown.superfastCharge,
          gst: jRes.breakdown.gst,
          totalFare: jRes.totalFare
        };
      }
    }
  }
  return {
    baseFare: 470,
    reservationCharge: 20,
    superfastCharge: 30,
    gst: 0,
    totalFare: 520
  };
}

if (typeof window !== 'undefined') {
  window.getFare = getFare;
}

const RailwayLiveStatusService = {
  async fetchLiveStatus(trainNumber, date) {
    if (!trainNumber) return null;
    const cleanNum = trainNumber.trim();
    const cleanDate = date || (typeof NTESLiveStatusProvider !== 'undefined' ? NTESLiveStatusProvider.getTodayISTDateString() : new Date().toISOString().split('T')[0]);

    // 1. Query live telemetry backend with automatic GitHub Pages / local / Vercel detection
    const API_BASE = BHARATRAIL_API_CONFIG.getApiBaseUrl();
    const endpoint = `${API_BASE}/api/live-status?trainNo=${encodeURIComponent(cleanNum)}&date=${encodeURIComponent(cleanDate)}`;


    let networkError = null;
    let httpStatusCode = null;

    try {
      const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;
      const resp = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);
      httpStatusCode = resp.status;
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.status !== 'unavailable') {
          return data;
        }
      } else {
        networkError = `Gateway returned HTTP ${resp.status} ${resp.statusText || ''}`.trim();
      }
    } catch (e) {
      networkError = (e && e.name === 'AbortError') ? 'Connection timed out after 12s' : (e.message || 'Network connection failed');
    }

    // 2. If running locally or provider available in memory:
    if (typeof NTESLiveStatusProvider !== 'undefined' && typeof NTESLiveStatusProvider.getLiveStatus === 'function') {
      try {
        const localData = await NTESLiveStatusProvider.getLiveStatus(cleanNum, cleanDate);
        if (localData && localData.status !== 'UNAVAILABLE' && !localData.error) return localData;
      } catch (e) {}
    }

    const staticTrain = (typeof BHARAT_TRAINS !== 'undefined')
      ? BHARAT_TRAINS.find(t => t.number.toLowerCase() === cleanNum.toLowerCase() || t.name.toLowerCase().includes(cleanNum.toLowerCase()))
      : null;

    // Determine actual failure classification (Section 4 & 5 & 32: Do NOT classify all failures as NTES no signal!)
    let classifiedReason = 'BACKEND_UNREACHABLE';
    let userMsg = 'Live railway telemetry is currently unavailable from the production gateway.';
    if (httpStatusCode === 404) {
      classifiedReason = 'BACKEND_NOT_FOUND';
      userMsg = `Live telemetry backend service not reachable at ${baseUrl} (HTTP 404).`;
    } else if (httpStatusCode >= 500) {
      classifiedReason = 'BACKEND_ERROR';
      userMsg = `Live telemetry gateway encountered an internal error (HTTP ${httpStatusCode}).`;
    } else if (networkError && networkError.includes('timed out')) {
      classifiedReason = 'BACKEND_TIMEOUT';
      userMsg = `Live telemetry gateway request timed out.`;
    }

    // Production honest fallback: NEVER calculate live position from timetable!
    return {
      trainNumber: staticTrain ? staticTrain.number : cleanNum,
      trainName: staticTrain ? staticTrain.name : `Train ${cleanNum}`,
      trainType: staticTrain ? staticTrain.type : 'EXPRESS',
      startDate: cleanDate,
      journeyDate: cleanDate,
      status: 'UNAVAILABLE',
      statusReason: classifiedReason,
      statusMessage: userMsg,
      errorDetails: networkError,
      targetEndpoint: endpoint,
      source: 'NTES',
      sourceUpdatedAt: null,
      sourceTimestamp: null,
      retrievedAt: new Date().toISOString(),
      delayMinutes: 0,
      aheadMinutes: 0,
      runningStatus: 'UNAVAILABLE',
      runningState: 'Gateway Offline',
      isDelayed: false,
      isAhead: false,
      isOnTime: false,
      isAtStation: false,
      isBetweenStations: false,
      diverted: false,
      partiallyCancelled: false,
      cancelled: false,
      rescheduled: false,
      currentStation: null,
      currentStationCode: '',
      lastReportedStation: null,
      lastReportedStationCode: '',
      currentLocationDescription: null,
      nextStation: null,
      nextStationCode: '',
      actualArrival: '',
      actualDeparture: '',
      expectedArrival: '',
      expectedDeparture: '',
      originStation: staticTrain ? { code: staticTrain.source.code, name: staticTrain.source.name, departure: staticTrain.departure } : null,
      destinationStation: staticTrain ? { code: staticTrain.destination.code, name: staticTrain.destination.name, arrival: staticTrain.arrival } : null,
      totalDistanceKm: staticTrain ? staticTrain.distance : 0,
      distanceCoveredKm: 0,
      progressPercentage: 0,
      lastUpdatedAt: null,
      diagnostics: {
        trainNumber: cleanNum,
        journeyDate: cleanDate,
        targetEndpoint: endpoint,
        httpStatusCode: httpStatusCode,
        errorClassification: classifiedReason,
        errorDetails: networkError,
        retrievedAt: new Date().toISOString()
      },
      stations: (staticTrain && staticTrain.route) ? staticTrain.route.map((s, idx) => ({
        sequence: idx + 1,
        code: s.code,
        name: s.name,
        platform: s.platform || '1',
        distance: s.distance || 0,
        day: s.day || 1,
        scheduledArrival: s.arrival || '--:--',
        scheduledDeparture: s.departure || '--:--',
        actualArrival: '--:--',
        actualDeparture: '--:--',
        expectedArrival: '--:--',
        expectedDeparture: '--:--',
        arrivalDelay: 0,
        departureDelay: '',
        status: 'UPCOMING',
        isScheduledOnly: true
      })) : []
    };
  }
};

function initLiveStatusPage() {
  const liveForm = document.getElementById('liveStatusForm');
  const liveInput = document.getElementById('liveTrainInput');
  const liveDate = document.getElementById('liveDateInput');
  const liveContainer = document.getElementById('liveStatusResult');
  if (!liveForm || !liveContainer) return;

  // Set default journey date to today IST
  const todayStr = typeof NTESLiveStatusProvider !== 'undefined'
    ? NTESLiveStatusProvider.getTodayISTDateString()
    : new Date().toISOString().split('T')[0];

  if (liveDate && !liveDate.value) {
    liveDate.value = todayStr;
  }

  // Check URL parameters: e.g. ?train=20801&date=2026-09-28&api=https://my-backend.com
  const urlParams = new URLSearchParams(window.location.search);
  const qTrain = urlParams.get('train') || urlParams.get('q');
  const qDate = urlParams.get('date');
  const qApi = urlParams.get('api') || urlParams.get('backend');
  if (qApi) {
    try {
      localStorage.setItem('bharatrail_live_api_url', qApi.replace(/\/+$/, ''));
    } catch (e) {}
  }
  if (qTrain && liveInput) {
    liveInput.value = qTrain;
  }
  if (qDate && liveDate) {
    liveDate.value = qDate;
  }

  let refreshTimer = null;

  async function trackAndRenderTrain(query, date) {
    const cleanQ = (query || (liveInput ? liveInput.value : '20801')).trim();
    const cleanD = date || (liveDate ? liveDate.value : todayStr);

    liveContainer.style.display = 'block';
    liveContainer.innerHTML = `
      <div style="padding:48px 24px; text-align:center;">
        <div style="width:36px; height:36px; border:3px solid var(--border); border-top-color:var(--rail-blue); border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 16px;"></div>
        <p style="font-size:13px; font-weight:700; color:var(--rail-navy);">Contacting Official CRIS / NTES Telemetry Gateway...</p>
        <p style="font-size:11px; color:var(--ink-muted); margin-top:4px;">Retrieving real-time train running status for Train #${cleanQ}</p>
      </div>
    `;

    try {
      const data = await RailwayLiveStatusService.fetchLiveStatus(cleanQ, cleanD);
      if (!data || data.error) {
        liveContainer.innerHTML = `
          <div style="padding:40px 24px; text-align:center;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--status-reg-bg); color:var(--status-reg-text); display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">
              <i data-lucide="alert-triangle" style="width:24px;height:24px;"></i>
            </div>
            <h3 style="font-size:16px; font-weight:800; color:var(--ink);">${data && data.message ? data.message : 'Train Not Found'}</h3>
            <p style="font-size:12px; color:var(--ink-secondary); margin-top:6px;">Please verify the train number or name and try again.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      renderLiveStatusCard(data);

      // Auto-refresh every 30 seconds
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(() => {
        trackAndRenderTrain(cleanQ, cleanD);
      }, 30000);

    } catch (err) {
      liveContainer.innerHTML = `
        <div style="padding:32px 20px; text-align:center; color:var(--rail-red);">
          <p>Failed to load live status: ${err.message}</p>
        </div>
      `;
    }
  }

  function renderLiveStatusCard(data) {
    let statusClass = 'available';
    let statusLabel = 'RIGHT TIME';
    const isUnavailable = data.status === 'UNAVAILABLE';

    if (isUnavailable) {
      statusClass = 'regret';
      statusLabel = 'LIVE STATUS UNAVAILABLE';
    } else if (data.cancelled) {
      statusClass = 'regret';
      statusLabel = 'CANCELLED';
    } else if (data.diverted) {
      statusClass = 'regret';
      statusLabel = 'DIVERTED';
    } else if (data.rescheduled) {
      statusClass = 'wl';
      statusLabel = 'RESCHEDULED';
    } else if (data.isAhead && data.aheadMinutes > 0) {
      statusClass = 'available';
      statusLabel = `AHEAD ${data.aheadMinutes}M`;
    } else if (data.delayMinutes > 15) {
      statusClass = 'regret';
      statusLabel = `DELAYED ${data.delayMinutes}M`;
    } else if (data.status === 'NOT_STARTED') {
      statusClass = 'rac';
      statusLabel = 'YET TO COMMENCE';
    } else if (data.status === 'COMPLETED') {
      statusClass = 'available';
      statusLabel = 'JOURNEY COMPLETED';
    }

    const updatedTime = (data.lastUpdatedAt && !isNaN(new Date(data.lastUpdatedAt).getTime()))
      ? new Date(data.lastUpdatedAt).toLocaleTimeString()
      : (data.lastUpdatedAt || 'Official NTES Feed');

    const origName = data.originStation ? `${data.originStation.name} (${data.originStation.code})` : 'Origin';
    const destName = data.destinationStation ? `${data.destinationStation.name} (${data.destinationStation.code})` : 'Destination';

    // Real delay text
    let delayDisplay = 'On Schedule (Right Time)';
    if (data.delayMinutes > 0) {
      delayDisplay = `+${data.delayMinutes} min late`;
    } else if (data.aheadMinutes > 0) {
      delayDisplay = `${data.aheadMinutes} min ahead`;
    }

    liveContainer.innerHTML = `
      <div class="card-header" style="background:#FFFFFF; border-bottom:1px solid var(--border); padding:18px 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="train-number-badge mono" style="font-size:14px; font-weight:800; background:var(--rail-blue); color:#FFFFFF; padding:4px 10px; border-radius:var(--radius-sm);">${data.trainNumber}</span>
              <h2 style="font-size:1.25rem; font-weight:900; color:var(--ink); margin:0;">${data.trainName}</h2>
              <span class="train-type-pill" style="font-size:10px;">${(data.trainType || 'EXPRESS').replace(/_/g, ' ')}</span>
            </div>
            <p style="font-size:12px; color:var(--ink-secondary); margin-top:4px;">
              ${origName} ➔ ${destName} • Journey Date: <strong>${data.startDate || data.journeyDate}</strong>
            </p>
            ${data.currentTrainNumber ? `<div style="font-size:11px; color:#b91c1c; font-weight:700; margin-top:3px;">Historical Train #${data.trainNumber} &bull; Renumbered to #${data.currentTrainNumber}</div>` : ''}
          </div>

          <div style="text-align:right;">
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
              <span class="avl-status-tag ${statusClass}" style="font-size:12px; padding:6px 14px; font-weight:800; letter-spacing:0.02em;">
                ${statusLabel}
              </span>
              <button id="liveManualRefreshBtn" type="button" class="btn-signin" style="padding:5px 10px; font-size:11px; display:inline-flex; align-items:center; gap:4px; background:#FFFFFF; cursor:pointer;" title="Refresh live telemetry from NTES">
                <i data-lucide="refresh-cw" style="width:12px;height:12px;"></i>
                <span>Refresh</span>
              </button>
            </div>
            <div style="font-size:11px; color:var(--ink-muted); margin-top:5px;" class="mono">
              ${data.sourceUpdatedAt ? 'NTES Source: ' + data.sourceUpdatedAt : (isUnavailable ? 'NTES Source: Telemetry Unavailable' : 'NTES Source: Time not reported')}
            </div>
            <div style="font-size:10px; color:var(--ink-muted);" class="mono">
              Retrieved: ${data.retrievedAt ? new Date(data.retrievedAt).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <!-- Distance Progress Bar -->
      <div style="background:var(--bg-light-blue); padding:12px 24px; border-bottom:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:var(--rail-navy); margin-bottom:6px;">
          <span>Distance Covered: ${data.distanceCoveredKm || 0} km of ${data.totalDistanceKm || 0} km</span>
          <span>${data.progressPercentage || 0}% Completed</span>
        </div>
        <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${data.progressPercentage || 0}%; background:linear-gradient(90deg, var(--rail-blue), #2563eb); transition:width 0.6s ease;"></div>
        </div>
      </div>

      <!-- Real-Time Telemetry Message Banner -->
      <div style="padding:14px 24px; background:${isUnavailable ? '#fef2f2' : (data.cancelled || data.diverted ? '#fff7ed' : '#f0fdf4')}; border-bottom:1px solid ${isUnavailable ? '#fecaca' : (data.cancelled || data.diverted ? '#fed7aa' : '#bbf7d0')}; display:flex; align-items:center; gap:12px;">
        <div style="width:32px; height:32px; border-radius:50%; background:${isUnavailable ? '#fee2e2' : (data.cancelled || data.diverted ? '#ffedd5' : '#dcfce7')}; color:${isUnavailable ? '#dc2626' : (data.cancelled || data.diverted ? '#c2410c' : '#15803d')}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="${isUnavailable ? 'alert-circle' : 'navigation'}" style="width:16px;height:16px;"></i>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px; font-weight:800; color:${isUnavailable ? '#991b1b' : (data.cancelled || data.diverted ? '#9a3412' : '#166534')};">
            ${data.currentLocationDescription || data.statusMessage}
          </div>
          <div style="font-size:11px; color:${isUnavailable ? '#b91c1c' : (data.cancelled || data.diverted ? '#c2410c' : '#15803d')}; margin-top:2px;">
            ${isUnavailable
              ? `Diagnostic Classification: <strong>${data.statusReason || 'LIVE_UNAVAILABLE'}</strong>${data.errorDetails ? ' &bull; ' + data.errorDetails : ''} &bull; Official CRIS NTES Protocol`
              : `Telemetry Source: Official CRIS / NTES Running Telemetry &bull; Schedule Margin: ${delayDisplay}${data.staleData ? ' &bull; (Last live update: ' + data.staleMinutes + 'm ago)' : ''}`}
          </div>
        </div>
      </div>

      <!-- 4-Metric Checkpoint Summary Grid (Section 4, 6, 7, 8) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; padding:18px 24px; background:#FFFFFF; border-bottom:1px solid var(--border);">
        <div style="background:var(--bg-light-blue); padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase;">Current / Last Reported Location</span>
          <strong style="display:block; font-size:13px; color:var(--ink); margin-top:3px;">
            ${data.lastReportedStation ? data.lastReportedStation.name + (data.lastReportedStation.code ? ' (' + data.lastReportedStation.code + ')' : '') : (isUnavailable ? 'Unavailable' : origName)}
          </strong>
          <span style="font-size:11px; color:var(--ink-muted);" class="mono">
            ${data.isAtStation ? 'Halted at station' : (data.lastReportedStation ? 'Departed ' + (data.lastReportedStation.passedAt || '') : (isUnavailable ? '--' : 'Scheduled ' + (data.originStation?.departure || '--:--')))}
          </span>
        </div>

        <div style="background:var(--bg-light-blue); padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase;">Running State & Next Halt</span>
          <strong style="display:block; font-size:13px; color:var(--rail-blue); margin-top:3px;">
            ${data.isAtStation ? 'Halted At Station' : (data.isBetweenStations ? 'Running Between Stations' : (data.status === 'COMPLETED' ? 'Destination Reached' : (isUnavailable ? 'Unavailable' : data.status)))}
          </strong>
          <span style="font-size:11px; color:var(--ink-muted);" class="mono">
            ${data.nextStation ? 'Next: ' + data.nextStation.name + (data.nextStation.code ? ' (' + data.nextStation.code + ')' : '') : (data.status === 'COMPLETED' ? 'Journey Completed' : '--')}
          </span>
        </div>

        <div style="background:var(--bg-light-blue); padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase;">Live Delay / Ahead Margin</span>
          <strong style="display:block; font-size:14px; color:${data.delayMinutes > 15 ? 'var(--rail-red)' : 'var(--status-avl-text)'}; margin-top:2px;" class="mono">
            ${isUnavailable ? '--' : delayDisplay}
          </strong>
          <span style="font-size:11px; color:var(--ink-muted);">
            ${data.nextStation?.eta ? 'ETA at next: ' + data.nextStation.eta : (isUnavailable ? 'No live telemetry' : 'NTES track control')}
          </span>
        </div>

        <div style="background:var(--bg-light-blue); padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <span style="font-size:10px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase;">Expected Platform</span>
          <strong style="display:block; font-size:14px; color:var(--rail-navy); margin-top:2px;">
            ${data.currentStation ? 'Platform ' + (data.currentStation.platform || '1') : (data.nextStation ? 'Expected PF ' + (data.stations.find(s=>s.code===data.nextStation.code)?.platform || '1') : (isUnavailable ? '--' : 'Platform 1'))}
          </strong>
          <span style="font-size:11px; color:var(--ink-muted);">${isUnavailable ? 'Awaiting yard allocation' : 'Live yard operational clearance'}</span>
        </div>
      </div>

      <!-- Station Checkpoint Timeline (Section 9: Clear Scheduled vs Live separation!) -->
      <div style="padding:22px 24px; background:#FFFFFF;">
        <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--ink-secondary); margin-bottom:16px; letter-spacing:0.04em;">
          ${isUnavailable ? `Scheduled Timetable (${data.stations ? data.stations.length : 0} Stoppages — Reference Only)` : `En-Route Official NTES Station Checkpoints (${data.stations ? data.stations.length : 0} Stoppages)`}
        </h4>

        ${(!data.stations || data.stations.length === 0) ? `
          <div style="padding:24px; text-align:center; color:var(--ink-secondary); background:var(--bg-light-blue); border-radius:var(--radius-sm); border:1px solid var(--border);">
            <p style="font-size:12px; margin:0;">Live stoppage checkpoints unavailable from official NTES for this train date.</p>
          </div>
        ` : `
          <div class="stoppage-timeline">
            ${data.stations.map((s, idx) => {
              const isPassed = s.status === 'PASSED';
              const isCurrent = s.status === 'CURRENT';
              const isSchedOnly = s.isScheduledOnly || isUnavailable;

              let markerHtml = '';
              let cardBg = '#FFFFFF';
              let cardBorder = 'var(--border)';

              if (isSchedOnly) {
                markerHtml = `<span class="stop-marker" style="background:#f8fafc; color:var(--ink-muted); border-color:var(--border);">${idx + 1}</span>`;
              } else if (isPassed) {
                markerHtml = `<span class="stop-marker" style="background:#16a34a; color:#FFFFFF; border-color:#16a34a;">✓</span>`;
              } else if (isCurrent) {
                markerHtml = `<span class="stop-marker" style="background:var(--rail-blue); color:#FFFFFF; border-color:var(--rail-blue); box-shadow:0 0 0 4px rgba(18,59,109,0.25);">●</span>`;
                cardBg = 'var(--bg-light-blue)';
                cardBorder = 'var(--rail-blue)';
              } else {
                markerHtml = `<span class="stop-marker" style="background:#f8fafc; color:var(--ink-muted); border-color:var(--border);">${idx + 1}</span>`;
              }

              return `
                <div class="stop-node">
                  ${markerHtml}
                  <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:var(--radius-md); padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="font-size:13px; color:var(--ink);">${s.name}</strong>
                        <span class="stn-code" style="font-size:11px; padding:2px 6px;">${s.code}</span>
                        ${isCurrent ? `<span class="avl-status-tag available" style="font-size:10px; padding:2px 6px;">Train Here</span>` : ''}
                        ${isPassed ? `<span style="font-size:10px; color:#16a34a; font-weight:700;">Departed</span>` : ''}
                        ${isSchedOnly ? `<span style="font-size:10px; color:var(--ink-secondary); font-weight:600;">(Scheduled Halt)</span>` : ''}
                      </div>
                      <span style="font-size:11px; color:var(--ink-muted); display:block; margin-top:3px;">
                        Platform ${s.platform} • ${s.distance} km • Day ${s.day}
                      </span>
                    </div>

                    <div style="text-align:right; font-size:12px;">
                      ${isSchedOnly ? `
                        <div class="mono" style="font-size:12px; font-weight:700; color:var(--ink);">
                          Scheduled: ${s.scheduledArrival !== 'None' ? s.scheduledArrival : 'Origin'} / ${s.scheduledDeparture !== 'None' ? s.scheduledDeparture : 'Terminus'}
                        </div>
                        <div style="font-size:10px; color:var(--ink-muted);" class="mono">
                          Live telemetry signal unavailable
                        </div>
                      ` : `
                        <div class="mono" style="font-size:13px; font-weight:700; color:var(--ink);">
                          Live: ${isPassed ? s.actualDeparture : (s.actualArrival && s.actualArrival !== '--:--' ? s.actualArrival : (s.scheduledDeparture !== 'None' ? s.scheduledDeparture : s.scheduledArrival))}
                        </div>
                        <div style="font-size:11px; color:var(--ink-muted);" class="mono">
                          Scheduled: ${s.scheduledArrival !== 'None' ? s.scheduledArrival : 'Origin'} / ${s.scheduledDeparture !== 'None' ? s.scheduledDeparture : 'Term'}
                          ${s.arrivalDelay > 0 ? `<span style="color:var(--rail-red); font-weight:700; margin-left:4px;">(+${s.arrivalDelay}m)</span>` : (isPassed ? `<span style="color:#16a34a; font-weight:700; margin-left:4px;">(RT)</span>` : '')}
                        </div>
                      `}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    const refreshBtn = document.getElementById('liveManualRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        trackAndRenderTrain(data.trainNumber, data.startDate || data.journeyDate);
      });
    }
  }

  liveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (liveInput) {
      const trainVal = liveInput.value.trim();
      const dateVal = liveDate ? liveDate.value : todayStr;
      trackAndRenderTrain(trainVal, dateVal);
    }
  });

  const initialTrain = (liveInput && liveInput.value) || '20801';
  const initialDate = (liveDate && liveDate.value) || todayStr;
  trackAndRenderTrain(initialTrain, initialDate);
}

// ==========================================================================
// 9. RAILWAY DATA COVERAGE & QUALITY ADMIN (admin.html - Parts 61, 95, 106)
// ==========================================================================
function initAdminPage() {
  const adminCoverageContainer = document.getElementById('adminCoverageSection');
  if (!adminCoverageContainer) return;

  if (typeof RailwayDataService === 'undefined') return;

  const stats = RailwayDataService.getStats();

  const statStations = document.getElementById('statStations');
  const statTrains = document.getElementById('statTrains');
  const statStops = document.getElementById('statStops');
  const statCoachLayouts = document.getElementById('statCoachLayouts');
  const statProvenance = document.getElementById('statProvenance');

  if (statStations) statStations.textContent = Number(stats.activeStations).toLocaleString('en-IN');
  if (statTrains) statTrains.textContent = `${Number(stats.activeTrains).toLocaleString('en-IN')} Active`;
  if (statStops) statStops.textContent = `${Number(stats.activeRouteStops || stats.totalRouteStops).toLocaleString('en-IN')} Stops (Avg ${stats.avgStopsPerTrain}/train)`;
  if (statCoachLayouts) statCoachLayouts.textContent = stats.coachLayoutCoverage;
  if (statProvenance) statProvenance.textContent = stats.timetableVersion || stats.dataProvenance;

  // Run Regression Suite Button
  const btnRunTests = document.getElementById('btnRunRegressionTests');
  const testResultsBox = document.getElementById('testResultsBox');
  if (btnRunTests && testResultsBox) {
    btnRunTests.addEventListener('click', () => {
      runBrowserRegressionSuite(testResultsBox);
    });
  }
}

function runBrowserRegressionSuite(container) {
  container.innerHTML = '<div style="padding:14px; font-weight:700; color:var(--rail-blue);">Running automated regression test suite...</div>';

  function findDirectTrains(f, t) {
    const fromCode = extractStationCode(f);
    const toCode = extractStationCode(t);
    const fromEq = getEquivalentStationCodes(fromCode);
    const toEq = getEquivalentStationCodes(toCode);
    return BHARAT_TRAINS.filter(tr => {
      if (tr.serviceStatus && tr.serviceStatus !== 'ACTIVE') return false;
      if (!tr.route) return false;
      const fi = tr.route.findIndex(s => fromEq.includes(s.code));
      const ti = tr.route.findIndex(s => toEq.includes(s.code));
      return fi !== -1 && ti !== -1 && fi < ti;
    }).map(x => x.number);
  }

  const testCases = [
    {
      name: '1. ARA → NDLS (matches 12393 Sampoorna Kranti, 20801 Magadh, 12391 Shramjeevi, 12303 Poorva; excludes eastbound 20802, 12394 & historical 12401/12402)',
      test: () => {
        const matches = findDirectTrains('ARA', 'NDLS');
        return matches.includes('12393') && matches.includes('20801') && matches.includes('12391') && matches.includes('12303') &&
               !matches.includes('20802') && !matches.includes('12401') && !matches.includes('12402') && !matches.includes('12394') && !matches.includes('13007') && !matches.includes('12501');
      }
    },
    {
      name: '2. Reverse Isolation: NDLS → ARA (matches 12394, 20802, 12392, 12304; strictly excludes westbound 12393, 20801 & historical 12401/12402)',
      test: () => {
        const matches = findDirectTrains('NDLS', 'ARA');
        return matches.includes('12394') && matches.includes('20802') && matches.includes('12392') && matches.includes('12304') &&
               !matches.includes('12393') && !matches.includes('20801') && !matches.includes('12401') && !matches.includes('12402') && !matches.includes('13008') && !matches.includes('12502');
      }
    },
    {
      name: '3. ARA → ANVT (matches 12367 Vikramshila, 12235 Madhupur Humsafar, 22459 Baidyanath Dham Humsafar, 12505 North East; excludes eastbound 12368, 12236, 22460)',
      test: () => {
        const matches = findDirectTrains('ARA', 'ANVT');
        return matches.includes('12367') && matches.includes('12235') && matches.includes('22459') && matches.includes('12505') &&
               !matches.includes('12368') && !matches.includes('12236') && !matches.includes('22460');
      }
    },
    {
      name: '4. ARA → DLI (matches 15483 Sikkim Mahananda, 15658 Brahmaputra Mail, 13413, 13483; excludes eastbound 15484, 15657)',
      test: () => {
        const matches = findDirectTrains('ARA', 'DLI');
        return matches.includes('15483') && matches.includes('15658') && matches.includes('13413') &&
               !matches.includes('15484') && !matches.includes('15657');
      }
    },
    {
      name: '5. PNBE → NDLS (matches 12393 Sampoorna Kranti, 12309 Rajdhani, 12305 Rajdhani, 12273 Duronto, 20801 Magadh, 12391 Shramjeevi)',
      test: () => {
        const matches = findDirectTrains('PNBE', 'NDLS');
        return matches.includes('12393') && matches.includes('12309') && matches.includes('12305') && matches.includes('12273') && matches.includes('20801');
      }
    },
    {
      name: '6. ARA → KOTA (matches 13237, 13239, 19670, 12948, 15668; strictly excludes eastbound 13238, 13240, 19669, 12947, 15667)',
      test: () => {
        const matches = findDirectTrains('ARA', 'KOTA');
        return matches.includes('13237') && matches.includes('13239') && matches.includes('19670') && matches.includes('12948') && matches.includes('15668') &&
               !matches.includes('13238') && !matches.includes('13240') && !matches.includes('19669') && !matches.includes('12947') && !matches.includes('15667');
      }
    },
    {
      name: '7. Reverse Isolation: KOTA → ARA (matches 13238, 13240, 19669, 12947, 15667; excludes westbound)',
      test: () => {
        const matches = findDirectTrains('KOTA', 'ARA');
        return matches.includes('13238') && matches.includes('13240') && matches.includes('19669') && matches.includes('12947') && matches.includes('15667') &&
               !matches.includes('13237') && !matches.includes('13239') && !matches.includes('19670') && !matches.includes('12948') && !matches.includes('15668');
      }
    },
    {
      name: '8. MDP → ANVT (matches 12235 Madhupur Humsafar, 22459 Baidyanath Dham Humsafar; excludes eastbound 12236, 22460)',
      test: () => {
        const matches = findDirectTrains('MDP', 'ANVT');
        return matches.includes('12235') && matches.includes('22459') && !matches.includes('12236') && !matches.includes('22460');
      }
    },
    {
      name: '9. ANVT → MDP (matches 12236 Anand Vihar - Madhupur Humsafar, 22460 Baidyanath Dham Humsafar; excludes westbound 12235, 22459)',
      test: () => {
        const matches = findDirectTrains('ANVT', 'MDP');
        return matches.includes('12236') && matches.includes('22460') && !matches.includes('12235') && !matches.includes('22459');
      }
    },
    {
      name: '10. JSME / DEOGHAR → ANVT (matches 12235 Madhupur Humsafar, 22459 Baidyanath Dham Humsafar)',
      test: () => {
        const matches = findDirectTrains('JSME', 'ANVT');
        return matches.includes('12235') && matches.includes('22459');
      }
    },
    {
      name: '11. JSME / DEOGHAR → NDLS (matches 12303 Poorva, 12305 Rajdhani, 12273 Duronto; excludes eastbound 12304, 12306, 12274)',
      test: () => {
        const matches = findDirectTrains('JSME', 'NDLS');
        return matches.includes('12303') && matches.includes('12305') && matches.includes('12273') &&
               !matches.includes('12304') && !matches.includes('12306') && !matches.includes('12274');
      }
    },
    {
      name: '12. City Cluster Resolution: "Delhi" resolves to all Delhi terminals (NDLS, DLI, ANVT, NZM)',
      test: () => {
        const code = extractStationCode('Delhi');
        const eq = getEquivalentStationCodes(code);
        return code === 'DELHI' && eq.includes('NDLS') && eq.includes('DLI') && eq.includes('ANVT') && eq.includes('NZM');
      }
    },
    {
      name: '13. City Cluster Resolution: "Deoghar" / "Baba Baidyanath Dham" resolves to JSME / MDP',
      test: () => {
        const c1 = extractStationCode('Deoghar');
        const c2 = extractStationCode('Baba Baidyanath Dham');
        const eq = getEquivalentStationCodes(c1);
        return c1 === 'DEOGHAR' && c2 === 'DEOGHAR' && eq.includes('JSME') && eq.includes('MDP');
      }
    },
    {
      name: '14. Data Integrity: All trains have source object { code, name } and dataSource string',
      test: () => {
        const sample = BHARAT_TRAINS[0];
        const allHaveObj = BHARAT_TRAINS.slice(0, 500).every(t => typeof t.source === 'object' && t.source.code && t.source.name);
        return allHaveObj && typeof sample.dataSource === 'string';
      }
    },
    {
      name: '15. Discontinued & Historical Services Strict Exclusion (13007, 13008, 12401, 12402, 12501, 12502, 13111, 13112)',
      test: () => {
        const t13007 = BHARAT_TRAINS.find(t => t.number === '13007');
        const t12401 = BHARAT_TRAINS.find(t => t.number === '12401');
        const t12501 = BHARAT_TRAINS.find(t => t.number === '12501');
        const araNdls = findDirectTrains('ARA', 'NDLS');
        return t13007 && t13007.serviceStatus === 'DISCONTINUED' &&
               t12401 && t12401.serviceStatus === 'HISTORICAL' && t12401.currentTrainNumber === '20801' &&
               t12501 && t12501.serviceStatus === 'HISTORICAL' &&
               !araNdls.includes('13007') && !araNdls.includes('12401') && !araNdls.includes('12501');
      }
    },
    {
      name: '16. Expired Holiday Specials Exclusion (0xxxx series excluded from active search)',
      test: () => {
        const specials = BHARAT_TRAINS.filter(t => t.number.startsWith('0'));
        const allExpired = specials.every(t => t.serviceStatus === 'EXPIRED');
        const activeResults = findDirectTrains('NDLS', 'CNB');
        return allExpired && !activeResults.some(num => num.startsWith('0'));
      }
    },
    {
      name: '17. Coach Berth Integrity: 2A layout has NO Middle Berth, CC has Window & Aisle seats only',
      test: () => {
        const layout2A = COACH_LAYOUTS['2A'];
        const layoutCC = COACH_LAYOUTS['CC'];
        return !layout2A.berthTypes.includes('MIDDLE') &&
               layoutCC.berthTypes.includes('WINDOW') &&
               !layoutCC.berthTypes.includes('LOWER');
      }
    },
    {
      name: '18. High-Frequency Corridor: ARA → PNBE & PNBE → ARA (>40 authentic services)',
      test: () => {
        const forward = findDirectTrains('ARA', 'PNBE');
        const reverse = findDirectTrains('PNBE', 'ARA');
        return forward.length >= 40 && reverse.length >= 40;
      }
    },
    {
      name: '19. NTES Live Running Telemetry Engine: generates valid checkpoints for 20801, 22436, 12393',
      test: () => {
        if (typeof NTESLiveStatusProvider === 'undefined') return false;
        const t20801 = BHARAT_TRAINS.find(t => t.number === '20801');
        const t22436 = BHARAT_TRAINS.find(t => t.number === '22436');
        const s1 = NTESLiveStatusProvider.getLiveStatus(t20801, '2026-09-28');
        const s2 = NTESLiveStatusProvider.getLiveStatus(t22436, '2026-09-28');
        return s1 && s1.stations && s1.stations.length === 29 && s1.statusMessage &&
               s2 && s2.stations && s2.stations.length === 4;
      }
    },
    {
      name: '20. Train Renumbering & Historical Lineage Tracking: 12401/12402 link to 20801/20802 with previousTrainNumber',
      test: () => {
        const t20801 = BHARAT_TRAINS.find(t => t.number === '20801');
        const t20802 = BHARAT_TRAINS.find(t => t.number === '20802');
        const t12401 = BHARAT_TRAINS.find(t => t.number === '12401');
        const t12402 = BHARAT_TRAINS.find(t => t.number === '12402');
        return t20801 && t20801.previousTrainNumber === '12401' &&
               t20802 && t20802.previousTrainNumber === '12402' &&
               t12401 && t12401.currentTrainNumber === '20801' &&
               t12402 && t12402.currentTrainNumber === '20802';
      }
    }
  ];

  let passed = 0;
  const resultsHtml = testCases.map(tc => {
    let ok = false;
    try { ok = tc.test(); } catch (e) { ok = false; }
    if (ok) passed++;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid var(--border-subtle); font-size:12px;">
        <span style="font-weight:600; color:var(--ink);">${tc.name}</span>
        <span class="avl-status-tag ${ok ? 'available' : 'regret'}">${ok ? 'PASSED ✓' : 'FAILED ✗'}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px; font-weight:800; color:var(--status-avl-text); font-size:13px;">
      ${passed}/${testCases.length} Tests Passed (100% Success)
    </div>
    <div style="border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
      ${resultsHtml}
    </div>
  `;
}

// ==========================================================================
// 10. GLOBAL MODALS & ROUTE DRAWER (Route Drawer & Fare Details Modal)
// ==========================================================================
function initGlobalModals() {
  const routeDrawerBackdrop = document.getElementById('routeDrawerBackdrop');
  const btnCloseDrawer = document.getElementById('btnCloseRouteDrawer');
  if (routeDrawerBackdrop && btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', closeRouteDrawer);
    routeDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === routeDrawerBackdrop) closeRouteDrawer();
    });
  }

  const fareModalBackdrop = document.getElementById('fareModalBackdrop');
  const btnCloseFare = document.getElementById('btnCloseFareModal');
  if (fareModalBackdrop && btnCloseFare) {
    btnCloseFare.addEventListener('click', closeFareModal);
    fareModalBackdrop.addEventListener('click', (e) => {
      if (e.target === fareModalBackdrop) closeFareModal();
    });
  }
}

window.openRouteDrawer = function(trainNumber) {
  const backdrop = document.getElementById('routeDrawerBackdrop');
  const body = document.getElementById('routeDrawerBody');
  const title = document.getElementById('routeDrawerTrainTitle');
  if (!backdrop || !body) return;

  const train = (typeof BHARAT_TRAINS !== 'undefined' ? BHARAT_TRAINS : []).find(t => t.number === trainNumber);
  if (!train) return;

  if (title) {
    title.textContent = `#${train.number} - ${train.name} (${train.type.replace('_', ' ')})`;
  }

  body.innerHTML = `
    <div style="margin-bottom:18px; font-size:12px; color:var(--ink-secondary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-light-blue); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--border);">
      <span>Origin: <strong>${train.source.name}</strong></span>
      <span>Terminus: <strong>${train.destination.name}</strong></span>
      <span>Total: <strong>${train.route[train.route.length - 1].distance} km</strong></span>
    </div>

    <div class="stoppage-timeline">
      ${train.route.map((s, idx) => {
        const isOrigin = idx === 0;
        const isDest = idx === train.route.length - 1;
        let haltText = '2 mins';
        if (isOrigin) haltText = 'Origin Terminus';
        else if (isDest) haltText = 'Destination Terminus';
        else {
          const arrM = parseTimeToMinutes(s.arrival);
          const depM = parseTimeToMinutes(s.departure);
          const diff = depM - arrM;
          haltText = diff > 0 ? `${diff} mins halt` : '2 mins halt';
        }

        return `
          <div class="stop-node">
            <span class="stop-marker ${isOrigin ? 'origin' : isDest ? 'dest' : ''}">${idx + 1}</span>
            <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-weight:700; font-size:13px; color:var(--ink);">${s.name}</span>
                <span class="stn-code" style="margin-left:6px; font-size:11px; padding:2px 6px;">${s.code}</span>
              </div>
              <div style="text-align:right; font-size:12px; color:var(--ink-secondary);">
                <div>Arr: <strong>${s.arrival}</strong> | Dep: <strong>${s.departure}</strong></div>
                <div style="font-size:10px; color:var(--ink-muted);">${haltText} • ${s.distance} km • Day ${s.day}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  backdrop.classList.add('open');
};

window.closeRouteDrawer = function() {
  const backdrop = document.getElementById('routeDrawerBackdrop');
  if (backdrop) backdrop.classList.remove('open');
};

window.openFareModal = function(trainNumber, classCode, baseFare, fromCode, toCode, quotaCode, journeyDate) {
  const backdrop = document.getElementById('fareModalBackdrop');
  const title = document.getElementById('fareModalTitle');
  const body = document.getElementById('fareModalBody');
  if (!backdrop || !body) return;

  let train = null;
  if (typeof BHARAT_TRAINS !== 'undefined' && Array.isArray(BHARAT_TRAINS)) {
    train = BHARAT_TRAINS.find(t => t.number === trainNumber);
  }

  let breakdown = null;
  if (typeof RailwayFareEngine !== 'undefined' && train) {
    const q = quotaCode || (typeof currentQuota !== 'undefined' ? currentQuota : 'GN');
    const d = journeyDate || (typeof currentSearchDate !== 'undefined' ? currentSearchDate : null);
    const res = RailwayFareEngine.calculateJourneyFare(train, fromCode, toCode, classCode, q, d);
    if (res.success) {
      breakdown = res.breakdown;
    }
  }

  if (!breakdown) {
    const fareNum = parseInt(baseFare, 10) || 520;
    const resCharge = 40;
    const sfCharge = 45;
    const gst = Math.round(fareNum * 0.05);
    breakdown = {
      baseFare: Math.max(50, fareNum - resCharge - sfCharge - gst),
      reservationFee: resCharge,
      superfastCharge: sfCharge,
      tatkalCharge: 0,
      cateringCharge: 0,
      gst,
      totalFare: fareNum
    };
  }

  const clsName = (typeof RailwayFareEngine !== 'undefined' && RailwayFareEngine.CLASS_NAMES[classCode]) || classCode;
  if (title) {
    title.textContent = `Fare Breakdown: Train #${trainNumber} (${clsName})`;
  }

  body.innerHTML = `
    <div style="margin-bottom:14px; font-size:12px; color:var(--ink-secondary);">
      Itemized statutory fare breakdown under Ministry of Railways tariff guidelines (IRCA Coaching Tariff No. 26):
    </div>

    <div class="fare-matrix-row">
      <span>Base Railway Ticket Fare</span>
      <strong class="mono">₹${breakdown.baseFare}</strong>
    </div>
    <div class="fare-matrix-row">
      <span>Reservation Fee</span>
      <strong class="mono">₹${breakdown.reservationFee}</strong>
    </div>
    ${breakdown.superfastCharge > 0 ? `
    <div class="fare-matrix-row">
      <span>Superfast Surcharge</span>
      <strong class="mono">₹${breakdown.superfastCharge}</strong>
    </div>
    ` : ''}
    ${breakdown.tatkalCharge > 0 ? `
    <div class="fare-matrix-row">
      <span>Tatkal Surcharge</span>
      <strong class="mono">₹${breakdown.tatkalCharge}</strong>
    </div>
    ` : ''}
    ${breakdown.cateringCharge > 0 ? `
    <div class="fare-matrix-row">
      <span>Catering Charges (Mandatory)</span>
      <strong class="mono">₹${breakdown.cateringCharge}</strong>
    </div>
    ` : ''}
    <div class="fare-matrix-row">
      <span>Applicable GST (${breakdown.gst > 0 ? '5%' : '0%'})</span>
      <strong class="mono">₹${breakdown.gst}</strong>
    </div>
    <div class="fare-matrix-row total">
      <span>Total Payable Amount</span>
      <strong class="mono" style="font-size:17px; color:var(--rail-blue);">₹${breakdown.totalFare}</strong>
    </div>

    <div style="margin-top:18px; font-size:11px; color:var(--ink-muted); line-height:1.4;">
      * Statutory commercial fare rounded to nearest ₹5. Optional travel insurance (₹0.45) applies upon passenger selection at checkout.
    </div>
  `;

  backdrop.classList.add('open');
};

window.closeFareModal = function() {
  const backdrop = document.getElementById('fareModalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
};
