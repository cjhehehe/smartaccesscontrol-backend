// cronJobs.js
import cron from 'node-cron';
import fetch from 'node-fetch';
import supabase from './config/supabase.js';
import { createNotification } from './models/notificationModel.js';
import { checkOutRoomById } from './models/roomsModel.js';

const BACKEND_BASE_URL =
  "https://smartaccesscontrol-backend-production.up.railway.app/api";

// —————————————————————————————————————————————————————————————————————————————
// AUTO-CHECKOUT LOGIC (every 30s)
// —————————————————————————————————————————————————————————————————————————————

// 1) Get all occupied rooms with a non-null check_out
async function getOccupiedRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'occupied')
    .not('check_out', 'is', null);

  if (error) {
    console.error('[cronJobs] getOccupiedRooms error:', error);
    return [];
  }
  return data;
}

// 2) Parse a room's check_out into a Date
function parseCheckOutDate(checkOutString) {
  if (!checkOutString) return null;
  try {
    return new Date(checkOutString);
  } catch (err) {
    console.error('[cronJobs] parseCheckOutDate error:', err);
    return null;
  }
}

// 3) Send a “10 minutes left” warning if time is almost up
async function sendTenMinWarning(room) {
  const guestId = room.guest_id;
  if (!guestId) return;
  const adminId = 1; // or fetch dynamically

  await createNotification({
    recipient_guest_id: guestId,
    title: '10 Minutes Left for Your Stay',
    message: `Your check-out is in 10 minutes (Room #${room.room_number}).`,
    notification_type: 'checkout_reminder',
  });
  await createNotification({
    recipient_admin_id: adminId,
    title: 'Guest Check-Out Reminder',
    message: `Room #${room.room_number} has 10 minutes left.`,
    notification_type: 'checkout_reminder',
  });
  console.log(`[cronJobs] Sent 10-min warning for room #${room.room_number}`);
}

// 4) Find the open occupant record in room_occupancy_history
async function findOpenOccupancyRecord(guestId, roomId) {
  const { data, error } = await supabase
    .from('room_occupancy_history')
    .select('*')
    .eq('guest_id', guestId)
    .eq('room_id', roomId)
    .is('check_out', null)
    .maybeSingle();

  if (error) {
    console.error('[cronJobs] findOpenOccupancyRecord error:', error);
    return null;
  }
  return data;
}

// 5) POST to checkOutOccupancyHistory
async function checkOutOccupancyHistory(occupancyId, reason = "Auto Check-Out") {
  try {
    const url = `${BACKEND_BASE_URL}/room-occupancy-history/${occupancyId}/checkout`;
    const body = {
      check_out: new Date().toISOString(),
      check_out_reason: reason,
      was_early_checkout: false,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const payload = await res.json();
      console.log(
        `[cronJobs] Occupancy ID=${occupancyId} checked out: ${payload.message}`
      );
    } else {
      console.error(
        `[cronJobs] Failed occupancy checkout ID=${occupancyId}, HTTP ${res.status}`
      );
    }
  } catch (err) {
    console.error('[cronJobs] checkOutOccupancyHistory error:', err);
  }
}

