// models/rfidModel.js
import supabase from '../config/supabase.js';

/**
 * Find an RFID by its UID.
 * Only selects columns that actually exist in rfid_tags: id, rfid_uid, guest_id, status, created_at.
 */
export const findRFIDByUID = async (rfid_uid) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .select('id, rfid_uid, guest_id, status, created_at')
      .eq('rfid_uid', rfid_uid)
      .maybeSingle();

    if (error) {
      console.error('[findRFIDByUID] Error finding RFID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[findRFIDByUID] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Get all RFID tags (id, rfid_uid, guest_id, status, created_at).
 */
export const getAllRFIDs = async () => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .select('id, rfid_uid, guest_id, status, created_at');
    if (error) {
      console.error('[getAllRFIDs] Error fetching RFID tags:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[getAllRFIDs] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Get all available RFID tags (status = 'available').
 */
export const getAvailableRFIDs = async () => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .select('id, rfid_uid, guest_id, status, created_at')
      .eq('status', 'available');
    if (error) {
      console.error('[getAvailableRFIDs] Error fetching available RFID tags:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[getAvailableRFIDs] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Assign an RFID to a guest (set status -> 'assigned').
 */
export const assignRFIDToGuest = async (rfid_uid, guest_id) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .update({
        guest_id,
        status: 'assigned',
      })
      .eq('rfid_uid', rfid_uid)
      .eq('status', 'available')
      .select('id, rfid_uid, guest_id, status, created_at')
      .maybeSingle();
    if (error) {
      console.error('[assignRFIDToGuest] Error assigning RFID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[assignRFIDToGuest] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Activate an RFID (set status -> 'active').
 */
export const activateRFID = async (rfid_uid) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .update({ status: 'active' })
      .eq('rfid_uid', rfid_uid)
      .eq('status', 'assigned')
      .select('id, rfid_uid, guest_id, status, created_at')
      .maybeSingle();
    if (error) {
      console.error('[activateRFID] Error activating RFID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[activateRFID] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Mark an RFID as lost (set status -> 'lost').
 */
export const markRFIDLost = async (rfid_uid) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .update({ status: 'lost' })
      .eq('rfid_uid', rfid_uid)
      .neq('status', 'lost')
      .select('id, rfid_uid, guest_id, status, created_at')
      .maybeSingle();
    if (error) {
      console.error('[markRFIDLost] Error marking RFID lost:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[markRFIDLost] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Unassign an RFID (set guest_id to null and status -> 'available').
 */
export const unassignRFID = async (rfid_uid) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .update({
        guest_id: null,
        status: 'available',
      })
      .eq('rfid_uid', rfid_uid)
      .select('id, rfid_uid, guest_id, status, created_at')
      .maybeSingle();
    if (error) {
      console.error('[unassignRFID] Error unassigning RFID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[unassignRFID] Unexpected error:', err);
    return { data: null, error: err };
  }
};

/**
 * Reset all RFID tags for a specific guest to 'available'.
 */
export const resetRFIDByGuest = async (guest_id) => {
  try {
    const { data, error } = await supabase
      .from('rfid_tags')
      .update({
        guest_id: null,
        status: 'available',
      })
      .match({ guest_id })
      .select('id, rfid_uid, guest_id, status, created_at');
    if (error) {
      console.error('[resetRFIDByGuest] Error resetting RFID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[resetRFIDByGuest] Unexpected error:', err);
    return { data: null, error: err };
  }
};
