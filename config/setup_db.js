import supabase from './supabase.js'; // Adjust path if needed

/**
 * resetDatabase()
 * 
 * Clears or resets specific tables/columns to an initial state:
 *  - Removes data from certain tables (access_logs, activity_logs, feedback_complaints, notifications, service_requests)
 *  - Leaves some tables intact (admins, guests, membership_perks, mac_addresses)
 *  - Resets 'rooms' to status='available' with null guest_id, hours_stay, registration_time, check_in, and check_out
 *  - Resets 'rfid_tags' to status='available' with null guest_id
 *
 * All timestamps are generated in UTC using new Date().toISOString().
 *
 * This script is intended for development/QA environments.
 */
export async function resetDatabase() {
  console.log('[SETUP] Starting database reset...');

  // 1) access_logs: Remove all data
  let { error } = await supabase
    .from('access_logs')
    .delete()
    .gt('id', 0);
  if (error) {
    console.error('[SETUP] Error clearing access_logs:', error);
  } else {
    console.log('[SETUP] access_logs cleared.');
  }

  // 2) activity_logs: Remove all data
  ({ error } = await supabase
    .from('activity_logs')
    .delete()
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error clearing activity_logs:', error);
  } else {
    console.log('[SETUP] activity_logs cleared.');
  }

  // 3) admins: Leave intact
  console.log('[SETUP] admins left intact.');

  // 4) feedback_complaints: Remove all data
  ({ error } = await supabase
    .from('feedback_complaints')
    .delete()
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error clearing feedback_complaints:', error);
  } else {
    console.log('[SETUP] feedback_complaints cleared.');
  }

  // 5) guests: Leave intact
  console.log('[SETUP] guests left intact.');

  // 6) membership_perks: Leave intact
  console.log('[SETUP] membership_perks left intact.');

  // 7) notifications: Remove all data
  ({ error } = await supabase
    .from('notifications')
    .delete()
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error clearing notifications:', error);
  } else {
    console.log('[SETUP] notifications cleared.');
  }

  // 8) rfid_tags: Reset rows (set guest_id to null and status to 'available')
  ({ error } = await supabase
    .from('rfid_tags')
    .update({
      guest_id: null,
      status: 'available'
    })
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error resetting rfid_tags:', error);
  } else {
    console.log('[SETUP] rfid_tags reset.');
  }

  // 9) rooms: Reset rows (set guest_id, hours_stay, registration_time, check_in, check_out to null, status='available')
  ({ error } = await supabase
    .from('rooms')
    .update({
      guest_id: null,
      hours_stay: null,
      registration_time: null,
      check_in: null,
      check_out: null,
      status: 'available'
    })
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error resetting rooms:', error);
  } else {
    console.log('[SETUP] rooms reset.');
  }

  // 10) service_requests: Remove all data
  ({ error } = await supabase
    .from('service_requests')
    .delete()
    .gt('id', 0));
  if (error) {
    console.error('[SETUP] Error clearing service_requests:', error);
  } else {
    console.log('[SETUP] service_requests cleared.');
  }

  // 11) system_settings: Leave intact
  console.log('[SETUP] system_settings left intact.');

  // 12) mac_addresses: Leave intact
  console.log('[SETUP] mac_addresses left intact.');

  console.log('[SETUP] Database reset completed successfully.');
}
