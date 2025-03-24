// models/roomsModel.js
import supabase from '../config/supabase.js';

/**
 * Create a new room record in the 'rooms' table.
 */
export const createRoom = async (roomData) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .single();
    if (error) {
      console.error('[RoomsModel] Error creating room record:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in createRoom:', err);
    return { data: null, error: err };
  }
};

/**
 * Find a room by its room_number.
 */
export const findRoomByNumber = async (roomNumber) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_number', roomNumber.toString())
      .maybeSingle();
    if (error) {
      console.error('[RoomsModel] Error finding room by number:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in findRoomByNumber:', err);
    return { data: null, error: err };
  }
};

/**
 * Find a room by guest_id AND room_number.
 */
export const findRoomByGuestAndNumber = async (guestId, roomNumber) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('guest_id', guestId)
      .eq('room_number', roomNumber.toString())
      .maybeSingle();
    if (error) {
      console.error('[RoomsModel] Error finding room by guest & number:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in findRoomByGuestAndNumber:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch a room by its ID.
 */
export const getRoomById = async (roomId) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();
    if (error) {
      console.error('[RoomsModel] Error fetching room by id:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in getRoomById:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch all rooms.
 */
export const getAllRooms = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*');
    if (error) {
      console.error('[RoomsModel] Error fetching all rooms:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in getAllRooms:', err);
    return { data: null, error: err };
  }
};

/**
 * Update a room by its ID.
 */
export const updateRoom = async (roomId, updateFields) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .update(updateFields)
      .eq('id', roomId)
      .single();
    if (error) {
      console.error('[RoomsModel] Error updating room:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in updateRoom:', err);
    return { data: null, error: err };
  }
};

/**
 * Update a room by room_number.
 * Optionally only update if room status is 'available'.
 */
export const updateRoomByNumber = async (
  roomNumber,
  updateFields,
  { onlyIfAvailable = false } = {}
) => {
  try {
    let query = supabase
      .from('rooms')
      .update(updateFields)
      .eq('room_number', roomNumber.toString());

    if (onlyIfAvailable) {
      query = query.eq('status', 'available');
    }

    const { data, error } = await query.select('*').single();
    if (error) {
      console.error('[RoomsModel] Error updating room by number:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in updateRoomByNumber:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete a room by its ID.
 */
export const deleteRoom = async (roomId) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .single();
    if (error) {
      console.error('[RoomsModel] Error deleting room:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in deleteRoom:', err);
    return { data: null, error: err };
  }
};

/**
 * Check-In a guest into a room by ID.
 * Sets check_in time and status = 'occupied' (using UTC timestamp).
 */
export const checkInRoom = async (roomId, checkInTime = new Date().toISOString()) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .update({
        check_in: checkInTime,
        status: 'occupied',
      })
      .eq('id', roomId)
      .single();
    if (error) {
      console.error('[RoomsModel] Error during check-in:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in checkInRoom:', err);
    return { data: null, error: err };
  }
};

/**
 * Check-Out a guest from a room by ID.
 * Resets guest and room related fields to NULL and sets status = 'available'.
 */
export const checkOutRoom = async (roomId) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .update({
        guest_id: null,
        registration_time: null,
        hours_stay: null,
        check_in: null,
        check_out: null,
        status: 'available',
      })
      .eq('id', roomId)
      .single();
    if (error) {
      console.error('[RoomsModel] Error during check-out:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in checkOutRoom:', err);
    return { data: null, error: err };
  }
};
