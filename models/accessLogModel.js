// models/accessLogModel.js

import supabase from '../config/supabase.js';

/**
 * Save Access Granted
 * Now includes the 'latency' field (in milliseconds).
 */
export const saveAccessGranted = async (rfid_uid, guest_id, timestamp, latency) => {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .insert([
        {
          rfid_uid,
          guest_id,
          access_status: 'granted',
          door_unlocked: true,
          timestamp, // UTC timestamp
          latency: latency || 0,
        },
      ])
      .select('id, rfid_uid, guest_id, access_status, door_unlocked, timestamp, latency')
      .single();

    if (error) {
      console.error('[saveAccessGranted] Error:', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('[saveAccessGranted] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Save Access Denied
 * Now includes the 'latency' field (in milliseconds).
 */
export const saveAccessDenied = async (rfid_uid, timestamp, latency) => {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .insert([
        {
          rfid_uid,
          guest_id: null,
          access_status: 'denied',
          door_unlocked: false,
          timestamp, // UTC timestamp
          latency: latency || 0,
        },
      ])
      .select('id, rfid_uid, access_status, door_unlocked, timestamp, latency')
      .single();

    if (error) {
      console.error('[saveAccessDenied] Error:', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('[saveAccessDenied] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Get Access Logs for a Given Guest ID
 * Retrieves paginated access log entries including latency.
 */
export const getAccessLogs = async (guest_id, limit = 10, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('id, rfid_uid, guest_id, access_status, door_unlocked, timestamp, latency')
      .eq('guest_id', guest_id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[getAccessLogs] Error:', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('[getAccessLogs] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * (Optional) Get count of recent 'denied' entries for a specific RFID within X minutes.
 * (Not used for alerts at this stage.)
 */
export const getRecentDenialsForRFID = async (rfid_uid, timeWindowMinutes = 10) => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindowMinutes * 60000).toISOString();

    const { count, error } = await supabase
      .from('access_logs')
      .select('id, rfid_uid', { count: 'exact', head: true })
      .eq('rfid_uid', rfid_uid)
      .eq('access_status', 'denied')
      .gte('timestamp', cutoff);

    if (error) {
      console.error('[getRecentDenialsForRFID] Error:', error);
      return { count: 0, error };
    }
    return { count: count || 0 };
  } catch (err) {
    console.error('[getRecentDenialsForRFID] Unexpected error:', err);
    return { count: 0, error: err };
  }
};
