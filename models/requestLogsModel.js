// models/requestLogsModel.js
import supabase from '../config/supabase.js';

/**
 * Creates a request log entry in the `request_logs` table.
 * Accepts any of the following properties:
 *   - request_id, admin_id, guest_id, log_type, log_message
 * The created_at field defaults to now() in the database.
 */
export const createRequestLog = async ({
  request_id,
  admin_id,
  guest_id,
  log_type,
  log_message
}) => {
  try {
    const insertObj = {
      request_id,
      admin_id,
      guest_id,
      log_type,
      log_message
    };
    const { data, error } = await supabase
      .from('request_logs')
      .insert([insertObj])
      .select('*')
      .single();

    if (error) {
      console.error('[RequestLogsModel] Insert Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RequestLogsModel] Unexpected error in createRequestLog:', err);
    return { data: null, error: err };
  }
};

/**
 * A helper that previously logged only the request payload size.
 * (Now removed because request_size is stored in service_requests.)
 */
export const logRequestSize = async (request_size) => {
  // No longer used. Optionally, you can simply return a resolved promise.
  return Promise.resolve({ data: null, error: null });
};

/**
 * Fetch logs for a specific request (by request_id), ordered descending by created_at.
 */
export const getRequestLogsByRequestId = async (request_id, limit = 10, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('request_logs')
      .select('*')
      .eq('request_id', request_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[RequestLogsModel] Error fetching logs:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RequestLogsModel] Unexpected error in getRequestLogsByRequestId:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch all logs from `request_logs` table, ordered descending by created_at.
 */
export const getAllRequestLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('request_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RequestLogsModel] Error fetching all logs:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RequestLogsModel] Unexpected error in getAllRequestLogs:', err);
    return { data: null, error: err };
  }
};
