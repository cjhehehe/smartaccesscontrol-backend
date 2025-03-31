// controllers/hotelController.js
import { assignRoomByNumber } from '../models/roomsModel.js';
import { getAvailableRFIDs, assignRFIDToGuest } from '../models/rfidModel.js';
import { createHistoryRecord } from '../models/roomOccupancyHistoryModel.js';

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

    // 1. Assign the room by room number
    const { data: roomData, error: roomError } = await assignRoomByNumber(
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
    // availableRFIDs is expected as a dictionary; find by matching rfid_id
    let rfidUid;
    for (const key in availableRFIDs) {
      const item = availableRFIDs[key];
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
      guest_id: guest_id,
      rfid_id: rfid_id,
      registration_time: new Date().toISOString(),
      check_in: null,
      check_out: null,
      hours_stay: hours_stay,
      check_out_reason: null,
      was_early_checkout: false,
      occupant_snapshot: {}, // You could also fetch the guest profile here
      mac_addresses_snapshot: {} // You could pass additional MAC data if available
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
