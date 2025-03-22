// models/activityLogModel.js
import supabase from '../config/supabase.js';

/**
 * Insert a new service request log into the `activity_logs` table.
 * All date/time values are stored in UTC using new Date().toISOString().
 */
export const saveActivityLog = async ({
  request_id,
  admin_id,
  guest_id,
  log_type,
  log_message,
  timestamp,
}) => {
  try {
    // Build the log object – all timestamps are in UTC.
    const insertObj = {
      request_id,
      log_type,
      log_message,
      created_at: timestamp || new Date().toISOString(),
    };
    if (admin_id) insertObj.admin_id = admin_id;
    if (guest_id) insertObj.guest_id = guest_id;

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([insertObj])
      .select('*')
      .single();

    if (error) {
      console.error('Database error (saving activity log):', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error in saveActivityLog:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch logs for a given service request from `activity_logs`.
 * The logs are ordered by the UTC timestamp (created_at).
 */
export const getActivityLogs = async (request_id, limit = 10, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('request_id', request_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error (fetching activity logs):', error);
      return { data: null, error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error in getActivityLogs:', err);
    return { data: null, error: err };
  }
};
