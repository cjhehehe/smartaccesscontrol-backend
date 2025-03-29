// models/roomOccupancyHistoryModel.js
import supabase from '../config/supabase.js';

/**
 * Creates a new occupancy history record (registration event).
 */
export const createHistoryRecord = async (recordData) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .insert([recordData])
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

/**
 * Returns all occupancy records, sorted by created_at desc.
 */
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

/**
 * Returns a single occupancy record by ID.
 */
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

/**
 * Updates an occupancy record by ID with partial fields.
 */
export const updateHistoryRecord = async (id, updateData) => {
  try {
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
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

/**
 * Search occupant_snapshot JSON for a partial match on 'query'.
 */
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
 * checkInOccupancyRecord:
 *  - Sets check_in if null (or updates it if you allow that).
 *  - Optionally updates hours_stay.
 */
export const checkInOccupancyRecord = async (id, checkInTime, hoursStay) => {
  try {
    // 1) Fetch the existing record
    const { data: existing, error: fetchErr } = await getHistoryRecordById(id);
    if (fetchErr) {
      return { data: null, error: fetchErr };
    }
    if (!existing) {
      return { data: null, error: new Error('Record not found') };
    }

    // 2) If you only want to set check_in if it's currently null:
    if (existing.check_in) {
      // Already checked in
      // Return or override if you want
      // For example, let's just proceed to override:
      console.warn(`[checkInOccupancyRecord] Overriding existing check_in for ID=${id}`);
    }

    // 3) Build the update
    const updateData = {
      check_in: checkInTime,
    };
    if (typeof hoursStay === 'number' && hoursStay > 0) {
      updateData.hours_stay = hoursStay;
    }

    // 4) Update
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
      .single();
    if (error) {
      console.error('[RoomOccupancyHistoryModel] Error in checkInOccupancyRecord:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[RoomOccupancyHistoryModel] Unexpected error in checkInOccupancyRecord:', err);
    return { data: null, error: err };
  }
};

/**
 * checkOutOccupancyRecord:
 *  - Sets check_out to provided time (or now).
 *  - Sets check_out_reason, was_early_checkout if needed.
 */
export const checkOutOccupancyRecord = async (
  id,
  checkOutTime,
  checkOutReason,
  wasEarlyCheckout
) => {
  try {
    // 1) Fetch existing
    const { data: existing, error: fetchErr } = await getHistoryRecordById(id);
    if (fetchErr) {
      return { data: null, error: fetchErr };
    }
    if (!existing) {
      return { data: null, error: new Error('Record not found') };
    }

    // 2) If there's already a check_out, decide if you want to override
    if (existing.check_out) {
      console.warn(`[checkOutOccupancyRecord] Overriding existing check_out for ID=${id}`);
    }

    // 3) Build the update
    const updateData = {
      check_out: checkOutTime,
    };
    if (typeof checkOutReason === 'string') {
      updateData.check_out_reason = checkOutReason;
    }
    if (typeof wasEarlyCheckout === 'boolean') {
      updateData.was_early_checkout = wasEarlyCheckout;
    }

    // 4) Update
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
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
