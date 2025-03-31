// controllers/hotelController.js
import { findRoomByNumber, updateRoomByNumber } from '../models/roomsModel.js';
import { getAvailableRFIDs, assignRFIDToGuest } from '../models/rfidModel.js';
import { createHistoryRecord } from '../models/roomOccupancyHistoryModel.js';

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
 *  - Assign the room
 *  - Fetch available RFID cards and select the matching one by rfid_id
 *  - Assign the RFID to the guest
 *  - (Optionally) store leases (this example assumes success; you may call an external service)
 *  - Create the occupancy record
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

    // 1. Assign the room using the helper function
    const { data: roomData, error: roomError } = await assignRoomByNumberModel(
      room_number,
      guest_id,
      hours_stay
    );
    if (roomError || !roomData) {
      return res.status(500).json({
        success: false,
        message: "Failed to assign room",
        error: roomError?.message || roomError
      });
    }
    const realRoomId = roomData.id;

    // 2. Get available RFIDs and pick the one matching rfid_id
    const { data: availableRFIDs, error: rfidFetchError } = await getAvailableRFIDs();
    if (rfidFetchError || !availableRFIDs) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch available RFIDs",
        error: rfidFetchError?.message || rfidFetchError
      });
    }
    // Assuming availableRFIDs is an array
    let rfidUid;
    for (const item of availableRFIDs) {
      if (item.id === rfid_id) {
        rfidUid = item.rfid_uid;
        break;
      }
    }
    if (!rfidUid) {
      return res.status(400).json({
        success: false,
        message: "RFID not found among available cards"
      });
    }

    // 3. Assign the RFID to the guest
    const { data: assignedRFID, error: assignRFIDError } = await assignRFIDToGuest(
      rfidUid,
      guest_id
    );
    if (assignRFIDError || !assignedRFID) {
      return res.status(500).json({
        success: false,
        message: "Failed to assign RFID",
        error: assignRFIDError?.message || assignRFIDError
      });
    }

    // 4. (Optional) Store leases – here we assume this step succeeds.
    // You may add an external API call for storing DHCP leases if needed.

    // 5. Create the occupancy record
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
      occupant_snapshot: {}, // Optionally, include guest profile data
      mac_addresses_snapshot: {} // Optionally, include MAC data if available
    };
    const { data: occupancyRecord, error: occupancyError } = await createHistoryRecord(occupancyData);
    if (occupancyError || !occupancyRecord) {
      return res.status(500).json({
        success: false,
        message: "Failed to create occupancy record",
        error: occupancyError?.message || occupancyError
      });
    }

    return res.status(201).json({
      success: true,
      message: "Check-in flow completed successfully",
      data: {
        roomId: realRoomId,
        occupancyRecordId: occupancyRecord.id,
        assignedRFID
      }
    });
  } catch (e) {
    console.error("checkinFlow Error:", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: e.message
    });
  }
};
