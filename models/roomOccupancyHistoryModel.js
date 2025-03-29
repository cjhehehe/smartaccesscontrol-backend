// models/roomOccupancyHistoryModel.js
import supabase from '../config/supabase.js';

export const createHistoryRecord = async (recordData) => {
  try {
    // Insert the record
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
      console.error('[RoomOccupancyHistoryModel] Error fetching history record by id:', error);
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
    // Example: search occupant_snapshot JSON
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
