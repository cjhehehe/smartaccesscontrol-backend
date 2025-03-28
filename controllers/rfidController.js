// controllers/rfidController.js

import {
  findRFIDByUID,
  getAllRFIDs,
  getAvailableRFIDs,
  assignRFIDToGuest,
  activateRFID,
  markRFIDLost,
  unassignRFID,
  resetRFIDByGuest,
} from '../models/rfidModel.js';
import { findUserById } from '../models/userModel.js';
import supabase from '../config/supabase.js';
import { findRoomByGuestAndNumber } from '../models/roomsModel.js';

/**
 * GET /api/rfid/all
 */
export const getAllRFIDTags = async (req, res) => {
  try {
    const { data, error } = await getAllRFIDs();
    if (error) {
      console.error('[getAllRFIDTags] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch all RFID tags.',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'All RFID tags fetched successfully.',
      data,
    });
  } catch (error) {
    console.error('[getAllRFIDTags] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
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
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch available RFID tags.',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Available RFID tags fetched successfully.',
      data,
    });
  } catch (error) {
    console.error('[getAvailableRFIDTags] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/rfid/assign
 * Assign an RFID to a specific guest_id.
 */
export const assignRFID = async (req, res) => {
  try {
    const { guest_id, rfid_uid } = req.body;
    if (!guest_id || !rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID and rfid_uid are required.',
      });
    }

    // Validate guest existence
    const { data: guestData, error: guestError } = await findUserById(guest_id);
    if (guestError) {
      console.error('[assignRFID] Error finding guest:', guestError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch guest.',
      });
    }
    if (!guestData) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found.',
      });
    }

    // Validate RFID existence and availability
    const { data: rfidRecord, error: rfidError } = await findRFIDByUID(rfid_uid);
    if (rfidError) {
      console.error('[assignRFID] Error finding RFID:', rfidError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to check RFID.',
      });
    }
    if (!rfidRecord) {
      return res.status(404).json({
        success: false,
        message: `RFID ${rfid_uid} does not exist in the database.`,
      });
    }
    if (rfidRecord.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `RFID ${rfid_uid} is not available. Current status: ${rfidRecord.status}.`,
      });
    }

    // Assign the RFID to the guest
    const { data, error } = await assignRFIDToGuest(rfid_uid, guest_id);
    if (error) {
      console.error('[assignRFID] Database error assigning RFID:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to assign RFID.',
      });
    }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Failed to assign RFID. Possibly the RFID is no longer available.',
      });
    }

    return res.status(201).json({
      success: true,
      message: `RFID ${rfid_uid} assigned to guest ${guest_id} successfully (status: assigned).`,
      data,
    });
  } catch (error) {
    console.error('[assignRFID] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/rfid/activate
 */
export const activateRFIDTag = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }
    const { data, error } = await activateRFID(rfid_uid);
    if (error) {
      console.error('[activateRFIDTag] Error activating RFID:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to activate RFID.',
      });
    }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'RFID not found or not in assigned status.',
      });
    }
    return res.status(200).json({
      success: true,
      message: `RFID ${rfid_uid} activated successfully (status: active).`,
      data,
    });
  } catch (error) {
    console.error('[activateRFIDTag] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/rfid/lost
 */
export const markRFIDAsLost = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }
    const { data, error } = await markRFIDLost(rfid_uid);
    if (error) {
      console.error('[markRFIDAsLost] Error marking RFID lost:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to mark RFID as lost.',
      });
    }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'RFID not found or already lost.',
      });
    }
    return res.status(200).json({
      success: true,
      message: `RFID ${rfid_uid} status changed to lost.`,
      data,
    });
  } catch (error) {
    console.error('[markRFIDAsLost] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/rfid/unassign
 */
export const unassignRFIDTag = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }
    const { data, error } = await unassignRFID(rfid_uid);
    if (error) {
      console.error('[unassignRFIDTag] Error unassigning RFID:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to unassign RFID.',
      });
    }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'RFID not found or already available.',
      });
    }
    return res.status(200).json({
      success: true,
      message: `RFID ${rfid_uid} unassigned successfully (status: available).`,
      data,
    });
  } catch (error) {
    console.error('[unassignRFIDTag] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * PUT /api/rfid/update-status
 * A unified method to update an RFID's status.
 */
export const updateRFIDStatus = async (req, res) => {
  try {
    const { rfid_uid, status } = req.body;
    if (!rfid_uid || !status) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid and status are required.',
      });
    }

    // 1) Fetch the RFID record
    const { data: rfidRecord, error: findErr } = await findRFIDByUID(rfid_uid);
    if (findErr) {
      console.error('[updateRFIDStatus] Error finding RFID:', findErr);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to look up RFID.',
      });
    }
    if (!rfidRecord) {
      return res.status(404).json({
        success: false,
        message: `RFID ${rfid_uid} not found.`,
      });
    }

    // 2) If the RFID is already in the desired status, return current data
    const oldStatus = (rfidRecord.status || '').toLowerCase();
    const newStatus = status.toLowerCase();
    if (oldStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: 'No changes needed. RFID is already in that status.',
        data: rfidRecord,
      });
    }

    // 3) Update status based on newStatus
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
        return res.status(500).json({
          success: false,
          message: 'Database error: Unable to set RFID to assigned.',
        });
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
      return res.status(400).json({
        success: false,
        message: `Unsupported status: ${status}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `RFID status updated to '${newStatus}'.`,
      data: updatedData,
    });
  } catch (error) {
    console.error('[updateRFIDStatus] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/rfid/verify
 * Verifies an RFID and, on the first scan, if the room is reserved, promotes it to occupied,
 * and if the RFID is in assigned status, activates it. If the guest has already checked out,
 * it denies access. Also ensures we have a corresponding record in room_occupancy_history
 * and returns its ID as occupancyHistoryId in the response.
 */
export const verifyRFID = async (req, res) => {
  try {
    const { rfid_uid, room_number } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }

    // 1) Fetch the RFID record
    let { data: rfidData, error: rfidError } = await findRFIDByUID(rfid_uid);
    if (rfidError) {
      console.error('[verifyRFID] Error finding RFID:', rfidError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to look up RFID.',
      });
    }
    if (!rfidData) {
      return res.status(404).json({
        success: false,
        message: 'RFID not found.',
      });
    }

    // 2) Validate RFID status (only 'assigned' and 'active' are allowed for entry)
    if (!['assigned', 'active'].includes(rfidData.status)) {
      return res.status(403).json({
        success: false,
        message: `RFID is found but not valid for entry (status: ${rfidData.status}).`,
      });
    }

    // 3) Ensure the RFID is linked to a guest
    if (!rfidData.guest_id) {
      return res.status(403).json({
        success: false,
        message: 'RFID is not assigned to any guest.',
      });
    }

    // 3a) Fetch the guest
    const { data: guestData, error: guestError } = await findUserById(rfidData.guest_id);
    if (guestError) {
      console.error('[verifyRFID] Error finding guest:', guestError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to look up guest.',
      });
    }
    if (!guestData) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found.',
      });
    }

    // 4) Determine which room to check. If not provided, auto-detect among 'reserved'/'occupied'.
    let targetRoomNumber = room_number;
    if (!targetRoomNumber) {
      const { data: possibleRooms, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('guest_id', rfidData.guest_id)
        .in('status', ['reserved', 'occupied']);

      if (fetchError) {
        console.error('[verifyRFID] Error fetching rooms for auto-detect:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Error fetching room information.',
        });
      }
      if (!possibleRooms || possibleRooms.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No reserved/occupied room found for this guest.',
        });
      }
      if (possibleRooms.length > 1) {
        console.warn(
          `[verifyRFID] Multiple rooms found for this guest. Auto-selecting the first: #${possibleRooms[0].room_number}`
        );
      }
      targetRoomNumber = possibleRooms[0].room_number;
    }

    // 5) Fetch the relevant room record for that guest + room_number
    let { data: roomData, error: roomError } = await findRoomByGuestAndNumber(
      rfidData.guest_id,
      targetRoomNumber
    );
    if (roomError) {
      console.error('[verifyRFID] Error checking room reservation:', roomError);
      return res.status(500).json({
        success: false,
        message: 'Error checking room reservation.',
      });
    }
    if (!roomData) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Guest has not reserved or is not occupying room ${targetRoomNumber}.`,
      });
    }

    // 5a) If the room status is 'available', means the guest has already checked out
    if (roomData.status === 'available') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Guest has already checked out.',
        data: { rfid: rfidData, guest: guestData, room: roomData },
      });
    }

    // 6) If the room is 'reserved', promote it to 'occupied'
    if (roomData.status === 'reserved') {
      const rawHours = roomData.hours_stay;
      let hoursStay = rawHours ? parseFloat(rawHours) : 0;
      if (isNaN(hoursStay) || hoursStay <= 0) {
        console.warn(`[verifyRFID] Invalid hours_stay (${rawHours}). Defaulting to 1 hour.`);
        hoursStay = 1;
      }
      const checkInTime = new Date();
      const checkOutTime = new Date(checkInTime.getTime() + hoursStay * 60 * 60 * 1000);

      console.log(`[verifyRFID] Upgrading room ${roomData.room_number} from 'reserved' to 'occupied'.`);
      const { data: occupiedRoom, error: checkInError } = await supabase
        .from('rooms')
        .update({
          status: 'occupied',
          check_in: checkInTime.toISOString(),
          check_out: checkOutTime.toISOString(),
        })
        .eq('id', roomData.id)
        .select('*')
        .single();

      if (checkInError) {
        console.error('[verifyRFID] Error updating room to occupied:', checkInError);
        return res.status(500).json({
          success: false,
          message: 'Error updating room to occupied.',
        });
      }
      roomData = occupiedRoom;
    }
    // 6a) If already occupied, ensure the check_out hasn't passed
    else if (roomData.status === 'occupied') {
      if (roomData.check_out) {
        const now = new Date();
        const checkOutTime = new Date(roomData.check_out);
        if (now.getTime() >= checkOutTime.getTime()) {
          console.log(`[verifyRFID] Room ${roomData.room_number} check_out time has passed. Denying access.`);
          return res.status(403).json({
            success: false,
            message: 'Access denied: Your stay has ended.',
            data: { rfid: rfidData, guest: guestData, room: roomData },
          });
        }
      }
    }

    // 7) If RFID is 'assigned', automatically activate it
    if (rfidData.status === 'assigned') {
      const { data: updatedRFID, error: activationError } = await activateRFID(rfid_uid);
      if (activationError) {
        console.error('[verifyRFID] Error activating RFID:', activationError);
        return res.status(500).json({
          success: false,
          message: 'Error activating RFID.',
        });
      }
      rfidData = updatedRFID;
    }

    // 8) Find or create the occupant record in room_occupancy_history
    //    (where check_out is null for that guest+room) or create a new record
    let occupantRecordId = null;
    try {
      // A) Check if there's an open occupant record
      const { data: existingOccupant, error: occupantError } = await supabase
        .from('room_occupancy_history')
        .select('*')
        .eq('guest_id', guestData.id)
        .eq('room_id', roomData.id)
        .is('check_out', null)
        .maybeSingle();

      if (occupantError) {
        console.error('[verifyRFID] occupantError:', occupantError);
        // Not a hard fail: we can still proceed without occupant record
      }

      if (existingOccupant) {
        occupantRecordId = existingOccupant.id;
      } else {
        // B) Create a new occupant record
        const occupantSnapshot = {
          name: guestData.name,
          email: guestData.email,
          phone: guestData.phone,
          membership_level: guestData.membership_level || 'Regular',
        };

        const recordData = {
          room_id: roomData.id,
          guest_id: guestData.id,
          rfid_id: rfidData.id, // optional if you want to store the RFID PK
          registration_time: new Date().toISOString(),
          check_in: null,  // set by the check-in endpoint
          check_out: null,
          hours_stay: roomData.hours_stay ? parseFloat(roomData.hours_stay) : null,
          check_out_reason: null,
          was_early_checkout: false,
          occupant_snapshot: occupantSnapshot,
          mac_addresses_snapshot: {},
        };

        const { data: newOcc, error: newOccErr } = await supabase
          .from('room_occupancy_history')
          .insert([recordData])
          .single();

        if (newOccErr) {
          console.error('[verifyRFID] Error creating occupant record:', newOccErr);
          // We won't fail the entire request, but occupantRecordId remains null
        } else {
          occupantRecordId = newOcc.id;
        }
      }
    } catch (err) {
      console.error('[verifyRFID] Unexpected occupant creation error:', err);
    }

    // 9) Return final data, including occupantRecordId as occupancyHistoryId
    return res.status(200).json({
      success: true,
      message: 'RFID verified successfully.',
      data: {
        rfid: rfidData,
        guest: guestData,
        room: roomData,
        occupancyHistoryId: occupantRecordId || null, // for the rfid_reader to call check-in
      },
    });
  } catch (error) {
    console.error('[verifyRFID] Unexpected error verifying RFID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};
