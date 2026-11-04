// test-decline-flow.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  const base = 'http://localhost:3000';
  console.log('--- Testing Decline Ride & Single Active Ride Logic ---');

  // Step 0: Clean slate
  await fetch(`${base}/api/uber/rides`, { method: 'DELETE' });

  // Step 1: Rider creates a ride
  const createRes = await fetch(`${base}/api/uber/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'RIDE_DECLINE_101',
      riderName: 'Aman Gupta',
      riderRating: 4.9,
      pickupAddress: 'Connaught Place, New Delhi',
      dropoffAddress: 'IGI Airport T3',
      fareInr: 450,
      status: 'PENDING',
      paymentMode: 'GOOGLE_PAY_UPI'
    })
  });
  const created = await createRes.json();
  console.log('[1] Created ride:', created.ride?.id, 'Status:', created.ride?.status);

  // Step 2: Driver sees pending ride
  const query1 = await fetch(`${base}/api/uber/rides`).then(r => r.json());
  console.log('[2] Active ride dispatched:', query1.activeRide?.id, 'Status:', query1.activeRide?.status);

  // Step 3: Driver declines the ride
  const declineRes = await fetch(`${base}/api/uber/rides`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: 'RIDE_DECLINE_101',
      status: 'CANCELLED'
    })
  });
  const declined = await declineRes.json();
  console.log('[3] Declined ride response:', declined.success, 'Status:', declined.ride?.status);

  // Step 4: Driver queries active ride again
  const query2 = await fetch(`${base}/api/uber/rides`).then(r => r.json());
  const activeAfterDecline = query2.activeRide;
  console.log('[4] Active ride after decline:', activeAfterDecline?.id || 'NULL (Clean/No active ride)');

  if (!activeAfterDecline || activeAfterDecline.id !== 'RIDE_DECLINE_101') {
    console.log('✅ PASS: Ride was successfully declined and is no longer an active dispatch!');
  } else {
    console.error('❌ FAIL: Declined ride still returned as active dispatch!');
  }

  // Step 5: Clean slate
  await fetch(`${base}/api/uber/rides`, { method: 'DELETE' });
  console.log('--- Decline Test Completed Successfully ---');
}

run();
