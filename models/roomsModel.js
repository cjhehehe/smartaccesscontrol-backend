// models/roomsModel.js
import supabase from '../config/supabase.js';
import { createNotification } from './notificationModel.js';
import { resetRFIDByGuest } from './rfidModel.js';
import { fetchAllAdminIds } from './adminModel.js';

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
    const { data, error } = await supabase.from('rooms').select('*');
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
 * Check-Out a guest from a room by ID (low-level).
 * Resets occupant fields, sets status = 'available', AND sets ten_min_warning_sent to false.
 * This does NOT send notifications or reset RFID. It's a basic DB update.
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
        ten_min_warning_sent: false, // reset so next occupant can get a 10-min reminder
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

/**
 * Helper: Notify all admins with a single message.
 */
async function notifyAllAdmins(title, message, notificationType = 'room_status', noteMessage = null) {
  try {
    const adminIds = await fetchAllAdminIds();
    if (!adminIds || adminIds.length === 0) {
      console.warn('[RoomsModel] No admin IDs found. Skipping notifyAllAdmins...');
      return;
    }
    for (const adminId of adminIds) {
      await createNotification({
        recipient_admin_id: adminId,
        title,
        message,
        note_message: noteMessage,
        notification_type: notificationType,
      });
    }
  } catch (err) {
    console.error('[RoomsModel] Could not notify all admins:', err);
  }
}

/**
 * checkOutRoomById:
 * 1) Fetch the room
 * 2) Clear occupant fields in DB (via checkOutRoom)
 * 3) If occupant present, reset RFID & notify occupant
 * 4) Notify all admins
 *
 * 'reason' can be "Early Check-Out" or "Automatic Checkout" to differentiate.
 */
export const checkOutRoomById = async (roomId, reason = 'Automatic Checkout') => {
  try {
    // 1) Fetch the current room record
    const { data: roomData, error: fetchError } = await getRoomById(roomId);
    if (fetchError) {
      console.error('[RoomsModel] Error fetching room data:', fetchError);
      return { success: false, error: fetchError };
    }
    if (!roomData) {
      return { success: false, error: new Error('Room not found') };
    }

    const currentGuestId = roomData.guest_id;
    const roomNumber = roomData.room_number;

    // 2) Clear occupant fields in the DB (and reset ten_min_warning_sent)
    const { data: updatedRoom, error: updateError } = await checkOutRoom(roomId);
    if (updateError) {
      console.error('[RoomsModel] Error during check-out:', updateError);
      return { success: false, error: updateError };
    }
    if (!updatedRoom) {
      return { success: false, error: new Error('Room not found or could not be checked out') };
    }

    // 3) If an occupant was present, notify and reset their RFID.
    if (currentGuestId) {
      try {
        // Notify occupant
        const notifTitle = reason;
        const notifMessage = `You have been checked out of Room #${roomNumber}.`;
        const { error: occupantNotifErr } = await createNotification({
          recipient_guest_id: currentGuestId,
          title: notifTitle,
          message: notifMessage,
          notification_type: 'room_status',
        });
        if (occupantNotifErr) {
          console.error('[RoomsModel] Failed to create occupant check-out notification:', occupantNotifErr);
        }

        // Attempt to reset the RFID for the guest (set guest_id -> null and status -> 'available')
        const { data: resetRFIDData, error: resetError } = await resetRFIDByGuest(currentGuestId);
        // If resetRFIDByGuest doesn't update any records, do fallback
        if (
          resetError ||
          !resetRFIDData ||
          (Array.isArray(resetRFIDData) && resetRFIDData.length === 0)
        ) {
          console.warn('[RoomsModel] resetRFIDByGuest did not update any records. Executing fallback update...');
          // Fallback: Directly update the rfid_tags table via Supabase
          const { error: fallbackError } = await supabase
            .from('rfid_tags')
            .update({
              guest_id: null,
              status: 'available',
            })
            .eq('guest_id', currentGuestId);
          if (fallbackError) {
            console.error('[RoomsModel] Fallback update for RFID failed:', fallbackError);
          }
        }
      } catch (notifyErr) {
        console.error('[RoomsModel] Error handling guest notifications during checkout:', notifyErr);
      }
    }

    // 4) Notify all admins about the checkout
    try {
      const adminTitle = 'Room Checked Out';
      const adminMessage = `Room #${roomNumber} was checked out (ID: ${roomId}). Reason: ${reason}.`;
      await notifyAllAdmins(adminTitle, adminMessage, 'room_status');
    } catch (adminNotifErr) {
      console.error('[RoomsModel] Error sending admin check-out notification:', adminNotifErr);
    }

    // Return success result
    return { success: true, data: updatedRoom };
  } catch (err) {
    console.error('[RoomsModel] Unexpected error in checkOutRoomById:', err);
    return { success: false, error: err };
  }
};
