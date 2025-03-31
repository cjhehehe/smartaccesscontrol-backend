// models/roomOccupancyHistoryModel.js
import supabase from '../config/supabase.js';

export const createHistoryRecord = async (recordData) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .insert([recordData])
      .select('*')
      .single();
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error creating history record:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in createHistoryRecord:', err);
    return { data: null, error: err };
  }
};

export const getAllHistoryRecords = async () => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error fetching history records:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in getAllHistoryRecords:', err);
    return { data: null, error: err };
  }
};

export const getHistoryRecordById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error fetching record by id:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in getHistoryRecordById:', err);
    return { data: null, error: err };
  }
};

export const updateHistoryRecord = async (id, updateData) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error updating history record:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in updateHistoryRecord:', err);
    return { data: null, error: err };
  }
};

export const searchHistoryRecords = async (query) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .select('*')
      .ilike('occupant_snapshot::text', `%${query}%`)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error searching history records:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in searchHistoryRecords:', err);
    return { data: null, error: err };
  }
};

/**
 * Instead of updating an existing occupancy record for check-in,
 * this function now creates a new row with event_indicator set to "checkin".
 * This preserves the original "registered" event.
 */
export const checkInOccupancyRecord = async (id, checkInTime, hoursStay) => {
  try {
    // First, fetch the existing record to copy relevant details.
    const { data: existing, error: fetchErr } = await getHistoryRecordById(id);
    if (fetchErr) {
      return { data: null, error: fetchErr };
    }
    if (!existing) {
      return { data: null, error: new Error(`Record not found for ID=${id}`) };
    }

    // Prepare a new row copying most fields from the existing record,
    // but setting check_in to the provided time and event_indicator to "checkin".
    const newRow = {
      room_id: existing.room_id,
      guest_id: existing.guest_id,
      rfid_id: existing.rfid_id,
      registration_time: existing.registration_time, // Retain original registration time
      check_in: checkInTime,
      check_out: null,
      // Use provided hoursStay if valid; otherwise fall back to existing value.
      hours_stay: (typeof hoursStay === 'number' && hoursStay > 0) ? hoursStay : existing.hours_stay,
      occupant_snapshot: existing.occupant_snapshot,
      mac_addresses_snapshot: existing.mac_addresses_snapshot,
      check_out_reason: null,
      was_early_checkout: false,
      event_indicator: "checkin"
    };

    const { data, error } = await supabase
      .from('room_occupancy_history')
      .insert([newRow])
      .select('*')
      .single();

    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error inserting new check-in record:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in checkInOccupancyRecord:', err);
    return { data: null, error: err };
  }
};

export const checkOutOccupancyRecord = async (id, checkOutTime, checkOutReason, wasEarlyCheckout) => {
  try {
    const { data: existing, error: fetchErr } = await getHistoryRecordById(id);
    if (fetchErr) {
      return { data: null, error: fetchErr };
    }
    if (!existing) {
      return { data: null, error: new Error(`Record not found for ID=${id}`) };
    }
    if (existing.check_out) {
      console.warn(`[checkOutOccupancyRecord] Overriding existing check_out for ID=${id}`);
    }
    const updateData = { check_out: checkOutTime };
    if (typeof checkOutReason === 'string') {
      updateData.check_out_reason = checkOutReason;
    }
    if (typeof wasEarlyCheckout === 'boolean') {
      updateData.was_early_checkout = wasEarlyCheckout;
    }
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error in checkOutOccupancyRecord:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in checkOutOccupancyRecord:', err);
    return { data: null, error: err };
  }
};
