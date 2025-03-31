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
import fetch from 'node-fetch';  // For calling Pi-based endpoints

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "https://smartaccesscontrol-backend-production.up.railway.app/api";
const PI_GATEWAY_BASE_URL = process.env.PI_GATEWAY_BASE_URL || BACKEND_BASE_URL;

// -----------------------------------------------------------------------------
//  1) GET /api/rfid/all
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  2) GET /api/rfid/available
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  3) POST /api/rfid/assign
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  4) POST /api/rfid/activate
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  5) POST /api/rfid/lost
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  6) POST /api/rfid/unassign
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  7) PUT /api/rfid/update-status
// -----------------------------------------------------------------------------
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

    // 2) If RFID is already in desired status, return it
    const oldStatus = (rfidRecord.status || '').toLowerCase();
    const newStatus = status.toLowerCase();
    if (oldStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: 'No changes needed. RFID is already in that status.',
        data: rfidRecord,
      });
    }

    // 3) Update status accordingly
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
        .select('id, rfid_uid, guest_id, status, created_at')
        .maybeSingle();
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

// -----------------------------------------------------------------------------
//  8) POST /api/rfid/verify
// -----------------------------------------------------------------------------
export const verifyRFID = async (req, res) => {
  try {
    const { rfid_uid, room_number } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }

    // 1) Fetch RFID record
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

    // 2) Validate status (only 'assigned' or 'active' allowed)
    if (!['assigned', 'active'].includes(rfidData.status)) {
      return res.status(403).json({
        success: false,
        message: `RFID is found but not valid for entry (status: ${rfidData.status}).`,
      });
    }

    // 3) Ensure RFID is linked to a guest
    if (!rfidData.guest_id) {
      return res.status(403).json({
        success: false,
        message: 'RFID is not assigned to any guest.',
      });
    }

    // 3a) Fetch guest
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

    // 4) Auto-detect room if not provided
    let targetRoomNumber = room_number;
    if (!targetRoomNumber) {
      const { data: possibleRooms, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('guest_id', rfidData.guest_id)
        .in('status', ['reserved', 'occupied']);
      if (fetchError) {
        console.error('[verifyRFID] Error fetching rooms:', fetchError);
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
        console.warn(`[verifyRFID] Multiple rooms found; picking #${possibleRooms[0].room_number}`);
      }
      targetRoomNumber = possibleRooms[0].room_number;
    }

    // 5) Fetch relevant room record
    let { data: roomData, error: roomError } = await findRoomByGuestAndNumber(rfidData.guest_id, targetRoomNumber);
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

    // 5a) If room status is 'available', guest already checked out
    if (roomData.status === 'available') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Guest has already checked out.',
        data: { rfid: rfidData, guest: guestData, room: roomData },
      });
    }

    // 6) If 'reserved', promote to 'occupied'
    if (roomData.status === 'reserved') {
      const rawHours = roomData.hours_stay;
      let hoursStay = rawHours ? parseFloat(rawHours) : 0;
      if (isNaN(hoursStay) || hoursStay <= 0) {
        console.warn(`[verifyRFID] Invalid hours_stay (${rawHours}). Defaulting to 1 hour.`);
        hoursStay = 1;
      }
      const checkInTime = new Date();
      const checkOutTime = new Date(checkInTime.getTime() + hoursStay * 3600000);

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
    } else if (roomData.status === 'occupied') {
      if (roomData.check_out) {
        const now = new Date();
        const checkOutTime = new Date(roomData.check_out);
        if (now >= checkOutTime) {
          console.log(`[verifyRFID] Room ${roomData.room_number} check_out time passed. Denying access.`);
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
        const errMsg = activationError.message || "";
        if (errMsg.includes("PGRST116")) {
          console.warn(`[verifyRFID] activateRFID returned PGRST116 for RFID ${rfid_uid}; ignoring error.`);
        } else {
          console.error('[verifyRFID] Error activating RFID:', activationError);
          return res.status(500).json({
            success: false,
            message: 'Error activating RFID.',
          });
        }
      } else {
        rfidData = updatedRFID;
      }
    }

    // 8) Create or find occupant record in room_occupancy_history
    let occupantRecordId = null;
    try {
      const { data: existingOcc, error: occErr } = await supabase
        .from('room_occupancy_history')
        .select('*')
        .eq('guest_id', guestData.id)
        .eq('room_id', roomData.id)
        .is('check_out', null)
        .maybeSingle();
      if (!occErr && existingOcc) {
        occupantRecordId = existingOcc.id;
      } else {
        const occupantSnapshot = {
          name: guestData.name,
          email: guestData.email,
          phone: guestData.phone,
          membership_level: guestData.membership_level || 'Regular',
        };
        const recordData = {
          room_id: roomData.id,
          guest_id: guestData.id,
          rfid_id: rfidData.id,
          registration_time: new Date().toISOString(),
          check_in: null,
          check_out: null,
          hours_stay: roomData.hours_stay ? parseFloat(roomData.hours_stay) : null,
          occupant_snapshot: occupantSnapshot,
        };
        const { data: newOcc, error: newOccErr } = await supabase
          .from('room_occupancy_history')
          .insert([recordData])
          .single();
        if (!newOccErr && newOcc) {
          occupantRecordId = newOcc.id;
        }
      }
    } catch (err) {
      console.error('[verifyRFID] Occupant creation error:', err);
    }

    if (occupantRecordId === undefined) {
      occupantRecordId = null;
    }

    return res.status(200).json({
      success: true,
      message: 'RFID verified successfully.',
      data: {
        rfid: rfidData,
        guest: guestData,
        room: roomData,
        occupancyHistoryId: occupantRecordId,
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

// -----------------------------------------------------------------------------
//  9) GET /api/rfid/valid-cards
//  Now we do a small two-step process to also fetch the 'room_number'
//  for each assigned/active RFID. This way, the Pi's local cache can
//  store the correct 'room_number' for fast unlock checks.
// -----------------------------------------------------------------------------
export const getValidRFIDCards = async (req, res) => {
  try {
    // 1) Fetch RFID tags that are 'assigned' or 'active'
    const { data: rfidRows, error: rfidError } = await supabase
      .from('rfid_tags')
      .select('id, rfid_uid, guest_id, status, created_at')
      .in('status', ['assigned', 'active']);
    if (rfidError) {
      console.error('[getValidRFIDCards] Error fetching valid RFID tags:', rfidError);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch valid RFID tags.',
      });
    }

    const result = {};

    // 2) For each RFID row, find a "reserved" or "occupied" room for that guest
    //    to determine the correct 'room_number'.
    for (const row of rfidRows) {
      let room_number = null;
      if (row.guest_id) {
        // Fetch occupant rooms
        const { data: occupantRooms, error: occupantErr } = await supabase
          .from('rooms')
          .select('room_number, status')
          .eq('guest_id', row.guest_id)
          .in('status', ['reserved', 'occupied']);

        if (!occupantErr && occupantRooms && occupantRooms.length > 0) {
          // pick occupantRooms[0] for simplicity
          room_number = occupantRooms[0].room_number;
        }
      }

      result[row.rfid_uid] = {
        rfid_uid: row.rfid_uid,
        guest_id: row.guest_id,
        status: row.status,
        created_at: row.created_at,
        room_number,
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Valid RFID mappings fetched successfully (including room_number).',
      data: result,
    });
  } catch (err) {
    console.error('[getValidRFIDCards] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching valid cards.',
    });
  }
};

// -----------------------------------------------------------------------------
// 10) POST /api/rfid/post-verify-actions
// -----------------------------------------------------------------------------
export const postVerifyActions = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'rfid_uid is required.',
      });
    }
    // 1) Look up the RFID record
    const { data: rfidData, error: rfidErr } = await findRFIDByUID(rfid_uid);
    if (rfidErr) {
      console.error('[postVerifyActions] Error finding RFID:', rfidErr);
      return res.status(500).json({
        success: false,
        message: 'Database error: Could not find RFID.',
      });
    }
    if (!rfidData) {
      return res.status(404).json({
        success: false,
        message: `RFID ${rfid_uid} not found.`,
      });
    }
    if (!rfidData.guest_id) {
      return res.status(400).json({
        success: false,
        message: 'RFID is not assigned to any guest, cannot proceed.',
      });
    }

    // 2) Optionally find an open occupant record
    let occupant = null;
    let occupantId = null;
    try {
      const { data: occData, error: occErr } = await supabase
        .from('room_occupancy_history')
        .select('*')
        .eq('guest_id', rfidData.guest_id)
        .eq('rfid_id', rfidData.id)
        .is('check_out', null)
        .maybeSingle();
      if (!occErr && occData) {
        occupant = occData;
        occupantId = occData.id;
      }
    } catch (err) {
      console.error('[postVerifyActions] Occupant fetch error:', err);
    }

    // 3) Check in occupant if applicable
    const occupantCheckIn = async () => {
      if (!occupantId || !occupant) return 'No occupant record found.';
      if (occupant.check_in) return 'Occupant already checked in.';
      const url = `${PI_GATEWAY_BASE_URL}/room-occupancy-history/${occupantId}/checkin`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_in: new Date().toISOString() }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`HTTP ${resp.status} => ${txt}`);
        }
        return 'Occupant check-in successful.';
      } catch (err) {
        console.error('[postVerifyActions] Occupant check-in error:', err);
        return `Occupant check-in error: ${err.message}`;
      }
    };

    // 4) Store leases via Pi-based endpoint
    const storeLeases = async () => {
      const piGatewayUrl = PI_GATEWAY_BASE_URL;
      try {
        const resp = await fetch(`${piGatewayUrl}/store-leases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.PUBLIC_API_KEY || '',
          },
          body: JSON.stringify({
            guestId: rfidData.guest_id,
            rfidId: rfidData.id,
          }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`HTTP ${resp.status} => ${txt}`);
        }
        return 'Store leases succeeded.';
      } catch (err) {
        console.error('[postVerifyActions] Store leases error:', err);
        return `Store leases error: ${err.message}`;
      }
    };

    // 5) Activate internet via Pi-based endpoint
    const activateInternet = async () => {
      if (!occupant || !occupant.check_in || !occupant.hours_stay) {
        return 'No check_in or hours_stay; skipping internet activation.';
      }
      let checkInIso = occupant.check_in;
      let checkOutIso = occupant.check_out;
      if (!checkOutIso) {
        const checkInTime = new Date(checkInIso);
        const hoursStay = parseFloat(occupant.hours_stay) || 1;
        const out = new Date(checkInTime.getTime() + hoursStay * 3600000);
        checkOutIso = out.toISOString();
      }
      const piGatewayUrl = PI_GATEWAY_BASE_URL;
      try {
        const resp = await fetch(`${piGatewayUrl}/activate-internet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.PUBLIC_API_KEY || '',
          },
          body: JSON.stringify({
            guest_id: rfidData.guest_id,
            check_in: checkInIso,
            check_out: checkOutIso,
          }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`HTTP ${resp.status} => ${txt}`);
        }
        return 'Internet activated successfully.';
      } catch (err) {
        console.error('[postVerifyActions] Activate internet error:', err);
        return `Activate internet error: ${err.message}`;
      }
    };

    // 6) Log access via endpoint /access-logs/granted
    const logAccess = async () => {
      try {
        const resp = await fetch(`${BACKEND_BASE_URL}/access-logs/granted`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rfid_uid }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`HTTP ${resp.status} => ${txt}`);
        }
        return 'Access log saved.';
      } catch (err) {
        console.error('[postVerifyActions] Log access error:', err);
        return `Log access error: ${err.message}`;
      }
    };

    // 7) Execute all post-verification tasks in parallel
    const [checkInMsg, leaseMsg, netMsg, logMsg] = await Promise.all([
      occupantCheckIn(),
      storeLeases(),
      activateInternet(),
      logAccess(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Post-verification actions completed.',
      details: {
        occupantCheckIn: checkInMsg,
        storeLeases: leaseMsg,
        activateInternet: netMsg,
        logAccess: logMsg,
      },
    });
  } catch (err) {
    console.error('[postVerifyActions] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error in post-verify-actions.',
      error: err.message,
    });
  }
};
