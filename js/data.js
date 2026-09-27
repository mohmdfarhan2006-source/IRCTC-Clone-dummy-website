/**
 * BharatRail - Authoritative Master Data & Datasets
 * Stations, Trains, Routes, and Cancellation Tariffs
 */

const BHARAT_STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'DLI', name: 'Old Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', state: 'Delhi' },
  { code: 'ANVT', name: 'Anand Vihar Terminal', city: 'Delhi', state: 'Delhi' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'ARA', name: 'Ara Junction', city: 'Ara', state: 'Bihar' },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar' },
  { code: 'DNR', name: 'Danapur', city: 'Danapur', state: 'Bihar' },
  { code: 'RJPB', name: 'Rajendra Nagar Terminal', city: 'Patna', state: 'Bihar' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal' },
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'YPR', name: 'Yesvantpur Junction', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra' },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Jn', city: 'Mughalsarai', state: 'Uttar Pradesh' },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab' },
  { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu & Kashmir' },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', city: 'Katra', state: 'Jammu & Kashmir' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'RKMP', name: 'Rani Kamlapati', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'JBP', name: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan' },
  { code: 'PURI', name: 'Puri', city: 'Puri', state: 'Odisha' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'R', name: 'Raipur Junction', city: 'Raipur', state: 'Chhattisgarh' },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'RNC', name: 'Ranchi Junction', city: 'Ranchi', state: 'Jharkhand' },
  { code: 'DHN', name: 'Dhanbad Junction', city: 'Dhanbad', state: 'Jharkhand' },
  { code: 'GAYA', name: 'Gaya Junction', city: 'Gaya', state: 'Bihar' },
  { code: 'BJU', name: 'Barauni Junction', city: 'Barauni', state: 'Bihar' }
];

