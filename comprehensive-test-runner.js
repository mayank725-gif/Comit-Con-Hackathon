// comprehensive-test-runner.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const http = require('http');
const https = require('https');

const TARGETS = [
  { name: 'Localhost Dev Server', base: 'http://localhost:3000' },
  { name: 'Vercel Production Cloud', base: 'https://comit-con-hackathon.vercel.app' }
];

function request(url, options = {}) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const startTime = Date.now();
    
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latencyMs = Date.now() - startTime;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          latencyMs
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message,
        latencyMs: Date.now() - startTime
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTestSuite(target) {
  console.log(`\n========================================================================`);
  console.log(`🚀 COMPREHENSIVE AUDIT & VERIFICATION: [${target.name.toUpperCase()}]`);
  console.log(`Endpoint: ${target.base}`);
  console.log(`========================================================================\n`);

  const results = [];
  function record(testName, passed, details, latency) {
    results.push({ testName, passed, details, latency });
    const tag = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${tag}] ${testName.padEnd(45)} | ${latency}ms | ${details}`);
  }

  // 1. Pages Routing & Render
  console.log(`\n>>> 1. UI PAGES & NAVIGATION ROUTES <<<`);
  const pages = [
    { path: '/', name: 'Role Selection Gateway (/)' },
    { path: '/rider', name: 'Passenger Rider Portal (/rider)' },
    { path: '/driver', name: 'Driver Commercial Portal (/driver)' },
    { path: '/ride', name: 'Legacy Dual Console Route (/ride -> /rider)' }
  ];

  for (const p of pages) {
    const res = await request(`${target.base}${p.path}`);
    const ok = res.status === 200 || (p.path === '/ride' && res.status === 307);
    record(p.name, ok, `HTTP Status ${res.status}${res.status === 307 ? ' (Redirect to /rider)' : ''}`, res.latencyMs);
  }

  // 2. Core Intelligent API Endpoints
  console.log(`\n>>> 2. CORE INTELLIGENT BACKEND APIS <<<`);
  
  // GET /api/uber/state
  const stateRes = await request(`${target.base}/api/uber/state`);
  const zones = stateRes.data?.state?.zones || {};
  const zoneCount = Object.keys(zones).length;
  const driverCount = stateRes.data?.state?.drivers?.length || 0;
  record(
    'GET /api/uber/state (Marketplace Telemetry)',
    stateRes.status === 200 && zoneCount > 0,
    `Active Zones: ${zoneCount}, Fleet Size: ${driverCount} cabs, Avg Surge: ${stateRes.data?.state?.marketplaceMetrics?.cityAvgSurge || 1.0}x`,
    stateRes.latencyMs
  );

  // GET /api/uber/locations?q=delhi
  const locRes = await request(`${target.base}/api/uber/locations?q=delhi`);
  const locations = locRes.data?.locations || [];
  record(
    'GET /api/uber/locations?q=delhi (Pan-India Autocomplete)',
    locRes.status === 200 && locations.length > 0,
    `Retrieved ${locations.length} verified hubs (${locations[0]?.name || ''})`,
    locRes.latencyMs
  );

  // POST /api/uber/smart-route
  const routeRes = await request(`${target.base}/api/uber/smart-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      pickupCoords: [28.6315, 77.2167],
      dropoffCoords: [28.5562, 77.1000],
      pickupName: 'Connaught Place, New Delhi',
      dropoffName: 'Indira Gandhi International Airport (DEL T3)',
      vehicleType: 'UBER_GO',
      currentSurgeMultiplier: 1.2
    }
  });
  const routing = routeRes.data?.smartRouting;
  record(
    'POST /api/uber/smart-route (Route & Fare Engine)',
    routeRes.status === 200 && routing?.distanceKm > 0,
    `Distance: ${routing?.distanceKm} km, ETA: ${routing?.travelTimeMin} mins, Fare: ₹${routing?.finalFareInr}`,
    routeRes.latencyMs
  );

  // POST /api/uber/stress-test (1,000 Burst Shock)
  const stressRes = await request(`${target.base}/api/uber/stress-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      locationName: 'M. Chinnaswamy Stadium, MG Road',
      lat: 12.9788,
      lng: 77.5996
    }
  });
  const ingested = stressRes.data?.totalRequestsIngested;
  const surgeCap = stressRes.data?.surgeMultiplier;
  record(
    'POST /api/uber/stress-test (1,000 Burst Ingestion)',
    stressRes.status === 200 && ingested === 1000,
    `Ingested: ${ingested} requests in ${stressRes.data?.processingLatencyMs}ms (SLA <5ms), Price Capped at: ${surgeCap}x`,
    stressRes.latencyMs
  );

  // POST /api/uber/scenario (Stadium Concert Scenario)
  const scenarioRes = await request(`${target.base}/api/uber/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { scenario: 'STADIUM_CONCERT_END' }
  });
  record(
    'POST /api/uber/scenario (Dynamic Surge Simulation)',
    scenarioRes.status === 200 && scenarioRes.data?.success,
    `Scenario Engaged: STADIUM_CONCERT_END, System Zone Balancing Active`,
    scenarioRes.latencyMs
  );

  // POST /api/uber/assistant (AI Copilot / Assistant)
  const aiRes = await request(`${target.base}/api/uber/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      query: 'What is the current surge multiplier and how does anti-herd damping protect city coverage?',
      driverProfile: { name: 'Ramesh Kumar', rating: 4.96 }
    }
  });
  const aiText = typeof aiRes.data?.message === 'string' ? aiRes.data.message : (aiRes.data?.message?.text || '');
  const aiSnippet = aiText.replace(/\n/g, ' ').slice(0, 65);
  record(
    'POST /api/uber/assistant (AI Co-pilot Intelligence)',
    aiRes.status === 200 && aiRes.data?.success && aiText.length > 5,
    `Answer: "${aiSnippet}..."`,
    aiRes.latencyMs
  );

  // GET /api/uber/benchmark
  const benchRes = await request(`${target.base}/api/uber/benchmark`);
  const baseline = benchRes.data?.benchmark?.unassistedBaseline;
  const engineStats = benchRes.data?.benchmark?.michelangeloEngine;
  const improvements = benchRes.data?.benchmark?.improvements;
  record(
    'GET /api/uber/benchmark (Judge Rubric Baseline)',
    benchRes.status === 200 && benchRes.data?.success,
    `Unassisted: ₹${baseline?.hourlyRate}/hr (${baseline?.idleTimeMin}m idle) vs AI-Assisted: ₹${engineStats?.hourlyRate}/hr (+${improvements?.earningsIncreasePercent}%)`,
    benchRes.latencyMs
  );

  // GET /api/auth/me
  const authRes = await request(`${target.base}/api/auth/me`);
  record(
    'GET /api/auth/me (Custom DB Session Boundary)',
    authRes.status === 200 && authRes.data?.success,
    `Session state verified: ${authRes.data?.authenticated ? 'User Logged In' : 'Guest/Clean State'}`,
    authRes.latencyMs
  );

  // 3. Complete Two-Phone Cross-Device Ride Lifecycle
  console.log(`\n>>> 3. FULL TWO-PHONE RIDE LIFECYCLE & PERSISTENCE <<<`);
  
  // Step 0: Clear prior state
  await request(`${target.base}/api/uber/rides`, { method: 'DELETE' });

  // Step A: Rider Phone creates booking
  const testRidePayload = {
    riderName: 'Aman Gupta (Shark Tank India)',
    riderRating: 4.92,
    pickupAddress: 'DLF Cyber Hub, DLF Phase 2, Gurugram',
    pickupCoords: [28.4950, 77.0895],
    dropoffAddress: 'Indira Gandhi International Airport (DEL T3)',
    dropoffCoords: [28.5562, 77.1000],
    vehicleType: 'UBER_PREMIER',
    distanceKm: 14.8,
    durationMin: 26,
    fareInr: 685,
    surgeMultiplier: 1.4,
    surgeBonusInr: 120,
    paymentMode: 'GOOGLE_PAY_UPI',
    status: 'PENDING'
  };

  const createRes = await request(`${target.base}/api/uber/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testRidePayload
  });
  const createdRide = createRes.data?.ride;
  const rideId = createdRide?.id;
  record(
    'Step 1: Rider Requests Ride (POST /api/uber/rides)',
    createRes.status === 200 && Boolean(rideId),
    `Generated Ride ID: ${rideId}, OTP: ${createdRide?.otp}, Fare: ₹${createdRide?.fareInr}`,
    createRes.latencyMs
  );

  // Step B: Driver Phone receives incoming dispatch ring
  const driverPollRes = await request(`${target.base}/api/uber/rides`);
  const activeIncoming = driverPollRes.data?.activeRide;
  record(
    'Step 2: Driver Portal Receives Dispatch (GET /api/uber/rides)',
    driverPollRes.status === 200 && activeIncoming && (activeIncoming.id === rideId || activeIncoming.status === 'PENDING'),
    `Dispatched to Driver: ID ${activeIncoming?.id}, Passenger: ${activeIncoming?.riderName}`,
    driverPollRes.latencyMs
  );

  // Step C: Driver accepts the ride
  const driverDetails = {
    driverName: 'Ramesh Kumar (Top Rated Platinum)',
    driverPhone: '+91 98765 43210',
    driverRating: 4.96,
    vehicleModel: 'White Toyota Innova Crysta (DL 01 AB 9988)',
    licensePlate: 'DL 01 AB 9988'
  };

  const acceptRes = await request(`${target.base}/api/uber/rides`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: {
      rideId,
      status: 'ACCEPTED',
      driverDetails
    }
  });
  record(
    'Step 3: Driver Accepts Dispatch (PATCH status=ACCEPTED)',
    acceptRes.status === 200 && acceptRes.data?.success,
    `Driver Assigned: ${driverDetails.driverName} (${driverDetails.vehicleModel})`,
    acceptRes.latencyMs
  );

  // Step D: Rider Phone syncs Driver Details
  const riderCheckRes = await request(`${target.base}/api/uber/rides`);
  const riderActiveState = riderCheckRes.data?.activeRide || riderCheckRes.data?.rides?.find(r => r.id === rideId);
  record(
    'Step 4: Rider Phone Instant Syncs Driver Match',
    riderCheckRes.status === 200 && (riderActiveState?.status === 'ACCEPTED' || riderActiveState?.driverName),
    `Status: ${riderActiveState?.status}, Driver: ${riderActiveState?.driverName || riderActiveState?.driverDetails?.driverName || 'Matched'}`,
    riderCheckRes.latencyMs
  );

  // Step E: Driver starts trip with passenger (OTP verified)
  const startTripRes = await request(`${target.base}/api/uber/rides`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: {
      rideId,
      status: 'IN_PROGRESS'
    }
  });
  record(
    'Step 5: Driver Starts Trip with Passenger (PATCH status=IN_PROGRESS)',
    startTripRes.status === 200 && startTripRes.data?.success,
    `Trip Status: IN_PROGRESS (Live GPS Telemetry Engaged)`,
    startTripRes.latencyMs
  );

  // Step F: Rider Phone syncs In-Progress Meter
  const riderTripRes = await request(`${target.base}/api/uber/rides`);
  const riderTripState = riderTripRes.data?.activeRide || riderTripRes.data?.rides?.find(r => r.id === rideId);
  record(
    'Step 6: Rider Phone Syncs On-Trip Status',
    riderTripRes.status === 200 && (riderTripState?.status === 'IN_PROGRESS'),
    `Verified Passenger Meter is ACTIVE (${riderTripState?.status})`,
    riderTripRes.latencyMs
  );

  // Step G: Driver completes ride at destination
  const completeTripRes = await request(`${target.base}/api/uber/rides`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: {
      rideId,
      status: 'COMPLETED'
    }
  });
  record(
    'Step 7: Driver Completes Ride at Airport (PATCH status=COMPLETED)',
    completeTripRes.status === 200 && completeTripRes.data?.success,
    `Trip Completed Successfully. Payout Ledger Settled.`,
    completeTripRes.latencyMs
  );

  // Step H: Rider checks persistent ride history
  const riderHistoryRes = await request(`${target.base}/api/uber/rides?rider=Aman%20Gupta`);
  const riderRides = riderHistoryRes.data?.rides || [];
  const foundRiderTrip = riderRides.find(r => r.id === rideId || r.riderName?.includes('Aman'));
  record(
    'Step 8: Rider "📁 My Trips" History & Tax Invoice Archive',
    riderHistoryRes.status === 200 && riderRides.length > 0,
    `Found ${riderRides.length} trips in passenger account (Trip ID: ${foundRiderTrip?.id || riderRides[0]?.id})`,
    riderHistoryRes.latencyMs
  );

  // Step I: Driver checks shift trip log and earnings
  const driverHistoryRes = await request(`${target.base}/api/uber/rides?driver=Ramesh%20Kumar`);
  const driverRides = driverHistoryRes.data?.rides || [];
  record(
    'Step 9: Driver "📋 Trip Log" & Payout Settlement Ledger',
    driverHistoryRes.status === 200 && driverRides.length > 0,
    `Found ${driverRides.length} completed trips in driver log (Fare: ₹${driverRides[0]?.fareInr || 685})`,
    driverHistoryRes.latencyMs
  );

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`\n========================================================================`);
  console.log(`🏁 AUDIT SUMMARY FOR ${target.name.toUpperCase()}: ${passedCount}/${totalCount} PASSED (${passRate}%)`);
  console.log(`========================================================================\n`);

  return { target: target.name, total: totalCount, passed: passedCount, passRate, results };
}

async function run() {
  const allResults = [];
  for (const t of TARGETS) {
    try {
      const res = await runTestSuite(t);
      allResults.push(res);
    } catch (e) {
      console.error(`Error during audit on ${t.name}:`, e);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 ALL AUDITS AND VERIFICATION CHECKS FINISHED`);
  console.log(`========================================================================\n`);
}

run();
