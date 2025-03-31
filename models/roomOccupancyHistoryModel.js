// models/roomOccupancyHistoryModel.js
import supabase from '../config/supabase.js';

export const createHistoryRecord = async (recordData) => {
  try {
    // Adding .select('*') to have Supabase return the inserted row
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

export const checkInOccupancyRecord = async (id, checkInTime, hoursStay) => {
  try {
    const { data: existing, error: fetchErr } = await getHistoryRecordById(id);
    if (fetchErr) {
      return { data: null, error: fetchErr };
    }
    if (!existing) {
      return { data: null, error: new Error(`Record not found for ID=${id}`) };
    }
    if (existing.check_in) {
      console.warn(`[checkInOccupancyRecord] Overriding existing check_in for ID=${id}`);
    }
    const updateData = { check_in: checkInTime };
    if (typeof hoursStay === 'number' && hoursStay > 0) {
      updateData.hours_stay = hoursStay;
    }
    const { data, error } = await supabase
      .from('room_occupancy_history')
      .update(updateData)
      .eq('id', id)
      .select('*')
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
