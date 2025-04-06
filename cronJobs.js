// cronJobs.js
import cron from 'node-cron';
import fetch from 'node-fetch';
import supabase from './config/supabase.js';
import { createNotification } from './models/notificationModel.js';
import { checkOutRoomById } from './models/roomsModel.js';

const BACKEND_BASE_URL = "https://smartaccesscontrol-backend-production.up.railway.app/api";

// 1) Helper: Get all occupied rooms with a non-null check_out time
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

// 2) Helper: Parse a room's check_out into a Date
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

  const guestTitle = '10 Minutes Left for Your Stay';
  const guestMessage = `Your scheduled check-out time is almost here (Room #${room.room_number}). Please prepare to check out soon.`;

  const adminTitle = 'Guest Check-Out Reminder';
  const adminMessage = `Room #${room.room_number} has only 10 minutes left until check-out.`;

  await createNotification({
    recipient_guest_id: guestId,
    title: guestTitle,
    message: guestMessage,
    notification_type: 'checkout_reminder',
  });

  await createNotification({
    recipient_admin_id: adminId,
    title: adminTitle,
    message: adminMessage,
    notification_type: 'checkout_reminder',
  });

  console.log(`[cronJobs] Sent 10-min warning for room #${room.room_number}`);
}

// 4) Helper: Find the open occupant record in room_occupancy_history
async function findOpenOccupancyRecord(guestId, roomId) {
  try {
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
    return data || null;
  } catch (err) {
    console.error('[cronJobs] Unexpected error in findOpenOccupancyRecord:', err);
    return null;
  }
}

// 5) Helper: POST to checkOutOccupancyHistory
async function checkOutOccupancyHistory(occupancyId, reason = "Auto Check-Out") {
  try {
    const url = `${BACKEND_BASE_URL}/room-occupancy-history/${occupancyId}/checkout`;
    const body = {
      check_out: new Date().toISOString(),
      check_out_reason: reason,
      was_early_checkout: false
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`[cronJobs] Occupancy record ID=${occupancyId} check-out event created: ${data.message}`);
    } else {
      console.error(`[cronJobs] Failed to check-out occupancy ID=${occupancyId}, HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('[cronJobs] checkOutOccupancyHistory error:', err);
  }
}

// -------------- Cron Job: Auto-Checkout and Auto-Deactivation (Runs every 30 seconds) --------------
// Cron pattern '*/30 * * * * *' means every 30 seconds.
cron.schedule('*/30 * * * * *', async () => {
  console.log('[cronJobs] Running auto-checkout and auto-deactivation job...');

  // ----------------- Room Auto-Checkout Logic -----------------
  try {
    const rooms = await getOccupiedRooms();
    if (rooms.length) {
      const now = new Date();

      for (const room of rooms) {
        const checkOutDate = parseCheckOutDate(room.check_out);
        if (!checkOutDate) continue;

        const timeDiff = checkOutDate - now;

        // 1) Send 10-min warning if applicable
        if (timeDiff > 0 && timeDiff <= 10 * 60 * 1000) {
          if (!room.ten_min_warning_sent) {
            await sendTenMinWarning(room);
            const { error } = await supabase
              .from('rooms')
              .update({ ten_min_warning_sent: true })
              .eq('id', room.id);
            if (error) {
              console.error('[cronJobs] Error updating ten_min_warning_sent:', error);
            }
          }
        }

        // 2) Auto-checkout if the check_out time has passed
        if (now >= checkOutDate) {
          // Step A: Check out the room in the "rooms" table
          const result = await checkOutRoomById(room.id, 'Automatic Checkout');
          if (result.success) {
            console.log(`[cronJobs] Auto-checked out Room #${room.room_number}`);

            // Step B: Find the open occupant record in room_occupancy_history
            const occupantRecord = await findOpenOccupancyRecord(room.guest_id, room.id);
            if (occupantRecord) {
              // Step C: Check out the occupant record (creates occupant check-out event)
              await checkOutOccupancyHistory(occupantRecord.id, "Auto Check-Out");
            } else {
              console.log(`[cronJobs] No open occupant record found for guest_id=${room.guest_id} & room_id=${room.id}`);
            }
          } else {
            console.error('[cronJobs] Error auto-checking out room ID:', room.id, result.error);
          }
        }
      }
    }
  } catch (err) {
    console.error('[cronJobs] Error in auto-checkout job:', err);
  }

  // ----------------- Auto-Deactivation for MAC Addresses -----------------
  try {
    console.log('[cronJobs] Triggering auto-deactivation for expired MACs...');
    // NOTE: Remove the trailing `/api` from the default URL so that appending `/api/auto-deactivate-expired` works correctly.
    const PI_GATEWAY_URL = process.env.PI_GATEWAY_URL || "https://pi-gateway.tail1e634e.ts.net";
    const response = await fetch(`${PI_GATEWAY_URL}/api/auto-deactivate-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PUBLIC_API_KEY,
      },
      body: JSON.stringify({})
    });
    const result = await response.json();
    console.log('[cronJobs] Auto-deactivate MACs response:', result.message);
  } catch (err) {
    console.error('[cronJobs] Error in auto-deactivation for MACs:', err.message || err);
  }
});