const BHARAT_TRAINS = [
  {
    number: '22436',
    name: 'Vande Bharat Express',
    type: 'VANDE_BHARAT',
    from: 'NDLS',
    to: 'BSB',
    departure: '06:00',
    arrival: '14:00',
    duration: '8h 00m',
    distance_km: 759,
    running_days: [1, 2, 3, 5, 6, 7],
    halts: 4,
    classes: [
      { code: 'CC', name: 'AC Chair Car', fare: 1750, avl: 'AVAILABLE 42', status: 'available' },
      { code: 'EC', name: 'Exec. Chair Car', fare: 3300, avl: 'AVAILABLE 12', status: 'available' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '06:00', halt: '—', dist: 0, day: 1 },
      { code: 'CNB', name: 'Kanpur Central', arrival: '10:08', departure: '10:10', halt: '2m', dist: 440, day: 1 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arrival: '12:08', departure: '12:10', halt: '2m', dist: 635, day: 1 },
      { code: 'BSB', name: 'Varanasi Junction', arrival: '14:00', departure: 'Destination', halt: '—', dist: 759, day: 1 }
    ]
  },
  {
    number: '12402',
    name: 'Magadh Express',
    type: 'SUPERFAST',
    from: 'NDLS',
    to: 'ARA',
    departure: '20:10',
    arrival: '10:10',
    duration: '14h 00m',
    distance_km: 980,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 14,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 3120, avl: 'AVAILABLE 4', status: 'available' },
      { code: '2A', name: 'AC 2 Tier', fare: 1860, avl: 'AVAILABLE 18', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 1320, avl: 'AVAILABLE 31', status: 'available' },
      { code: 'SL', name: 'Sleeper', fare: 495, avl: 'GNWL 14 / WL 6', status: 'waitlist' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '20:10', halt: '—', dist: 0, day: 1 },
      { code: 'ALJN', name: 'Aligarh Junction', arrival: '21:58', departure: '22:00', halt: '2m', dist: 131, day: 1 },
      { code: 'TDL', name: 'Tundla Junction', arrival: '22:53', departure: '22:55', halt: '2m', dist: 209, day: 1 },
      { code: 'CNB', name: 'Kanpur Central', arrival: '01:35', departure: '01:40', halt: '5m', dist: 440, day: 2 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arrival: '04:00', departure: '04:05', halt: '5m', dist: 635, day: 2 },
      { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Jn', arrival: '06:40', departure: '06:50', halt: '10m', dist: 787, day: 2 },
      { code: 'BXR', name: 'Buxar', arrival: '08:05', departure: '08:07', halt: '2m', dist: 881, day: 2 },
      { code: 'ARA', name: 'Ara Junction', arrival: '10:10', departure: '10:15', halt: '5m', dist: 980, day: 2 }
    ]
  },
  {
    number: '12392',
    name: 'Shramjeevi Express',
    type: 'SUPERFAST',
    from: 'NDLS',
    to: 'ARA',
    departure: '13:15',
    arrival: '06:00',
    duration: '16h 45m',
    distance_km: 980,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 16,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 3120, avl: 'RAC 2', status: 'rac' },
      { code: '2A', name: 'AC 2 Tier', fare: 1860, avl: 'AVAILABLE 8', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 1320, avl: 'AVAILABLE 44', status: 'available' },
      { code: 'SL', name: 'Sleeper', fare: 495, avl: 'AVAILABLE 76', status: 'available' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '13:15', halt: '—', dist: 0, day: 1 },
      { code: 'MB', name: 'Moradabad', arrival: '16:02', departure: '16:10', halt: '8m', dist: 166, day: 1 },
      { code: 'BE', name: 'Bareilly', arrival: '17:38', departure: '17:40', halt: '2m', dist: 256, day: 1 },
      { code: 'LKO', name: 'Lucknow Charbagh', arrival: '21:20', departure: '21:30', halt: '10m', dist: 491, day: 1 },
      { code: 'BSB', name: 'Varanasi Junction', arrival: '02:35', departure: '02:45', halt: '10m', dist: 792, day: 2 },
      { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Jn', arrival: '03:43', departure: '03:53', halt: '10m', dist: 810, day: 2 },
      { code: 'ARA', name: 'Ara Junction', arrival: '06:00', departure: '06:05', halt: '5m', dist: 980, day: 2 }
    ]
  },
  {
    number: '12310',
    name: 'Rajendra Nagar Rajdhani',
    type: 'RAJDHANI',
    from: 'NDLS',
    to: 'PNBE',
    departure: '17:10',
    arrival: '04:49',
    duration: '11h 39m',
    distance_km: 1000,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 5,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 4250, avl: 'AVAILABLE 2', status: 'available' },
      { code: '2A', name: 'AC 2 Tier', fare: 2680, avl: 'AVAILABLE 15', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 1920, avl: 'AVAILABLE 64', status: 'available' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '17:10', halt: '—', dist: 0, day: 1 },
      { code: 'CNB', name: 'Kanpur Central', arrival: '21:55', departure: '22:00', halt: '5m', dist: 440, day: 1 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arrival: '23:53', departure: '23:55', halt: '2m', dist: 635, day: 1 },
      { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Jn', arrival: '01:42', departure: '01:52', halt: '10m', dist: 787, day: 2 },
      { code: 'PNBE', name: 'Patna Junction', arrival: '04:49', departure: 'Destination', halt: '—', dist: 1000, day: 2 }
    ]
  },
  {
    number: '12952',
    name: 'Mumbai Rajdhani Express',
    type: 'RAJDHANI',
    from: 'NDLS',
    to: 'MMCT',
    departure: '16:55',
    arrival: '08:35',
    duration: '15h 40m',
    distance_km: 1386,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 6,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 4890, avl: 'AVAILABLE 6', status: 'available' },
      { code: '2A', name: 'AC 2 Tier', fare: 3120, avl: 'AVAILABLE 24', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 2240, avl: 'AVAILABLE 82', status: 'available' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '16:55', halt: '—', dist: 0, day: 1 },
      { code: 'KOTA', name: 'Kota Junction', arrival: '21:30', departure: '21:40', halt: '10m', dist: 466, day: 1 },
      { code: 'RTM', name: 'Ratlam Junction', arrival: '00:48', departure: '00:50', halt: '2m', dist: 732, day: 2 },
      { code: 'BRC', name: 'Vadodara Junction', arrival: '04:08', departure: '04:18', halt: '10m', dist: 993, day: 2 },
      { code: 'ST', name: 'Surat', arrival: '05:53', departure: '05:58', halt: '5m', dist: 1123, day: 2 },
      { code: 'MMCT', name: 'Mumbai Central', arrival: '08:35', departure: 'Destination', halt: '—', dist: 1386, day: 2 }
    ]
  },
  {
    number: '12302',
    name: 'Howrah Rajdhani Express',
    type: 'RAJDHANI',
    from: 'NDLS',
    to: 'HWH',
    departure: '16:50',
    arrival: '09:55',
    duration: '17h 05m',
    distance_km: 1451,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 8,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 5040, avl: 'AVAILABLE 3', status: 'available' },
      { code: '2A', name: 'AC 2 Tier', fare: 3220, avl: 'AVAILABLE 19', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 2310, avl: 'AVAILABLE 57', status: 'available' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '16:50', halt: '—', dist: 0, day: 1 },
      { code: 'CNB', name: 'Kanpur Central', arrival: '21:32', departure: '21:37', halt: '5m', dist: 440, day: 1 },
      { code: 'PRYJ', name: 'Prayagraj Junction', arrival: '23:43', departure: '23:45', halt: '2m', dist: 635, day: 1 },
      { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Jn', arrival: '01:37', departure: '01:47', halt: '10m', dist: 787, day: 2 },
      { code: 'GAYA', name: 'Gaya Junction', arrival: '03:58', departure: '04:01', halt: '3m', dist: 992, day: 2 },
      { code: 'DHN', name: 'Dhanbad Junction', arrival: '06:33', departure: '06:38', halt: '5m', dist: 1192, day: 2 },
      { code: 'HWH', name: 'Howrah Junction', arrival: '09:55', departure: 'Destination', halt: '—', dist: 1451, day: 2 }
    ]
  },
  {
    number: '12622',
    name: 'Tamil Nadu Express',
    type: 'SUPERFAST',
    from: 'NDLS',
    to: 'MAS',
    departure: '21:05',
    arrival: '06:35',
    duration: '33h 30m',
    distance_km: 2182,
    running_days: [1, 2, 3, 4, 5, 6, 7],
    halts: 11,
    classes: [
      { code: '1A', name: 'AC First Class', fare: 5380, avl: 'AVAILABLE 4', status: 'available' },
      { code: '2A', name: 'AC 2 Tier', fare: 3180, avl: 'AVAILABLE 22', status: 'available' },
      { code: '3A', name: 'AC 3 Tier', fare: 2190, avl: 'AVAILABLE 48', status: 'available' },
      { code: 'SL', name: 'Sleeper', fare: 820, avl: 'RAC 12', status: 'rac' }
    ],
    stops: [
      { code: 'NDLS', name: 'New Delhi', arrival: 'Source', departure: '21:05', halt: '—', dist: 0, day: 1 },
      { code: 'AGC', name: 'Agra Cantt', arrival: '23:28', departure: '23:30', halt: '2m', dist: 195, day: 1 },
      { code: 'GWL', name: 'Gwalior Junction', arrival: '01:13', departure: '01:15', halt: '2m', dist: 313, day: 2 },
      { code: 'BPL', name: 'Bhopal Junction', arrival: '06:45', departure: '06:50', halt: '5m', dist: 701, day: 2 },
      { code: 'NGP', name: 'Nagpur Junction', arrival: '13:05', departure: '13:10', halt: '5m', dist: 1091, day: 2 },
      { code: 'MAS', name: 'MGR Chennai Central', arrival: '06:35', departure: 'Destination', halt: '—', dist: 2182, day: 3 }
    ]
  }
];

