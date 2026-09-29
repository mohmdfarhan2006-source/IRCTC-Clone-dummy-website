/**
 * BharatRail - Comprehensive Automated Regression Test Suite
 * Covers Railway Fare Engine (IRCA Tariff No. 26), Official NTES Live Status, Route Matching, and PRS Booking
 */

const path = require('path');
const RailwayFareEngine = require('./js/fare_engine.js');
const { BHARAT_TRAINS, BHARAT_STATIONS, BookingStore } = require('./js/data.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

console.log('==================================================');
console.log('BHARATRAIL COMPREHENSIVE AUTOMATED REGRESSION SUITE');
console.log('Authoritative Reference: IRCTC PRS & IRCA Tariff No. 26');
console.log('==================================================\n');

// 1. SAMPOORNA KRANTI EXPRESS (12393 / 12394) - NDLS <-> PNBE (1002 km)
const tr12393 = BHARAT_TRAINS.find(t => t.number === '12393');
assert(!!tr12393, 'Train 12393 (Sampoorna Kranti) exists in dataset');

if (tr12393) {
  // SL General
  const sl = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', 'SL', 'GN');
  assert(sl.success && sl.totalFare === 520, '12393 NDLS->PNBE SL GN total is ₹520', `Got ${sl.totalFare}`);
  assert(sl.breakdown.baseFare === 470, '12393 NDLS->PNBE SL base fare is ₹470');
  assert(sl.breakdown.reservationFee === 20, '12393 NDLS->PNBE SL reservation fee is ₹20');
  assert(sl.breakdown.superfastCharge === 30, '12393 NDLS->PNBE SL superfast charge is ₹30');
  assert(sl.breakdown.gst === 0, '12393 NDLS->PNBE SL GST is ₹0 (0% on non-AC)');

  // SL Tatkal
  const slTatkal = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', 'SL', 'TQ');
  assert(slTatkal.success && slTatkal.totalFare === 660, '12393 NDLS->PNBE SL Tatkal total is ₹660', `Got ${slTatkal.totalFare}`);
  assert(slTatkal.breakdown.tatkalCharge === 141, '12393 NDLS->PNBE SL Tatkal surcharge is ₹141 (30% of base)');

  // 3A General
  const a3 = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', '3A', 'GN');
  assert(a3.success && a3.totalFare === 1410, '12393 NDLS->PNBE 3A GN total is ₹1410', `Got ${a3.totalFare}`);
  assert(a3.breakdown.baseFare === 1258, '12393 NDLS->PNBE 3A base fare is ₹1258');
  assert(a3.breakdown.reservationFee === 40, '12393 NDLS->PNBE 3A reservation fee is ₹40');
  assert(a3.breakdown.superfastCharge === 45, '12393 NDLS->PNBE 3A superfast charge is ₹45');
  assert(a3.breakdown.gst === 67, '12393 NDLS->PNBE 3A GST is ₹67 (5% on AC)');

  // 3A Tatkal
  const a3Tatkal = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', '3A', 'TQ');
  assert(a3Tatkal.success && a3Tatkal.totalFare === 1830, '12393 NDLS->PNBE 3A Tatkal total is ₹1830', `Got ${a3Tatkal.totalFare}`);

  // 2A General
  const a2 = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', '2A', 'GN');
  assert(a2.success && a2.totalFare === 1985, '12393 NDLS->PNBE 2A GN total is ₹1985', `Got ${a2.totalFare}`);

  // 1A General
  const a1 = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', '1A', 'GN');
  assert(a1.success && a1.totalFare === 3325, '12393 NDLS->PNBE 1A GN total is ₹3325', `Got ${a1.totalFare}`);

  // 1A Tatkal must be disallowed
  const a1Tatkal = RailwayFareEngine.calculateJourneyFare(tr12393, 'NDLS', 'PNBE', '1A', 'TQ');
  assert(a1Tatkal.success === false && a1Tatkal.error === 'TATKAL_NOT_AVAILABLE_IN_1A', '12393 NDLS->PNBE 1A Tatkal disallowed per IRCTC rules');

  // Intermediate Segment: CNB to NDLS (441 km)
  const segSL = RailwayFareEngine.calculateJourneyFare(tr12393, 'CNB', 'NDLS', 'SL', 'GN');
  assert(segSL.success && segSL.totalFare === 290, '12393 CNB->NDLS intermediate segment SL is ₹290', `Got ${segSL.totalFare}`);
}

// 2. MAGADH EXPRESS (20801 / 20802) - NDLS <-> IPR (1065 km)
const tr20801 = BHARAT_TRAINS.find(t => t.number === '20801');
assert(!!tr20801, 'Train 20801 (Magadh Express) exists in dataset');

if (tr20801) {
  const mSL = RailwayFareEngine.calculateJourneyFare(tr20801, 'NDLS', 'IPR', 'SL', 'GN');
  assert(mSL.success && mSL.totalFare === 565, '20801 NDLS->IPR SL GN total is ₹565', `Got ${mSL.totalFare}`);

  const m3A = RailwayFareEngine.calculateJourneyFare(tr20801, 'NDLS', 'IPR', '3A', 'GN');
  assert(m3A.success && m3A.totalFare === 1445, '20801 NDLS->IPR 3A GN total is ₹1445', `Got ${m3A.totalFare}`);

  const m2A = RailwayFareEngine.calculateJourneyFare(tr20801, 'NDLS', 'IPR', '2A', 'GN');
  assert(m2A.success && m2A.totalFare === 2045, '20801 NDLS->IPR 2A GN total is ₹2045', `Got ${m2A.totalFare}`);

  const m1A = RailwayFareEngine.calculateJourneyFare(tr20801, 'NDLS', 'IPR', '1A', 'GN');
  assert(m1A.success && m1A.totalFare === 3410, '20801 NDLS->IPR 1A GN total is ₹3410', `Got ${m1A.totalFare}`);
}

// 3. VANDE BHARAT EXPRESS (22436) - NDLS -> BSB (759 km)
const tr22436 = BHARAT_TRAINS.find(t => t.number === '22436');
assert(!!tr22436, 'Train 22436 (Vande Bharat) exists in dataset');

if (tr22436) {
  const vbCC = RailwayFareEngine.calculateJourneyFare(tr22436, 'NDLS', 'BSB', 'CC', 'GN');
  assert(vbCC.success && vbCC.totalFare === 1750, '22436 NDLS->BSB CC GN total is ₹1750 (with catering)', `Got ${vbCC.totalFare}`);
  assert(vbCC.breakdown.cateringCharge === 364, '22436 NDLS->BSB CC catering charge is ₹364');

  const vbEC = RailwayFareEngine.calculateJourneyFare(tr22436, 'NDLS', 'BSB', 'EC', 'GN');
  assert(vbEC.success && vbEC.totalFare === 3300, '22436 NDLS->BSB EC GN total is ₹3300 (with catering)', `Got ${vbEC.totalFare}`);
  assert(vbEC.breakdown.cateringCharge === 419, '22436 NDLS->BSB EC catering charge is ₹419');

  // Verify non-permitted classes are rejected
  const vbTrySL = RailwayFareEngine.calculateJourneyFare(tr22436, 'NDLS', 'BSB', 'SL', 'GN');
  assert(vbTrySL.success === false && vbTrySL.error === 'CLASS_NOT_AVAILABLE', '22436 Vande Bharat disallows SL');
}

// 4. SHRAM SHAKTI EXPRESS (12452) - NDLS <-> CNB (440 km)
const tr12452 = BHARAT_TRAINS.find(t => t.number === '12452');
assert(!!tr12452, 'Train 12452 (Shram Shakti) exists in dataset');

if (tr12452) {
  const ss2S = RailwayFareEngine.calculateJourneyFare(tr12452, 'NDLS', 'CNB', '2S', 'GN');
  assert(ss2S.success === false && ss2S.error === 'CLASS_NOT_AVAILABLE', '12452 correctly rejects 2S (not offered on Shram Shakti Express)');

  const ssSL = RailwayFareEngine.calculateJourneyFare(tr12452, 'NDLS', 'CNB', 'SL', 'GN');
  assert(ssSL.success && ssSL.totalFare === 290, '12452 NDLS->CNB SL GN is ₹290', `Got ${ssSL.totalFare}`);

  const ss3A = RailwayFareEngine.calculateJourneyFare(tr12452, 'NDLS', 'CNB', '3A', 'GN');
  assert(ss3A.success && ss3A.totalFare === 745, '12452 NDLS->CNB 3A GN is ₹745', `Got ${ss3A.totalFare}`);

  const ss2A = RailwayFareEngine.calculateJourneyFare(tr12452, 'NDLS', 'CNB', '2A', 'GN');
  assert(ss2A.success && ss2A.totalFare === 1050, '12452 NDLS->CNB 2A GN is ₹1050', `Got ${ss2A.totalFare}`);

  const ss1A = RailwayFareEngine.calculateJourneyFare(tr12452, 'NDLS', 'CNB', '1A', 'GN');
  assert(ss1A.success && ss1A.totalFare === 1770, '12452 NDLS->CNB 1A GN is ₹1770', `Got ${ss1A.totalFare}`);
}

// 5. SUBURBAN / MMTS LOCAL TRAIN CLASS RESTRICTIONS
const mmts = BHARAT_TRAINS.find(t => /MMTS/i.test(t.name));
if (mmts) {
  const permitted = RailwayFareEngine.getPermittedClassesForTrain(mmts);
  assert(permitted.length === 1 && permitted[0] === '2S', 'MMTS offers only Second Class (2S)');

  const try3A = RailwayFareEngine.calculateJourneyFare(mmts, mmts.source.code, mmts.destination.code, '3A', 'GN');
  assert(try3A.success === false && try3A.error === 'CLASS_NOT_AVAILABLE', 'MMTS correctly rejects 3A booking');

  const trySL = RailwayFareEngine.calculateJourneyFare(mmts, mmts.source.code, mmts.destination.code, 'SL', 'GN');
  assert(trySL.success === false && trySL.error === 'CLASS_NOT_AVAILABLE', 'MMTS correctly rejects SL booking');
}

// 6. SERVERLESS API ENDPOINT TEST (api/fares.js)
const apiFaresHandler = require('./api/fares.js');
async function runTests() {
  const req = {
    method: 'GET',
    headers: { origin: 'https://mohmdfarhan2006-source.github.io' },
    query: {
      train: '12393',
      from: 'NDLS',
      to: 'PNBE',
      class: 'SL',
      quota: 'GN',
      date: '2026-09-30'
    }
  };

  let statusCode = null;
  let responseData = null;
  const res = {
    setHeader: () => {},
    writeHead: (code) => { statusCode = code; },
    end: (str) => { responseData = JSON.parse(str); }
  };

  await apiFaresHandler(req, res);
  assert(statusCode === 200, 'api/fares.js returns HTTP 200 for valid query');
  assert(responseData && responseData.totalFare === 520, 'api/fares.js returns totalFare 520 for 12393 NDLS->PNBE SL');
  assert(responseData && responseData.provenance.source === 'IRCTC_PRS_OFFICIAL', 'api/fares.js includes official IRCTC provenance');

  // 7. COMPREHENSIVE DATASET AUDIT
  const auditResult = RailwayFareEngine.auditAllTrains(BHARAT_TRAINS);
  assert(auditResult.totalTrainsAudited === 5230, 'All 5,230 trains audited');
  assert(auditResult.missingFareRecords === 0, 'Zero missing fare records');
  assert(auditResult.unverifiedRecords === 0, 'Zero unverified fare records');
  assert(auditResult.prunedUnsupportedClassRecords === 0, 'Zero remaining unsupported class records');
  assert(auditResult.classesCovered.length === 8, 'All 8 standard Indian Railway classes covered');

  console.log('\n==================================================');
  console.log(`REGRESSION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('ALL TARIFF AND FARE REGRESSION TESTS PASSED (100% SUCCESS)!');
  } else {
    console.error(`FAILED TESTS: ${failedTests}`);
    process.exit(1);
  }
  console.log('==================================================');
}

runTests();
