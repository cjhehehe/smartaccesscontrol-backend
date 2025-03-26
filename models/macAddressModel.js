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
      mac,             // DB column is "mac"
      ip,
      status: status || 'pending',
      created_at: created_at || new Date().toISOString(),
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
 * Check if a MAC record already exists.
 * Returns the existing row if found, null otherwise.
 */
export const findMacRecord = async (mac) => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('mac', mac)
      .maybeSingle();

    if (error) {
      console.error('[MAC Model] Error finding MAC record:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[MAC Model] Unexpected error in findMacRecord:', err);
    return null;
  }
};

/**
 * Update the status of an existing MAC record.
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

/**
 * Upsert logic: If MAC doesn't exist, create it with the given status.
 * If it exists, update the status.
 */
export const upsertMacAddress = async (mac, status) => {
  try {
    const existingRecord = await findMacRecord(mac);
    if (!existingRecord) {
      // Insert a new record with minimal fields
      const { data, error } = await supabase
        .from('mac_addresses')
        .insert([{ mac, status }])
        .select()
        .single();
      if (error) {
        console.error('[MAC Model] Error inserting new MAC record:', error);
        return { data: null, error };
      }
      return { data, error: null };
    } else {
      // Update existing
      const { data, error } = await supabase
        .from('mac_addresses')
        .update({ status })
        .eq('mac', mac)
        .select()
        .single();
      if (error) {
        console.error('[MAC Model] Error updating existing MAC record:', error);
        return { data: null, error };
      }
      return { data, error: null };
    }
  } catch (err) {
    console.error('[MAC Model] Unexpected error in upsertMacAddress:', err);
    return { data: null, error: err };
  }
};