// Initial mock bookings loaded if none exist in localStorage
const INITIAL_BOOKINGS = [
  {
    pnr: '824-3197430',
    bookingId: 'BKG_1790516935265_707',
    trainNumber: '12402',
    trainName: 'Magadh Express',
    trainType: 'SUPERFAST',
    from: 'NDLS',
    fromName: 'New Delhi',
    to: 'ARA',
    toName: 'Ara Junction',
    date: '2026-09-28',
    departure: '20:10',
    arrival: '10:10',
    travelClass: '3A',
    quota: 'GN',
    status: 'CONFIRMED',
    chartStatus: 'CHART_NOT_PREPARED',
    totalFare: 1387,
    passengers: [
      {
        name: 'Aarav Mehta',
        age: 32,
        gender: 'MALE',
        berthPreference: 'LOWER',
        coach: 'B1',
        berthNo: '12',
        berthType: 'LOWER',
        status: 'CNF / B1 / 12'
      }
    ]
  },
  {
    pnr: '451-9283710',
    bookingId: 'BKG_1790516935265_802',
    trainNumber: '22436',
    trainName: 'Vande Bharat Express',
    trainType: 'VANDE_BHARAT',
    from: 'NDLS',
    fromName: 'New Delhi',
    to: 'BSB',
    toName: 'Varanasi Junction',
    date: '2026-09-29',
    departure: '06:00',
    arrival: '14:00',
    travelClass: 'CC',
    quota: 'GN',
    status: 'CONFIRMED',
    chartStatus: 'CHART_PREPARED',
    totalFare: 1750,
    passengers: [
      {
        name: 'Priya Verma',
        age: 29,
        gender: 'FEMALE',
        berthPreference: 'WINDOW',
        coach: 'C3',
        berthNo: '34',
        berthType: 'WINDOW',
        status: 'CNF / C3 / 34'
      }
    ]
  }
];

