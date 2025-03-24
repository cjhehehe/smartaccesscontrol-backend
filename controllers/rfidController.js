// controllers/rfidController.js
import {
  findRFIDByUID,
  getAllRFIDs,
  getAvailableRFIDs,
  assignRFIDToGuest,
  activateRFID,
  markRFIDLost,
  unassignRFID,
} from '../models/rfidModel.js';
import { findUserById } from '../models/userModel.js';
import supabase from '../config/supabase.js';
import { findRoomByGuestAndNumber } from '../models/roomsModel.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/responseHelper.js';

// Helper to upgrade a reserved room to occupied
const upgradeRoomToOccupied = async (roomData) => {
  const rawHours = roomData.hours_stay;
  let hoursStay = parseFloat(rawHours);
  if (isNaN(hoursStay) || hoursStay <= 0) {
    console.warn(`[verifyRFID] Invalid hours_stay (${rawHours}). Defaulting to 1 hour.`);
    hoursStay = 1;
  }
  const checkInTime = new Date();
  const checkOutTime = new Date(checkInTime.getTime() + hoursStay * 60 * 60 * 1000);
  const { data: occupiedRoom, error: checkInError } = await supabase
    .from('rooms')
    .update({
      status: 'occupied',
      check_in: checkInTime.toISOString(),
      check_out: checkOutTime.toISOString(),
    })
    .eq('id', roomData.id)
    .single();
  if (checkInError) {
    console.error('[upgradeRoomToOccupied] Error updating room to occupied:', checkInError);
    throw new Error('Error updating room to occupied.');
  }
  return occupiedRoom;
};

/**
 * GET /api/rfid/all
 */
