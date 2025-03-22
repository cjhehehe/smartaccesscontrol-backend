// models/macAddressModel.js

import supabase from '../config/supabase.js';

/**
 * Insert a new MAC record.
 * The payload includes a UTC timestamp (created_at).
 */
export const saveMacAddress = async ({
  guest_id,
  rfid_uid,
  mac,
  ip,
  status,
  created_at
}) => {
  try {
    const payload = {
      mac,
      ip,
      status: status || 'pending',
      created_at: created_at || new Date().toISOString()
    };
    if (guest_id) payload.guest_id = guest_id;
    if (rfid_uid) payload.rfid_uid = rfid_uid;

    const { data, error } = await supabase
      .from('mac_addresses')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[MAC Model] Error saving MAC:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[MAC Model] Unexpected error in saveMacAddress:', err);
    return { data: null, error: err };
  }
};

/**
 * Check if MAC already exists.
 * Returns true if found, false otherwise.
 */
export const checkExistingMac = async (mac) => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .select('id')
      .eq('mac', mac)
      .maybeSingle();

    if (error) {
      console.error('[MAC Model] Error checking existing MAC:', error);
      return false;
    }
    return !!data; // true if data is not null, false if null
  } catch (err) {
    console.error('[MAC Model] Unexpected error in checkExistingMac:', err);
    return false;
  }
};

/**
 * Get all whitelisted MAC addresses (e.g. where status = 'connected' or 'whitelisted').
 */
export const getWhitelistedMacs = async () => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .select('mac')
      .eq('status', 'connected'); // Adjust as needed
    if (error) {
      console.error('[MAC Model] Error fetching whitelisted MACs:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[MAC Model] Unexpected error in getWhitelistedMacs:', err);
    return { data: null, error: err };
  }
};

/**
 * Update the status of a MAC record.
 */
export const updateMacStatus = async (mac, status) => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status })
      .eq('mac', mac)
      .select()
      .single();
    if (error) {
      console.error('[MAC Model] Error updating MAC status:', error);
      return { data: null, error };
    }
    if (!data) {
      return { data: null, error: 'MAC not found or no rows updated' };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[MAC Model] Unexpected error in updateMacStatus:', err);
    return { data: null, error: err };
  }
};