// -------------- Cron Job: Auto-Checkout (Runs every 30 seconds) --------------
cron.schedule('*/30 * * * * *', async () => {
  console.log('[cronJobs] Running auto-checkout job...');
  try {
    const rooms = await getOccupiedRooms();
    const now = new Date();

    for (const r of rooms) {
      const coDate = parseCheckOutDate(r.check_out);
      if (!coDate) continue;
      const diff = coDate - now;

      // → 10-min warning
      if (diff > 0 && diff <= 10 * 60 * 1000 && !r.ten_min_warning_sent) {
        await sendTenMinWarning(r);
        const { error } = await supabase
          .from('rooms')
          .update({ ten_min_warning_sent: true })
          .eq('id', r.id);
        if (error)
          console.error('[cronJobs] Error flagging ten_min_warning_sent:', error);
      }

      // → Auto-checkout
      if (now >= coDate) {
        const res = await checkOutRoomById(r.id, 'Automatic Checkout');
        if (res.success) {
          console.log(`[cronJobs] Auto-checked out Room #${r.room_number}`);
          const occ = await findOpenOccupancyRecord(r.guest_id, r.id);
          if (occ) await checkOutOccupancyHistory(occ.id, "Auto Check-Out");
        } else {
          console.error('[cronJobs] Error auto-checking out room:', r.id, res.error);
        }
      }
    }
  } catch (err) {
    console.error('[cronJobs] Error in auto-checkout job:', err);
  }

  // → Pi Auto-Deactivate (only if configured)
  const PI_URL = process.env.PI_GATEWAY_URL;
  const API_KEY = process.env.PUBLIC_API_KEY;
  if (!PI_URL || !API_KEY) {
    console.log(
      '[cronJobs] Skipping Pi auto-deactivate: PI_GATEWAY_URL or PUBLIC_API_KEY not set.'
    );
    return;
  }

  try {
    console.log('[cronJobs] Triggering Pi auto-deactivate…');
    const resp = await fetch(`${PI_URL}/auto-deactivate-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({}),
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const payload = await resp.json();
    console.log('[cronJobs] Pi auto-deactivate response:', payload.message);
  } catch (err) {
    console.warn('[cronJobs] Pi auto-deactivate failed, skipping:', err.message);
  }
});

// —————————————————————————————————————————————————————————————————————————————
// HOUSEKEEPING LOGIC (every hour)
// —————————————————————————————————————————————————————————————————————————————

async function cleanupStaleMacs() {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const { error } = await supabase
    .from('mac_addresses')
    .delete()
    .eq('status', 'unauthenticated')
    .lt('created_at', cutoff);
  if (error) console.error('[Housekeeping] stale mac_addresses:', error);
  else console.log('[Housekeeping] cleaned stale mac_addresses');
}

async function cleanupNoShows() {
  const Xmin = 15; // minutes
  const cutoff = new Date(Date.now() - Xmin * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('room_occupancy_history')
    .delete()
    .eq('event_indicator', 'registered')
    .is('check_in', null)
    .lt('registration_time', cutoff);
  if (error) console.error('[Housekeeping] no-shows:', error);
  else console.log('[Housekeeping] removed no-shows');
}

async function cleanupServiceRequests() {
  const cutoff = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase
    .from('service_requests')
    .delete()
    .in('status', ['completed', 'rejected'])
    .lt('created_at', cutoff);
  if (error) console.error('[Housekeeping] old service_requests:', error);
  else console.log('[Housekeeping] purged old service_requests');
}

async function cleanupNotifications() {
  const cutoff = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .or(`read.eq.true,created_at.lt.${cutoff}`);
  if (error) console.error('[Housekeeping] old notifications:', error);
  else console.log('[Housekeeping] pruned notifications');
}

async function cleanupRequestLogs() {
  const cutoff = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase
    .from('request_logs')
    .delete()
    .lt('created_at', cutoff);
  if (error) console.error('[Housekeeping] old request_logs:', error);
  else console.log('[Housekeeping] cleaned request_logs');
}

async function cleanupOrphanedReservations() {
  const nowIso = new Date().toISOString();
  const { data: rooms, error: fetchErr } = await supabase
    .from('rooms')
    .select('id,room_number')
    .eq('status', 'reserved')
    .lt('check_in', nowIso);

  if (fetchErr) {
    console.error(
      '[Housekeeping] fetch orphaned reservations:',
      fetchErr
    );
    return;
  }
  for (const r of rooms) {
    const res = await checkOutRoomById(r.id, 'No-show cleanup');
    if (res.success) {
      console.log(`[Housekeeping] reset reserved Room #${r.room_number}`);
    } else {
      console.error('[Housekeeping] error resetting room:', r.id, res.error);
    }
  }
}

// Hourly housekeeping
cron.schedule('0 * * * *', async () => {
  console.log('[Housekeeping] running hourly cleanup…');
  await cleanupStaleMacs();
  await cleanupNoShows();
  await cleanupServiceRequests();
  await cleanupNotifications();
  await cleanupRequestLogs();
  await cleanupOrphanedReservations();
});