// Local Storage Booking Repository
const BookingStore = {
  getAll() {
    const data = localStorage.getItem('bharatrail_bookings');
    if (!data) {
      localStorage.setItem('bharatrail_bookings', JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_BOOKINGS;
    }
  },
  getByPNR(pnr) {
    const list = this.getAll();
    const cleanPNR = pnr.replace(/[^0-9]/g, '');
    return list.find(b => b.pnr.replace(/[^0-9]/g, '') === cleanPNR) || null;
  },
  save(booking) {
    const list = this.getAll();
    list.unshift(booking);
    localStorage.setItem('bharatrail_bookings', JSON.stringify(list));
    return booking;
  },
  cancel(pnr) {
    const list = this.getAll();
    const cleanPNR = pnr.replace(/[^0-9]/g, '');
    const index = list.findIndex(b => b.pnr.replace(/[^0-9]/g, '') === cleanPNR);
    if (index === -1) return null;

    const b = list[index];
    if (b.status === 'CANCELLED') {
      throw new Error('This ticket has already been cancelled.');
    }

    // Cancellation tariff logic based on IRCTC rules
    let cancelCharge = 240; // 3A standard
    if (b.travelClass === '1A' || b.travelClass === 'EC') cancelCharge = 240;
    else if (b.travelClass === '2A') cancelCharge = 200;
    else if (b.travelClass === '3A' || b.travelClass === 'CC' || b.travelClass === '3E') cancelCharge = 180;
    else if (b.travelClass === 'SL') cancelCharge = 120;
    else cancelCharge = 60;

    const refundAmount = Math.max(0, b.totalFare - cancelCharge);

    b.status = 'CANCELLED';
    b.cancellation = {
      cancelledAt: new Date().toISOString(),
      cancellationCharge: cancelCharge,
      refundAmount: refundAmount,
      refundStatus: 'PROCESSED_TO_SOURCE'
    };

    if (b.passengers) {
      b.passengers.forEach(p => {
        p.status = 'CANCELLED';
      });
    }

    localStorage.setItem('bharatrail_bookings', JSON.stringify(list));
    return {
      success: true,
      booking: b,
      refundAmount,
      cancellationCharge: cancelCharge
    };
  }
};
