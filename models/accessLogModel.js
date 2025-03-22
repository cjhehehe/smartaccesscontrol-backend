// models/accessLogsModel.js
import supabase from '../config/supabase.js';

/**
 * Save Access Granted
 */
export const saveAccessGranted = async (rfid_uid, guest_id, timestamp) => {
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
        },
      ])
      .select('id, rfid_uid, guest_id, access_status, door_unlocked, timestamp')
      .single();

    if (error) {
      console.error('Database error (saving access granted):', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error in saveAccessGranted:', err);
    return { data: null, error: err };
  }
};

/**
 * Save Access Denied
 */
export const saveAccessDenied = async (rfid_uid, timestamp) => {
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
        },
      ])
      .select('id, rfid_uid, access_status, door_unlocked, timestamp')
      .single();

    if (error) {
      console.error('Database error (saving access denied):', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error in saveAccessDenied:', err);
    return { data: null, error: err };
  }
};

/**
 * Get Access Logs for a Given Guest ID
 */
export const getAccessLogs = async (guest_id, limit = 10, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('id, rfid_uid, guest_id, access_status, door_unlocked, timestamp')
      .eq('guest_id', guest_id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error (fetching access logs):', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error in getAccessLogs:', err);
    return { data: null, error: err };
  }
};
