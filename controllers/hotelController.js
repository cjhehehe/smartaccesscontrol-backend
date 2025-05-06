// controllers/hotelController.js

import { findRoomByNumber, updateRoomByNumber } from '../models/roomsModel.js';
import {
  getAvailableRFIDs,
  assignRFIDToGuest,
  findRFIDByUID,
  getAllRFIDs
} from '../models/rfidModel.js';
import {
  createHistoryRecord,
  getAllHistoryRecords
} from '../models/roomOccupancyHistoryModel.js';
import { findUserById } from '../models/userModel.js'; // for occupant_snapshot

/**
 * Helper to assign a room by its number.
 * (unchanged)
 */
const assignRoomByNumberModel = async (room_number, guest_id, hours_stay) => {
  const numericHours = parseFloat(hours_stay);
  if (isNaN(numericHours) || numericHours <= 0) {
    return { data: null, error: new Error("Invalid hours_stay") };
  }

  const { data: room, error: findError } = await findRoomByNumber(room_number);
  if (findError) return { data: null, error: findError };
  if (!room) return { data: null, error: new Error(`Room ${room_number} not found`) };
  if (room.status !== 'available') {
    return { data: null, error: new Error(`Room ${room_number} is not available`) };
  }

  // reserve it
  const updateFields = {
    guest_id,
    hours_stay: numericHours,
    status: 'reserved',
    registration_time: new Date().toISOString(),
  };
  const { data, error } = await updateRoomByNumber(
    room_number,
    updateFields,
    { onlyIfAvailable: false }
  );
  return { data, error };
};

/**
 * POST /api/hotel/register-flow
 * Now also writes check_in/check_out into the rooms table.
 */
export const registerFlow = async (req, res) => {
  try {
    const {
      guest_id,
      room_number,
      check_in,
      check_out,
      rfid_id
    } = req.body;

    // 0) Basic validation
    if (!guest_id || !room_number || !check_in || !check_out || !rfid_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: guest_id, room_number, check_in, check_out, rfid_id"
      });
    }

    // 1) parse dates
    const inDate  = new Date(check_in);
    const outDate = new Date(check_out);
    if (isNaN(inDate) || isNaN(outDate) || outDate <= inDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid check_in/check_out range"
      });
    }

    // 2) compute hours_stay (we still need it for occupancy history)
    const hours_stay = (outDate - inDate) / (1000 * 60 * 60);

    // 3) ensure no open occupancy for this guest
    const { data: existingRecords, error: recordsError } = await getAllHistoryRecords();
    if (recordsError) {
      return res.status(500).json({
        success: false,
        message: "Error checking existing occupancy records",
        error: recordsError.message,
      });
    }
    const existingRecord = existingRecords?.find(
      r => r.guest_id === guest_id && r.check_out === null
    );
    if (existingRecord) {
      return res.status(200).json({
        success: true,
        message: "Occupancy record already exists for this guest.",
        data: {
          roomId: existingRecord.room_id,
          occupancyRecordId: existingRecord.id,
          assignedRFID: { id: rfid_id },
        },
      });
    }

    // 4) reserve the room
    const { data: roomData, error: roomError } = await assignRoomByNumberModel(
      room_number, guest_id, hours_stay
    );
    if (roomError || !roomData) {
      return res.status(500).json({
        success: false,
        message: "Failed to assign room",
        error: roomError?.message || roomError,
      });
    }

    // ────────────────────────────────
    // 5) QUICK FIX: stamp check_in/check_out on rooms table
    // ────────────────────────────────
    const checkInISO  = inDate.toISOString();   // e.g. "2025-05-06T14:00:00.000Z"
    const checkOutISO = outDate.toISOString();  // e.g. "2025-05-07T12:00:00.000Z"
    const { data: timeData, error: timeError } = await updateRoomByNumber(
      room_number,
      { check_in: checkInISO, check_out: checkOutISO },
      { onlyIfAvailable: false }
    );
    if (timeError) {
      return res.status(500).json({
        success: false,
        message: "Failed to write check_in/check_out into room record",
        error: timeError.message,
      });
    }
    // ────────────────────────────────

    // 6) pick up the RFID UID
    let rfidUid;
    {
      const { data: availableRFIDs, error: rfidFetchError } = await getAvailableRFIDs();
      if (!rfidFetchError && availableRFIDs) {
        const found = availableRFIDs.find(item => item.id === rfid_id);
        if (found) rfidUid = found.rfid_uid;
      }
      if (!rfidUid) {
        const { data: allRFIDs, error: allErr } = await getAllRFIDs();
        if (allErr || !allRFIDs) {
          return res.status(500).json({
            success: false,
            message: "Failed to fetch all RFIDs for fallback",
            error: allErr?.message || allErr,
          });
        }
        const found = allRFIDs.find(item => item.id === rfid_id);
        if (found) rfidUid = found.rfid_uid;
      }
      if (!rfidUid) {
        return res.status(400).json({
          success: false,
          message: "RFID not found or already in use",
        });
      }
    }

    // 7) assign the RFID if available
    const { data: rfidRecord, error: rfidRecordError } = await findRFIDByUID(rfidUid);
    if (rfidRecordError || !rfidRecord) {
      return res.status(500).json({
        success: false,
        message: "RFID record not found",
        error: rfidRecordError?.message || rfidRecordError,
      });
    }
    if (rfidRecord.status === 'available') {
      const { error: assignErr } = await assignRFIDToGuest(rfidUid, guest_id);
      if (assignErr) {
        return res.status(500).json({
          success: false,
          message: "Failed to assign RFID",
          error: assignErr.message || assignErr,
        });
      }
    }

    // 8) take a snapshot of the guest record
    let occupantSnapshot = {};
    {
      const { data: guestData, error: guestErr } = await findUserById(guest_id);
      if (!guestErr && guestData) {
        const { password, ...safe } = guestData;
        occupantSnapshot = safe;
      }
    }

    // 9) write the occupancy_history record
    const occupancyData = {
      room_id:            roomData.id,
      guest_id,
      rfid_id,
      registration_time:  new Date().toISOString(),
      check_in:           null,
      check_out:          null,
      hours_stay,               // we still store this too
      check_out_reason:   null,
      was_early_checkout: false,
      occupant_snapshot:  occupantSnapshot,
      mac_addresses_snapshot: {},
      event_indicator:    "registered"
    };
    const { data: occupancyRecord, error: occErr } = await createHistoryRecord(occupancyData);
    if (occErr || !occupancyRecord) {
      console.error("Supabase insert error:", occErr);
      return res.status(500).json({
        success: false,
        message: "Failed to create occupancy record",
        error: occErr?.message || occErr,
      });
    }

    // 10) final success response
    return res.status(201).json({
      success: true,
      message: "Registration flow completed successfully",
      data: {
        roomId:              roomData.id,
        occupancyRecordId:   occupancyRecord.id,
        assignedRFID:        { id: rfid_id, rfid_uid: rfidUid },
      },
    });

  } catch (e) {
    console.error("registerFlow Error:", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};
