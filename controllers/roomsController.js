// controllers/roomsController.js
import {
  createRoom,
  getRoomById,
  getAllRooms,
  updateRoom,
  deleteRoom,
  checkInRoom,
  checkOutRoom,
  updateRoomByNumber,
  findRoomByNumber,
} from '../models/roomsModel.js';
import { createNotification } from '../models/notificationModel.js';

/**
 * POST /api/rooms
 * Create a new room record with initial status = 'reserved'.
 */
export const addRoom = async (req, res) => {
  try {
    const { guest_id, room_number, hours_stay } = req.body;
    if (!guest_id || !room_number || hours_stay == null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: guest_id, room_number, hours_stay.',
      });
    }

    const numericHoursStay = parseFloat(hours_stay);
    if (isNaN(numericHoursStay) || numericHoursStay <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hours_stay. Must be a positive decimal.',
      });
    }

    // Check if the room number already exists
    const { data: existingRoom, error: findError } = await findRoomByNumber(room_number);
    if (findError) {
      console.error('[Rooms] Error checking existing room:', findError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Error checking existing room',
        error: findError.message,
      });
    }
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: `Room number ${room_number} already exists.`,
      });
    }

    // Prepare new room data with UTC registration_time
    const newRoom = {
      guest_id,
      room_number: room_number.toString(),
      hours_stay: numericHoursStay,
      status: 'reserved',
      registration_time: new Date().toISOString(),
    };

    const { data, error } = await createRoom(newRoom);
    if (error) {
      console.error('[Rooms] Error inserting room data:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Error inserting room data',
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Room created successfully (status=reserved)',
      data,
    });
  } catch (error) {
    console.error('[Rooms] Unexpected error in addRoom:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * PUT /api/rooms/assign
 * Assign (reserve) a room by room_number (status -> 'reserved').
 */
export const assignRoomByNumber = async (req, res) => {
  try {
    const { room_number, guest_id, hours_stay } = req.body;
    if (!room_number || !guest_id || hours_stay == null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: room_number, guest_id, hours_stay.',
      });
    }

    const numericHoursStay = parseFloat(hours_stay);
    if (isNaN(numericHoursStay) || numericHoursStay <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hours_stay. Must be a positive decimal.',
      });
    }

    const updateFields = {
      guest_id,
      hours_stay: numericHoursStay,
      status: 'reserved',
      registration_time: new Date().toISOString(),
    };

    // Only update if the room is available
    const { data, error } = await updateRoomByNumber(room_number, updateFields, {
      onlyIfAvailable: true,
    });
    if (error) {
      console.error('[Rooms] Error updating room by number:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Error updating room record',
        error: error.message,
      });
    }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: `No available room found with room_number = ${room_number}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Room reserved (status=reserved) successfully',
      data,
    });
  } catch (error) {
    console.error('[Rooms] Error in assignRoomByNumber:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * GET /api/rooms/:id
 * Fetch a room by its ID.
 */
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getRoomById(id);
    if (error) {
      console.error('[Rooms] Error fetching room data:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error fetching room data', error });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Rooms] Unexpected error in getRoom:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * GET /api/rooms
 * Fetch all rooms.
 */
export const getRooms = async (req, res) => {
  try {
    const { data, error } = await getAllRooms();
    if (error) {
      console.error('[Rooms] Error fetching rooms:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error fetching rooms', error });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Rooms] Unexpected error in getRooms:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * PUT /api/rooms/:id
 * Update specific fields of a room by its ID.
 */
export const modifyRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }
    if (updateFields.hours_stay != null) {
      const numericHoursStay = parseFloat(updateFields.hours_stay);
      if (isNaN(numericHoursStay) || numericHoursStay <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hours_stay. Must be a positive decimal.',
        });
      }
      updateFields.hours_stay = numericHoursStay;
    }

    const { data, error } = await updateRoom(id, updateFields);
    if (error) {
      console.error('[Rooms] Error updating room data:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error updating room data', error });
    }
    return res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data,
    });
  } catch (error) {
    console.error('[Rooms] Unexpected error in modifyRoom:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * DELETE /api/rooms/:id
 * Delete a room by its ID.
 */
export const removeRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await deleteRoom(id);
    if (error) {
      console.error('[Rooms] Error deleting room:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error deleting room', error });
    }
    return res.status(200).json({ success: true, message: 'Room deleted successfully', data });
  } catch (error) {
    console.error('[Rooms] Unexpected error in removeRoom:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * POST /api/rooms/:id/checkin
 * Check a guest into a room (set check_in time and status to 'occupied').
 */
export const roomCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    // Use provided check_in time or current UTC time
    const checkInTime = req.body.check_in || new Date().toISOString();

    const { data, error } = await checkInRoom(id, checkInTime);
    if (error) {
      console.error('[Rooms] Error during check-in:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error during check-in', error });
    }
    return res.status(200).json({ success: true, message: 'Check-in successful', data });
  } catch (error) {
    console.error('[Rooms] Unexpected error in roomCheckIn:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * POST /api/rooms/:id/checkout
 * Check a guest out of a room (set check_out time and status to 'available').
 */
export const roomCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const checkOutTime = req.body.check_out || new Date().toISOString();

    const { data, error } = await checkOutRoom(id, checkOutTime);
    if (error) {
      console.error('[Rooms] Error during check-out:', error);
      return res.status(500).json({ success: false, message: 'Database error: Error during check-out', error });
    }
    return res.status(200).json({ success: true, message: 'Check-out successful', data });
  } catch (error) {
    console.error('[Rooms] Unexpected error in roomCheckOut:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

/**
 * PUT /api/rooms/:room_number/update-status
 * Update a room's status by room_number and, if applicable, notify the occupant.
 */
export const updateRoomStatusByNumber = async (req, res) => {
  try {
    const { room_number } = req.params;
    const { status, note } = req.body;
    if (!room_number || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing room_number or status in request.',
      });
    }

    // 1) Find the room by its number
    const { data: existingRoom, error: findError } = await findRoomByNumber(room_number);
    if (findError) {
      console.error('[Rooms] Error finding room by number:', findError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Could not find room.',
        error: findError.message,
      });
    }
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: `Room ${room_number} not found.`,
      });
    }

    // 2) Update the room record with new status
    const { data: updatedRoom, error: updateError } = await updateRoomByNumber(
      room_number,
      { status }
    );
    if (updateError) {
      console.error('[Rooms] Error updating room status:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to update room status.',
        error: updateError.message,
      });
    }
    if (!updatedRoom) {
      return res.status(404).json({
        success: false,
        message: `Room ${room_number} could not be updated.`,
      });
    }

    // 3) If a guest is assigned, send a notification about the status update
    if (updatedRoom.guest_id) {
      try {
        let statusLabel = status;
        if (status === 'available') statusLabel = 'Available';
        else if (status === 'reserved') statusLabel = 'Reserved';
        else if (status === 'occupied') statusLabel = 'Occupied';
        else if (status === 'maintenance') statusLabel = 'Maintenance';

        const notifTitle = 'Room Status Updated';
        const notifMessage = `Your room #${room_number} is now ${statusLabel}.`;
        const { error: notifError } = await createNotification({
          recipient_guest_id: updatedRoom.guest_id,
          title: notifTitle,
          message: notifMessage,
          note_message: note || null,
          notification_type: 'room_status',
        });
        if (notifError) {
          console.error('[Rooms] Failed to create occupant notification:', notifError);
        }
      } catch (notifCatchErr) {
        console.error('[Rooms] Unexpected error creating occupant notification:', notifCatchErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Room #${room_number} status updated to ${status}.`,
      data: updatedRoom,
    });
  } catch (err) {
    console.error('[Rooms] Unexpected error in updateRoomStatusByNumber:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err,
    });
  }
};
