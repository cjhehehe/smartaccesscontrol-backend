// cronJobs.js
import cron from 'node-cron';
import fetch from 'node-fetch';
import supabase from './config/supabase.js';
import { createNotification } from './models/notificationModel.js';
import { checkOutRoomById } from './models/roomsModel.js';

// -------------- Helper for Room Auto-Checkout --------------

/**
 * Fetch all occupied rooms with a non-null check_out time.
 */
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

/**
 * Parse the room's check_out into a JS Date.
 */
function parseCheckOutDate(checkOutString) {
  if (!checkOutString) return null;
  try {
    return new Date(checkOutString);
  } catch (err) {
    console.error('[cronJobs] parseCheckOutDate error:', err);
    return null;
  }
}

/**
 * Send a “10 minutes left” notification to both guest & admin.
 */
async function sendTenMinWarning(room) {
  const guestId = room.guest_id;
  if (!guestId) return;

  // Example: using admin ID = 1 (or you could fetch all admin IDs)
  const adminId = 1;

  const guestTitle = '10 Minutes Left for Your Stay';
  const guestMessage = `Your scheduled check-out time is almost here (Room #${room.room_number}). 
Please prepare to check out soon.`;

  const adminTitle = 'Guest Check-Out Reminder';
  const adminMessage = `Room #${room.room_number} has only 10 minutes left until check-out.`;

  // Send to guest
  await createNotification({
    recipient_guest_id: guestId,
    title: guestTitle,
    message: guestMessage,
    notification_type: 'checkout_reminder',
  });

  // Send to admin
  await createNotification({
    recipient_admin_id: adminId,
    title: adminTitle,
    message: adminMessage,
    notification_type: 'checkout_reminder',
  });

  console.log(`[cronJobs] Sent 10-min warning for room #${room.room_number}`);
}

// -------------- 1) Cron Job: Auto-Checkout (Runs every minute) --------------
cron.schedule('*/1 * * * *', async () => {
  console.log('[cronJobs] Running auto-checkout job...');

  try {
    const rooms = await getOccupiedRooms();
    if (!rooms.length) return;

    const now = new Date();

    for (const room of rooms) {
      const checkOutDate = parseCheckOutDate(room.check_out);
      if (!checkOutDate) continue;

      // 1) Send 10-min warning if applicable
      const tenMinutesInMs = 10 * 60 * 1000;
      const timeDiff = checkOutDate - now;

      if (timeDiff > 0 && timeDiff <= tenMinutesInMs) {
        if (!room.ten_min_warning_sent) {
          await sendTenMinWarning(room);
          // Mark the room so we don't resend the notification
          const { error } = await supabase
            .from('rooms')
            .update({ ten_min_warning_sent: true })
            .eq('id', room.id);
          if (error) {
            console.error('[cronJobs] Error updating ten_min_warning_sent:', error);
          }
        }
      }

      // 2) Auto-checkout if time is up
      if (now >= checkOutDate) {
        await checkOutRoomById(room.id, 'Automatic Checkout');
        console.log(`[cronJobs] Auto-checked out Room #${room.room_number}`);
      }
    }
  } catch (err) {
    console.error('[cronJobs] Error in auto-checkout job:', err);
  }

  // -------------- 2) Cron Job: Trigger Pi Auto-Deactivate Endpoint --------------
  try {
    console.log('[cronJobs] Triggering Pi auto-deactivate endpoint...');
    // Use the environment variable PI_GATEWAY_URL if set; otherwise, default to the below URL.
    const PI_GATEWAY_URL = process.env.PI_GATEWAY_URL || "https://pi-gateway.tail1e634e.ts.net/api";
    const response = await fetch(`${PI_GATEWAY_URL}/auto-deactivate-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PUBLIC_API_KEY, // Secure API key
      },
      body: JSON.stringify({}) // No payload needed
    });
    const data = await response.json();
    console.log('[cronJobs] Pi auto-deactivate response:', data.message);
  } catch (err) {
    console.error('[cronJobs] Error calling Pi auto-deactivate endpoint:', err);
  }
});
