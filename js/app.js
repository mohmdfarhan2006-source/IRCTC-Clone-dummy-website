/**
 * BharatRail - Client-side Interactive Engine
 * Pure Vanilla JavaScript Application Controller
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
  initTrainsPage();
  initLiveStatusPage();
});

// ==========================================================================
// 1. STATION AUTOCOMPLETE & SWAP
// ==========================================================================
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

    const matches = BHARAT_STATIONS.filter(s => 
      s.code.toLowerCase().includes(val) || 
      s.name.toLowerCase().includes(val) ||
      s.city.toLowerCase().includes(val)
    ).slice(0, 6);

    if (matches.length === 0) {
      dropdownElem.innerHTML = '<div class="autocomplete-item"><span class="stn-name text-muted">No station found</span></div>';
      dropdownElem.classList.add('open');
      return;
    }

    dropdownElem.innerHTML = matches.map(s => `
      <div class="autocomplete-item" data-code="${s.code}" data-name="${s.name}">
        <div>
          <span class="stn-name">${s.name}</span>
          <span style="font-size:10px; color:var(--ink-muted); margin-left:6px;">${s.city}, ${s.state}</span>
        </div>
        <span class="stn-code">${s.code}</span>
      </div>
    `).join('');

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
    dateInput.value = tomorrow.toISOString().split('T')[0];
    dateInput.min = new Date().toISOString().split('T')[0];
  }
}

// ==========================================================================
// 2. SEARCH & TRAIN COMPARISON ENGINE
// ==========================================================================
function initSearchPage() {
  const searchResultsContainer = document.getElementById('searchResultsList');
  if (!searchResultsContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const fromParam = (urlParams.get('from') || 'NDLS').toUpperCase();
  const toParam = (urlParams.get('to') || 'ARA').toUpperCase();
  const dateParam = urlParams.get('date') || new Date().toISOString().split('T')[0];
  const classFilter = urlParams.get('class') || 'ALL';

  // Update header text
  const corridorTitle = document.getElementById('corridorTitle');
  if (corridorTitle) {
    corridorTitle.textContent = `${fromParam} → ${toParam}`;
  }
  const corridorDate = document.getElementById('corridorDate');
  if (corridorDate) {
    corridorDate.textContent = `Journey Date: ${dateParam}`;
  }

  // Filter trains
  let matchingTrains = BHARAT_TRAINS.filter(t => 
    (t.from === fromParam && t.to === toParam) ||
    t.stops.some(s => s.code === fromParam) && t.stops.some(s => s.code === toParam)
  );

  // Fallback to corridor if no exact match
  if (matchingTrains.length === 0) {
    matchingTrains = BHARAT_TRAINS;
  }

  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `${matchingTrains.length} Trains Available`;
  }

  renderTrainCards(matchingTrains, searchResultsContainer, fromParam, toParam, dateParam);
}

function renderTrainCards(trains, container, fromCode, toCode, journeyDate) {
  container.innerHTML = trains.map(t => {
    return `
      <div class="train-card" id="train-card-${t.number}">
        <div class="train-card-top">
          <div class="train-card-header">
            <div class="train-ident">
              <span class="train-number-badge">${t.number}</span>
              <h3 class="train-name">${t.name}</h3>
              <span class="train-type-pill">${t.type.replace('_', ' ')}</span>
            </div>
            <div class="train-days">
              ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => `
                <span class="day-dot ${t.running_days.includes(idx + 1) ? 'active' : ''}">${day}</span>
              `).join('')}
            </div>
          </div>

          <div class="route-timeline-row">
            <div class="station-point">
              <div class="station-time">${t.departure}</div>
              <div class="station-code-name">${fromCode}</div>
              <div class="station-subname">Origin</div>
            </div>

            <div class="duration-line-wrap">
              <span class="duration-label">${t.duration}</span>
              <div class="timeline-track">
                <span class="timeline-dot"></span>
                <span class="timeline-dot end"></span>
              </div>
              <span class="distance-label">${t.distance_km} km • ${t.halts} halts</span>
            </div>

            <div class="station-point dest">
              <div class="station-time">${t.arrival}</div>
              <div class="station-code-name">${toCode}</div>
              <div class="station-subname">Destination</div>
            </div>
          </div>

          <div class="classes-chips-row">
            ${t.classes.map(cls => `
              <div class="class-chip" onclick="toggleDrawer('${t.number}', '${cls.code}', ${cls.fare}, '${cls.avl}', '${fromCode}', '${toCode}', '${journeyDate}')">
                <div class="class-chip-top">
                  <span class="class-code">${cls.code}</span>
                  <span class="class-fare">₹${cls.fare}</span>
                </div>
                <span class="avl-status-tag ${cls.status}">${cls.avl}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="class-drawer" id="drawer-${t.number}">
          <div class="drawer-inner">
            <div class="fare-breakdown-list">
              <div class="fare-item">
                <span>Selected Class</span>
                <strong id="drawer-class-${t.number}">3A</strong>
              </div>
              <div class="fare-item">
                <span>Live Availability</span>
                <strong id="drawer-avl-${t.number}" class="text-success">AVAILABLE 31</strong>
              </div>
              <div class="fare-item">
                <span>Base + GST Fare</span>
                <strong id="drawer-fare-${t.number}">₹1,320</strong>
              </div>
            </div>

            <button type="button" class="btn-book-now" id="btn-book-${t.number}">
              <span>Book Ticket</span>
              <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.toggleDrawer = function(trainNumber, classCode, fare, avl, fromCode, toCode, journeyDate) {
  const drawer = document.getElementById(`drawer-${trainNumber}`);
  if (!drawer) return;

  const isCurrentOpen = drawer.classList.contains('open');

  // Close all other drawers
  document.querySelectorAll('.class-drawer').forEach(d => d.classList.remove('open'));

  if (!isCurrentOpen) {
    drawer.classList.add('open');
    document.getElementById(`drawer-class-${trainNumber}`).textContent = classCode;
    document.getElementById(`drawer-avl-${trainNumber}`).textContent = avl;
    document.getElementById(`drawer-fare-${trainNumber}`).textContent = `₹${fare}`;

    const bookBtn = document.getElementById(`btn-book-${trainNumber}`);
    if (bookBtn) {
      bookBtn.onclick = () => {
        window.location.href = `booking.html?train=${trainNumber}&class=${classCode}&from=${fromCode}&to=${toCode}&date=${journeyDate}&quota=GN`;
      };
    }
  }
};

// ==========================================================================
// 3. MULTI-STEP CHECKOUT & BOOKING ENGINE
// ==========================================================================
let currentBookingState = {
  passengers: [
    { name: 'Rohit Sharma', age: 36, gender: 'MALE', berth: 'LOWER', food: 'VEG' }
  ],
  baseFare: 1320,
  insurance: true,
  travelClass: '3A',
  trainNumber: '12402',
  fromCode: 'NDLS',
  toCode: 'ARA',
  journeyDate: '2026-09-28',
  quota: 'GN'
};

function initBookingPage() {
  const bookingForm = document.getElementById('bookingForm');
  if (!bookingForm) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentBookingState.trainNumber = urlParams.get('train') || '12402';
  currentBookingState.travelClass = urlParams.get('class') || '3A';
  currentBookingState.fromCode = urlParams.get('from') || 'NDLS';
  currentBookingState.toCode = urlParams.get('to') || 'ARA';
  currentBookingState.journeyDate = urlParams.get('date') || '2026-09-28';
  currentBookingState.quota = urlParams.get('quota') || 'GN';

  // Find train base fare
  const trainObj = BHARAT_TRAINS.find(t => t.number === currentBookingState.trainNumber);
  if (trainObj) {
    const clsObj = trainObj.classes.find(c => c.code === currentBookingState.travelClass);
    if (clsObj) {
      currentBookingState.baseFare = clsObj.fare;
    }
    const bookingSummaryTrain = document.getElementById('bookingSummaryTrain');
    if (bookingSummaryTrain) {
      bookingSummaryTrain.textContent = `Train #${trainObj.number} - ${trainObj.name}`;
    }
  }

  const bookingSummaryRoute = document.getElementById('bookingSummaryRoute');
  if (bookingSummaryRoute) {
    bookingSummaryRoute.textContent = `${currentBookingState.fromCode} → ${currentBookingState.toCode} • ${currentBookingState.journeyDate} • Class: ${currentBookingState.travelClass}`;
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

  container.innerHTML = currentBookingState.passengers.map((p, idx) => `
    <div class="passenger-box">
      <div class="passenger-box-head">
        <span style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:6px;">
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
          <label class="form-label">Full Legal Name *</label>
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
          <label class="form-label">Berth Preference</label>
          <select class="form-control" onchange="updatePassengerField(${idx}, 'berth', this.value)">
            <option value="NO_PREFERENCE" ${p.berth === 'NO_PREFERENCE' ? 'selected' : ''}>No Preference</option>
            <option value="LOWER" ${p.berth === 'LOWER' ? 'selected' : ''}>Lower Berth</option>
            <option value="MIDDLE" ${p.berth === 'MIDDLE' ? 'selected' : ''}>Middle Berth</option>
            <option value="UPPER" ${p.berth === 'UPPER' ? 'selected' : ''}>Upper Berth</option>
            <option value="SIDE_LOWER" ${p.berth === 'SIDE_LOWER' ? 'selected' : ''}>Side Lower</option>
            <option value="SIDE_UPPER" ${p.berth === 'SIDE_UPPER' ? 'selected' : ''}>Side Upper</option>
            <option value="WINDOW" ${p.berth === 'WINDOW' ? 'selected' : ''}>Window Seat</option>
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
  const baseTotal = currentBookingState.baseFare * paxCount;
  const resFee = 40 * paxCount;
  const sfFee = 45 * paxCount;
  const gst = Math.round(baseTotal * 0.05);
  const ins = currentBookingState.insurance ? (0.45 * paxCount) : 0;
  const grandTotal = Math.round(baseTotal + resFee + sfFee + gst + ins);

  const baseFareElem = document.getElementById('fareBaseTotal');
  if (baseFareElem) baseFareElem.textContent = `₹${baseTotal}`;

  const gstElem = document.getElementById('fareGst');
  if (gstElem) gstElem.textContent = `₹${gst}`;

  const insElem = document.getElementById('fareInsurance');
  if (insElem) insElem.textContent = `₹${ins.toFixed(2)}`;

  const totalElem = document.getElementById('fareGrandTotal');
  if (totalElem) totalElem.textContent = `₹${grandTotal}`;

  const payBtnAmount = document.getElementById('payBtnAmount');
  if (payBtnAmount) payBtnAmount.textContent = `(₹${grandTotal})`;
}

function handlePaymentAndConfirm(e) {
  e.preventDefault();

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

  const trainObj = BHARAT_TRAINS.find(t => t.number === currentBookingState.trainNumber) || BHARAT_TRAINS[0];

  const paxCount = currentBookingState.passengers.length;
  const grandTotal = Math.round((currentBookingState.baseFare + 85) * paxCount * 1.05);

  const coaches = currentBookingState.travelClass === '1A' ? ['H1'] : currentBookingState.travelClass === '2A' ? ['A1', 'A2'] : currentBookingState.travelClass === '3A' ? ['B1', 'B2', 'B3'] : ['S1', 'S2', 'S3'];
  const assignedCoach = coaches[Math.floor(Math.random() * coaches.length)];

  const allocatedPassengers = currentBookingState.passengers.map((p, idx) => ({
    name: p.name,
    age: parseInt(p.age, 10) || 30,
    gender: p.gender,
    berthPreference: p.berth,
    coach: assignedCoach,
    berthNo: `${10 + idx * 3}`,
    berthType: p.berth === 'NO_PREFERENCE' ? 'LOWER' : p.berth,
    status: `CNF / ${assignedCoach} / ${10 + idx * 3}`
  }));

  const newBooking = {
    pnr: newPNR,
    bookingId: `BKG_${Date.now()}`,
    trainNumber: trainObj.number,
    trainName: trainObj.name,
    trainType: trainObj.type,
    from: currentBookingState.fromCode,
    fromName: currentBookingState.fromCode,
    to: currentBookingState.toCode,
    toName: currentBookingState.toCode,
    date: currentBookingState.journeyDate,
    departure: trainObj.departure,
    arrival: trainObj.arrival,
    travelClass: currentBookingState.travelClass,
    quota: currentBookingState.quota,
    status: 'CONFIRMED',
    chartStatus: 'CHART_NOT_PREPARED',
    totalFare: grandTotal,
    passengers: allocatedPassengers
  };

  BookingStore.save(newBooking);

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
  document.getElementById('ersPNR').textContent = booking.pnr;
  document.getElementById('ersTrain').textContent = `#${booking.trainNumber} - ${booking.trainName} (${booking.travelClass})`;
  document.getElementById('ersRoute').textContent = `${booking.from} → ${booking.to} • ${booking.date}`;
  document.getElementById('ersDepArr').textContent = `Dep: ${booking.departure} | Arr: ${booking.arrival}`;
  document.getElementById('ersTotalFare').textContent = `₹${booking.totalFare}`;

  const paxBody = document.getElementById('ersPaxTableBody');
  if (paxBody) {
    paxBody.innerHTML = booking.passengers.map((p, idx) => `
      <tr>
        <td class="mono" style="font-weight:700;">${idx + 1}</td>
        <td style="font-weight:700;">${p.name}</td>
        <td>${p.age} / ${p.gender}</td>
        <td class="mono font-bold" style="color:var(--status-avl-text);">${p.status}</td>
        <td style="font-weight:600;">${p.coach || '—'} / ${p.berthNo || '—'} (${p.berthType || '—'})</td>
      </tr>
    `).join('');
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

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="font-size:1rem; font-weight:800;">#${booking.trainNumber} - ${booking.trainName}</h4>
          <p style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            ${booking.from} (${booking.departure}) → ${booking.to} (${booking.arrival}) • ${booking.date} • Class: ${booking.travelClass}
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
            ${booking.passengers.map((p, idx) => `
              <tr>
                <td class="mono font-bold">${idx + 1}</td>
                <td style="font-weight:700;">${p.name}</td>
                <td>${p.age} / ${p.gender}</td>
                <td class="mono font-bold">${p.status}</td>
                <td class="mono font-bold" style="color:${booking.status === 'CANCELLED' ? 'var(--status-reg-text)' : 'var(--status-avl-text)'};">
                  ${booking.status === 'CANCELLED' ? 'CANCELLED' : p.status}
                </td>
                <td style="font-weight:600;">${p.coach || '—'} / ${p.berthNo || '—'}</td>
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
// 6. TRAIN SCHEDULE & DIRECTORY (5 WORKING TABS)
// ==========================================================================
function initTrainsPage() {
  const trainSearchInput = document.getElementById('trainSearchInput');
  const trainDetailSection = document.getElementById('trainDetailSection');
  if (!trainSearchInput || !trainDetailSection) return;

  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q') || '22436';
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
  const train = BHARAT_TRAINS.find(t => 
    t.number === query || t.name.toLowerCase().includes(query.toLowerCase())
  ) || BHARAT_TRAINS[0];

  document.getElementById('dtNumber').textContent = train.number;
  document.getElementById('dtName').textContent = train.name;
  document.getElementById('dtType').textContent = train.type.replace('_', ' ');
  document.getElementById('dtRoute').textContent = `${train.from} → ${train.to} • ${train.distance_km} km`;

  // Stoppage timeline
  const timelineElem = document.getElementById('dtTimeline');
  if (timelineElem) {
    timelineElem.innerHTML = train.stops.map((s, idx) => `
      <div class="stop-node">
        <span class="stop-marker">${idx + 1}</span>
        <div style="background:#FFFFFF; border:1px solid var(--border); border-radius:var(--radius-md); padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-weight:700; font-size:13px;">${s.name}</span>
            <span class="stn-code" style="margin-left:6px;">${s.code}</span>
          </div>
          <div style="font-size:12px; color:var(--ink-secondary); text-align:right;">
            <div>Arr: <strong>${s.arrival}</strong> | Dep: <strong>${s.departure}</strong></div>
            <div style="font-size:10px; color:var(--ink-muted);">Halt: ${s.halt} • ${s.dist} km • Day ${s.day}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Stoppage table
  const tableElem = document.getElementById('dtStopsTableBody');
  if (tableElem) {
    tableElem.innerHTML = train.stops.map((s, idx) => `
      <tr>
        <td class="mono font-bold">${idx + 1}</td>
        <td style="font-weight:700;">${s.name}</td>
        <td class="mono font-bold" style="color:var(--primary);">${s.code}</td>
        <td class="mono">${s.arrival}</td>
        <td class="mono">${s.departure}</td>
        <td>${s.halt}</td>
        <td class="mono">${s.dist} km</td>
        <td>Day ${s.day}</td>
      </tr>
    `).join('');
  }
}

// ==========================================================================
// 7. LIVE RUNNING STATUS
// ==========================================================================
function initLiveStatusPage() {
  const liveForm = document.getElementById('liveStatusForm');
  if (!liveForm) return;

  liveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const liveContainer = document.getElementById('liveStatusResult');
    if (liveContainer) {
      liveContainer.style.display = 'block';
    }
  });
}
