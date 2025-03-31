// controllers/hotelController.js
import { findRoomByNumber, updateRoomByNumber } from '../models/roomsModel.js';
import { getAvailableRFIDs, assignRFIDToGuest, findRFIDByUID, getAllRFIDs } from '../models/rfidModel.js';
import { createHistoryRecord, getAllHistoryRecords } from '../models/roomOccupancyHistoryModel.js';
// Import a helper to fetch guest data so we can populate occupant_snapshot
import { findUserById } from '../models/userModel.js'; // Adjust path as needed

/**
 * Helper function to assign a room by number.
 * It validates the hours of stay, ensures the room exists and is available,
 * and then reserves the room by updating its record.
 */
const assignRoomByNumberModel = async (room_number, guest_id, hours_stay) => {
  const numericHoursStay = parseFloat(hours_stay);
  if (isNaN(numericHoursStay) || numericHoursStay <= 0) {
    return { data: null, error: new Error("Invalid hours_stay") };
  }

  // Find the room by its number
  const { data: room, error: findError } = await findRoomByNumber(room_number);
  if (findError) return { data: null, error: findError };
  if (!room) return { data: null, error: new Error(`Room ${room_number} not found`) };
  if (room.status !== 'available') {
    return { data: null, error: new Error(`Room ${room_number} is not available`) };
  }

  // Update the room to reserve it
  const updateFields = {
    guest_id,
    hours_stay: numericHoursStay,
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
 * POST /api/hotel/checkin-flow
 * Performs the entire check-in flow in one call:
 *  - Checks for an existing open occupancy record to prevent duplicates.
 *  - Assigns the room.
 *  - Retrieves available RFID cards and, if necessary, falls back to all RFIDs.
 *  - If the RFID is available, it assigns the RFID to the guest.
 *  - Finally, it creates the room occupancy history record (the only place where this record is created),
 *    and sets the event_indicator to "checkin".
 */
export const checkinFlow = async (req, res) => {
  try {
    const { guest_id, room_number, hours_stay, rfid_id } = req.body;
    if (!guest_id || !room_number || !hours_stay || !rfid_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: guest_id, room_number, hours_stay, rfid_id" 
      });
    }

    // 0. Check if an open occupancy record already exists for this guest.
    const { data: existingRecords, error: recordsError } = await getAllHistoryRecords();
    if (recordsError) {
      return res.status(500).json({
        success: false,
        message: "Error checking existing occupancy records",
        error: recordsError.message,
      });
    }
    const existingRecord = existingRecords?.find(
      (record) => record.guest_id === guest_id && record.check_out === null
    );
    if (existingRecord) {
      // Occupancy already exists; return that record to avoid duplicate creation.
      return res.status(200).json({
        success: true,
        message: "Occupancy record already exists for this guest and room.",
        data: {
          roomId: existingRecord.room_id,
          occupancyRecordId: existingRecord.id,
          assignedRFID: { id: rfid_id },
        },
      });
    }

    // 1. Assign the room using the helper function.
    const { data: roomData, error: roomError } = await assignRoomByNumberModel(
      room_number,
      guest_id,
      hours_stay
    );
    if (roomError || !roomData) {
      return res.status(500).json({
        success: false,
        message: "Failed to assign room",
        error: roomError?.message || roomError,
      });
    }
    const realRoomId = roomData.id;

    // 2. Retrieve available RFIDs and try to find one matching rfid_id.
    const { data: availableRFIDs, error: rfidFetchError } = await getAvailableRFIDs();
    let rfidUid;
    if (!rfidFetchError && availableRFIDs && availableRFIDs.length > 0) {
      for (const item of availableRFIDs) {
        if (item.id === rfid_id) {
          rfidUid = item.rfid_uid;
          break;
        }
      }
    }

    // 3. If not found among available, fall back to lookup among all RFIDs.
    if (!rfidUid) {
      const { data: allRFIDs, error: allRFIDsError } = await getAllRFIDs();
      if (allRFIDsError || !allRFIDs) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch all RFIDs for fallback",
          error: allRFIDsError?.message || allRFIDsError,
        });
      }
      const foundRFID = allRFIDs.find((item) => item.id === rfid_id);
      if (foundRFID) {
        rfidUid = foundRFID.rfid_uid;
      }
    }
    if (!rfidUid) {
      return res.status(400).json({
        success: false,
        message: "RFID not found or already in use",
      });
    }

    // 4. Check the RFID record; if its status is 'available', assign it.
    const { data: rfidRecord, error: rfidRecordError } = await findRFIDByUID(rfidUid);
    if (rfidRecordError || !rfidRecord) {
      return res.status(500).json({
        success: false,
        message: "RFID record not found",
        error: rfidRecordError?.message || rfidRecordError,
      });
    }
    if (rfidRecord.status === 'available') {
      const { data: assignedRFID, error: assignRFIDError } = await assignRFIDToGuest(
        rfidUid,
        guest_id
      );
      if (assignRFIDError || !assignedRFID) {
        return res.status(500).json({
          success: false,
          message: "Failed to assign RFID",
          error: assignRFIDError?.message || assignRFIDError,
        });
      }
    }

    // 5. Prepare occupant_snapshot data from the "guests" table (excluding password).
    let occupantSnapshot = {};
    const { data: guestData, error: guestErr } = await findUserById(guest_id);
    if (guestErr) {
      console.error("Failed to fetch guest data for occupant_snapshot:", guestErr);
    } else if (guestData) {
      const { password, ...safeGuestData } = guestData;
      occupantSnapshot = safeGuestData;
    }

    // 6. Create the occupancy record – this is the only place that a record is created.
    // We set event_indicator to "checkin"
    const occupancyData = {
      room_id: realRoomId,
      guest_id,
      rfid_id,
      registration_time: new Date().toISOString(),
      check_in: null,
      check_out: null,
      hours_stay,
      check_out_reason: null,
      was_early_checkout: false,
      occupant_snapshot: occupantSnapshot,
      mac_addresses_snapshot: {},
      event_indicator: "checkin" // NEW: Indicator column set to "checkin"
    };

    const { data: occupancyRecord, error: occupancyError } = await createHistoryRecord(occupancyData);
    if (occupancyError || !occupancyRecord) {
      console.error("Supabase insert error:", occupancyError);
      return res.status(500).json({
        success: false,
        message: "Failed to create occupancy record",
        error: occupancyError?.message || occupancyError,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Check-in flow completed successfully",
      data: {
        roomId: realRoomId,
        occupancyRecordId: occupancyRecord.id,
        assignedRFID: { id: rfid_id, rfid_uid: rfidUid },
      },
    });
  } catch (e) {
    console.error("checkinFlow Error:", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};
