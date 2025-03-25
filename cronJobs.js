// cronJobs.js
import cron from 'node-cron';
import supabase from './config/supabase.js';
import { createNotification } from './models/notificationModel.js';
import { checkOutRoomById } from './models/roomsModel.js'; 
// We'll call checkOutRoomById(...) with reason="Automatic Checkout" to unify the logic.

// Helper to fetch rooms that are occupied and have a check_out time
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

// Helper to parse the room's check_out into a JS Date
function parseCheckOutDate(checkOutString) {
  if (!checkOutString) return null;
  try {
    return new Date(checkOutString);
  } catch (err) {
    console.error('[cronJobs] parseCheckOutDate error:', err);
    return null;
  }
}

// Helper to send a “10 minutes left” notification to both guest & admin
async function sendTenMinWarning(room) {
  const guestId = room.guest_id;
  if (!guestId) return;

  // Example admin ID=1, or you could do a fetchAllAdminIds if you prefer
  const adminId = 1; 

  const guestTitle = '10 Minutes Left for Your Stay';
  const guestMessage = `Your scheduled check-out time is almost here (Room #${room.room_number}). 
Please prepare to check out soon.`;

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

// Runs every minute
cron.schedule('*/1 * * * *', async () => {
  console.log('[cronJobs] Running auto-checkout job...');
  try {
    const rooms = await getOccupiedRooms();
    if (!rooms.length) return;

    const now = new Date();

    for (const room of rooms) {
      const checkOutDate = parseCheckOutDate(room.check_out);
      if (!checkOutDate) continue;

      // 1) 10-min warning
      const tenMinutesInMs = 10 * 60 * 1000;
      const timeDiff = checkOutDate - now;
      if (timeDiff > 0 && timeDiff <= tenMinutesInMs) {
        if (!room.ten_min_warning_sent) {
          await sendTenMinWarning(room);
          // Mark the room so we don't resend the same notification
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
        // We call the unified function
        await checkOutRoomById(room.id, 'Automatic Checkout');
        console.log(`[cronJobs] Auto-checked out Room #${room.room_number}`);
      }
    }
  } catch (err) {
    console.error('[cronJobs] Error in auto-checkout job:', err);
  }
});