export const getAllRFIDTags = async (req, res) => {
  try {
    const { data, error } = await getAllRFIDs();
    if (error) {
      console.error('[getAllRFIDTags] Database error:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to fetch all RFID tags.'));
    }
    return res.status(200).json(formatSuccessResponse('All RFID tags fetched successfully.', data));
  } catch (error) {
    console.error('[getAllRFIDTags] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * GET /api/rfid/available
 */
export const getAvailableRFIDTags = async (req, res) => {
  try {
    const { data, error } = await getAvailableRFIDs();
    if (error) {
      console.error('[getAvailableRFIDTags] Database error:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to fetch available RFID tags.'));
    }
    return res.status(200).json(formatSuccessResponse('Available RFID tags fetched successfully.', data));
  } catch (error) {
    console.error('[getAvailableRFIDTags] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * POST /api/rfid/assign
 */
export const assignRFID = async (req, res) => {
  try {
    const { guest_id, rfid_uid } = req.body;
    if (!guest_id || !rfid_uid) {
      return res.status(400).json(formatErrorResponse('Guest ID and rfid_uid are required.'));
    }
    // Validate guest existence
    const { data: guestData, error: guestError } = await findUserById(guest_id);
    if (guestError) {
      console.error('[assignRFID] Error finding guest:', guestError);
      return res.status(500).json(formatErrorResponse('Database error: Unable to fetch guest.'));
    }
    if (!guestData) {
      return res.status(404).json(formatErrorResponse('Guest not found.'));
    }
    // Validate RFID existence and availability
    const { data: rfidRecord, error: rfidError } = await findRFIDByUID(rfid_uid);
    if (rfidError) {
      console.error('[assignRFID] Error finding RFID:', rfidError);
      return res.status(500).json(formatErrorResponse('Database error: Unable to check RFID.'));
    }
    if (!rfidRecord) {
      return res.status(404).json(formatErrorResponse(`RFID ${rfid_uid} does not exist in the database.`));
    }
    if (rfidRecord.status !== 'available') {
      return res.status(400).json(formatErrorResponse(`RFID ${rfid_uid} is not available. Current status: ${rfidRecord.status}.`));
    }
    // Assign the RFID to the guest
    const { data, error } = await assignRFIDToGuest(rfid_uid, guest_id);
    if (error) {
      console.error('[assignRFID] Database error assigning RFID:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to assign RFID.'));
    }
    if (!data) {
      return res.status(400).json(formatErrorResponse('Failed to assign RFID. Possibly the RFID is no longer available.'));
    }
    return res.status(201).json(formatSuccessResponse(`RFID ${rfid_uid} assigned to guest ${guest_id} successfully (status: assigned).`, data));
  } catch (error) {
    console.error('[assignRFID] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * POST /api/rfid/activate
 */
export const activateRFIDTag = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json(formatErrorResponse('rfid_uid is required.'));
    }
    const { data, error } = await activateRFID(rfid_uid);
    if (error) {
      console.error('[activateRFIDTag] Error activating RFID:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to activate RFID.'));
    }
    if (!data) {
      return res.status(400).json(formatErrorResponse('RFID not found or not in assigned status.'));
    }
    return res.status(200).json(formatSuccessResponse(`RFID ${rfid_uid} activated successfully (status: active).`, data));
  } catch (error) {
    console.error('[activateRFIDTag] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * POST /api/rfid/lost
 */
export const markRFIDAsLost = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json(formatErrorResponse('rfid_uid is required.'));
    }
    const { data, error } = await markRFIDLost(rfid_uid);
    if (error) {
      console.error('[markRFIDAsLost] Error marking RFID lost:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to mark RFID as lost.'));
    }
    if (!data) {
      return res.status(400).json(formatErrorResponse('RFID not found or already lost.'));
    }
    return res.status(200).json(formatSuccessResponse(`RFID ${rfid_uid} status changed to lost.`, data));
  } catch (error) {
    console.error('[markRFIDAsLost] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * POST /api/rfid/unassign
 */
export const unassignRFIDTag = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json(formatErrorResponse('rfid_uid is required.'));
    }
    const { data, error } = await unassignRFID(rfid_uid);
    if (error) {
      console.error('[unassignRFIDTag] Error unassigning RFID:', error);
      return res.status(500).json(formatErrorResponse('Database error: Unable to unassign RFID.'));
    }
    if (!data) {
      return res.status(400).json(formatErrorResponse('RFID not found or already available.'));
    }
    return res.status(200).json(formatSuccessResponse(`RFID ${rfid_uid} unassigned successfully (status: available).`, data));
  } catch (error) {
    console.error('[unassignRFIDTag] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * PUT /api/rfid/update-status
 */
export const updateRFIDStatus = async (req, res) => {
  try {
    const { rfid_uid, status } = req.body;
    if (!rfid_uid || !status) {
      return res.status(400).json(formatErrorResponse('rfid_uid and status are required.'));
    }
    // 1) Fetch the RFID record
    const { data: rfidRecord, error: findErr } = await findRFIDByUID(rfid_uid);
    if (findErr) {
      console.error('[updateRFIDStatus] Error finding RFID:', findErr);
      return res.status(500).json(formatErrorResponse('Database error: Unable to look up RFID.'));
    }
    if (!rfidRecord) {
      return res.status(404).json(formatErrorResponse(`RFID ${rfid_uid} not found.`));
    }
    // 2) Check if already in desired status
    const oldStatus = (rfidRecord.status || '').toLowerCase();
    const newStatus = status.toLowerCase();
    if (oldStatus === newStatus) {
      return res.status(200).json(formatSuccessResponse('No changes needed. RFID is already in that status.', rfidRecord));
    }
    // 3) Update based on new status
    let updatedData = null;
    if (newStatus === 'available') {
      const { data, error } = await unassignRFID(rfid_uid);
      if (error) throw error;
      updatedData = data;
    } else if (newStatus === 'assigned') {
      const { data, error } = await supabase
        .from('rfid_tags')
        .update({ status: 'assigned' })
        .eq('rfid_uid', rfid_uid)
        .neq('status', 'assigned')
        .select('id, rfid_uid, guest_id, status')
        .single();
      if (error) {
        console.error('[updateRFIDStatus] Error setting RFID assigned:', error);
        return res.status(500).json(formatErrorResponse('Database error: Unable to set RFID to assigned.'));
      }
      updatedData = data;
    } else if (newStatus === 'active') {
      const { data, error } = await activateRFID(rfid_uid);
      if (error) throw error;
      updatedData = data;
    } else if (newStatus === 'lost') {
      const { data, error } = await markRFIDLost(rfid_uid);
      if (error) throw error;
      updatedData = data;
    } else {
      return res.status(400).json(formatErrorResponse(`Unsupported status: ${status}`));
    }
    return res.status(200).json(formatSuccessResponse(`RFID status updated to '${newStatus}'.`, updatedData));
  } catch (error) {
    console.error('[updateRFIDStatus] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};

/**
 * POST /api/rfid/verify
 */
export const verifyRFID = async (req, res) => {
  try {
    const { rfid_uid, room_number } = req.body;
    if (!rfid_uid) {
      return res.status(400).json(formatErrorResponse('rfid_uid is required.'));
    }
    // 1) Fetch the RFID record
    const { data: rfidData, error: rfidError } = await findRFIDByUID(rfid_uid);
    if (rfidError) throw new Error('Database error: Unable to look up RFID.');
    if (!rfidData) return res.status(404).json(formatErrorResponse('RFID not found.'));
    // 2) Validate RFID status
    if (!['assigned', 'active'].includes(rfidData.status)) {
      return res.status(403).json(formatErrorResponse(`RFID is found but not valid for entry (status: ${rfidData.status}).`));
    }
    // 3) Ensure the RFID is linked to a guest
    if (!rfidData.guest_id) {
      return res.status(403).json(formatErrorResponse('RFID is not assigned to any guest.'));
    }
    const { data: guestData, error: guestError } = await findUserById(rfidData.guest_id);
    if (guestError) throw new Error('Database error: Unable to look up guest.');
    if (!guestData) return res.status(404).json(formatErrorResponse('Guest not found.'));
    // 4) Determine target room
    let targetRoomNumber = room_number;
    if (!targetRoomNumber) {
      const { data: possibleRooms, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('guest_id', rfidData.guest_id)
        .in('status', ['reserved', 'occupied']);
      if (fetchError) throw new Error('Error fetching room information.');
      if (!possibleRooms || possibleRooms.length === 0) {
        return res.status(403).json(formatErrorResponse('No reserved/occupied room found for this guest.'));
      }
      if (possibleRooms.length > 1) {
        return res.status(400).json(formatErrorResponse('Multiple rooms found for this guest. Please specify a room_number.'));
      }
      targetRoomNumber = possibleRooms[0].room_number;
    }
    // 5) Ensure guest has that room reserved/occupied
    let { data: roomData, error: roomError } = await findRoomByGuestAndNumber(rfidData.guest_id, targetRoomNumber);
    if (roomError) throw new Error('Error checking room reservation.');
    if (!roomData) {
      return res.status(403).json(formatErrorResponse(`Access denied: Guest has not reserved or is not occupying room ${targetRoomNumber}.`));
    }
    // 6) Check time constraints
    if (roomData.status === 'occupied' && roomData.check_out) {
      const now = new Date();
      const checkOutTime = new Date(roomData.check_out);
      if (now.getTime() >= checkOutTime.getTime()) {
        return res.status(403).json(formatErrorResponse('Access denied: Your stay has ended.', { rfid: rfidData, guest: guestData, room: roomData }));
      }
    } else if (roomData.status === 'reserved') {
      roomData = await upgradeRoomToOccupied(roomData);
    }
    // 7) If RFID is still 'assigned', activate it
    if (rfidData.status === 'assigned') {
      const { data: updatedRFID, error: activationError } = await activateRFID(rfid_uid);
      if (activationError) throw new Error('Error activating RFID.');
      rfidData = updatedRFID;
    }
    return res.status(200).json(formatSuccessResponse('RFID verified successfully.', { rfid: rfidData, guest: guestData, room: roomData }));
  } catch (error) {
    console.error('[verifyRFID] Unexpected error:', error);
    return res.status(500).json(formatErrorResponse('Internal server error.'));
  }
};
