// controllers/roomOccupancyHistoryController.js

import supabase from '../config/supabase.js';
import {
  createHistoryRecord,
  getAllHistoryRecords,
  getHistoryRecordById,
  updateHistoryRecord as updateRecordModel,
  searchHistoryRecords,
  checkInOccupancyRecord,
  checkOutOccupancyRecord,
} from '../models/roomOccupancyHistoryModel.js';

/**
 * POST /api/room-occupancy-history
 * Creates a new room occupancy record (the "registration" event).
 * Also inserts MAC addresses into the mac_addresses table if provided.
 */
export const addHistoryRecord = async (req, res) => {
  try {
    const {
      room_id,
      guest_id,
      rfid_id,
      registration_time,
      check_out,
      hours_stay,
      check_out_reason,
      was_early_checkout,
      occupant_snapshot,
      // We expect mac_addresses_snapshot to be an array of objects:
      // e.g. [ { mac, ip, status }, ... ]
      mac_addresses_snapshot,
    } = req.body;

    // 1) Convert hours_stay to a float if provided
    let numericHoursStay = null;
    if (typeof hours_stay !== 'undefined' && hours_stay !== null) {
      numericHoursStay = parseFloat(hours_stay);
      if (isNaN(numericHoursStay)) {
        numericHoursStay = null;
      }
    }

    // 2) Insert each device in mac_addresses (if provided)
    let insertedMacs = [];
    if (Array.isArray(mac_addresses_snapshot) && mac_addresses_snapshot.length > 0) {
      for (const device of mac_addresses_snapshot) {
        const toInsert = {
          mac: device.mac,
          ip: device.ip ?? null,
          status: device.status ?? 'unauthenticated',
          guest_id: guest_id ?? null,
          rfid_id: rfid_id ?? null,
        };

        const { data: macData, error: macError } = await supabase
          .from('mac_addresses')
          .insert([toInsert])
          .single();

        if (macError) {
          console.error('[addHistoryRecord] Error inserting MAC:', macError);
          continue;
        }
        insertedMacs.push(macData);
      }
    }

    // 3) Create the room occupancy record
    const recordData = {
      room_id: room_id ?? null,
      guest_id: guest_id ?? null,
      rfid_id: rfid_id || null,
      registration_time: registration_time || null,
      check_in: null, // will be set at check-in time
      check_out: check_out || null, // will be set at check-out time
      hours_stay: numericHoursStay,
      check_out_reason: check_out_reason || null,
      was_early_checkout: was_early_checkout || false,
      occupant_snapshot: occupant_snapshot || {},
      mac_addresses_snapshot: insertedMacs,
    };

    const { data, error } = await createHistoryRecord(recordData);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error creating room occupancy history record',
        error: error.message || error,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Room occupancy history record created successfully',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Unexpected error in addHistoryRecord:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * GET /api/room-occupancy-history
 */
export const getHistoryRecords = async (req, res) => {
  try {
    const { data, error } = await getAllHistoryRecords();
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching room occupancy history records',
        error: error.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Room occupancy history records retrieved successfully',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Unexpected error in getHistoryRecords:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * GET /api/room-occupancy-history/:id
 */
export const getHistoryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getHistoryRecordById(id);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching room occupancy history record',
        error: error.message,
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Room occupancy history record not found for ID=${id}`,
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Unexpected error in getHistoryRecord:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * PUT /api/room-occupancy-history/:id
 */
export const updateHistoryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing record ID' });
    }
    if (typeof updateData.hours_stay !== 'undefined') {
      const parsed = parseFloat(updateData.hours_stay);
      updateData.hours_stay = !isNaN(parsed) ? parsed : null;
    }
    const { data, error } = await updateRecordModel(id, updateData);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error updating room occupancy history record',
        error: error.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Room occupancy history record updated successfully',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Unexpected error in updateHistoryRecord:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * GET /api/room-occupancy-history/search?query=...
 */
export const searchHistory = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter is required for search' });
    }
    const { data, error } = await searchHistoryRecords(query);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error searching room occupancy history records',
        error: error.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Room occupancy history search results',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Unexpected error in searchHistory:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * Helper: Ensure an occupant record exists.
 * If not, auto-create one using request body data.
 */
const ensureOccupantRecord = async (id, reqBody) => {
  // Try fetching by ID
  let recordResult = await getHistoryRecordById(id);
  if (!recordResult.data) {
    // Auto-create the record using provided fields from reqBody
    // Adjust the required fields as necessary
    const createResult = await createHistoryRecord({
      room_id: reqBody.room_id,
      guest_id: reqBody.guest_id,
      rfid_id: reqBody.rfid_id,
      registration_time: reqBody.registration_time || new Date().toISOString(),
      check_out: reqBody.check_out || null,
      hours_stay: reqBody.hours_stay,
      occupant_snapshot: reqBody.occupant_snapshot || {},
      mac_addresses_snapshot: reqBody.mac_addresses_snapshot || [],
    });
    if (createResult.error) {
      throw new Error('Auto-creation of occupant record failed: ' + createResult.error.message);
    }
    return createResult.data.id;
  }
  return id;
};

/**
 * POST /api/room-occupancy-history/:id/checkin
 * "Check-in" the occupancy record:
 *   - Sets check_in if not already set
 *   - Optionally updates hours_stay if provided
 *   - Auto-creates a record if not found
 */
export const checkInHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_in, hours_stay } = req.body;
    const checkInTime = check_in || new Date().toISOString();
    const numericHoursStay =
      typeof hours_stay === 'number' ? hours_stay : parseFloat(hours_stay);
    const hoursValue = !isNaN(numericHoursStay) ? numericHoursStay : undefined;

    // Ensure the occupant record exists; auto-create if necessary.
    try {
      id = await ensureOccupantRecord(id, req.body);
    } catch (autoErr) {
      return res.status(500).json({
        success: false,
        message: 'Error auto-creating occupancy record',
        error: autoErr.message,
      });
    }

    const { data, error } = await checkInOccupancyRecord(id, checkInTime, hoursValue);
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Error performing occupancy check-in for ID=${id}`,
        error: error.message,
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Room occupancy history record not found for ID=${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Occupancy record check-in successful',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Error in checkInHistory:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

/**
 * POST /api/room-occupancy-history/:id/checkout
 * "Check-out" the occupancy record:
 *   - Sets check_out to now or the provided time
 *   - Computes was_early_checkout automatically
 *   - Sets check_out_reason based on method
 *   - Auto-creates a record if not found
 */
export const checkOutHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_out: providedCheckOut, check_out_reason: clientReason } = req.body;
    const checkOutTime = providedCheckOut || new Date().toISOString();

    // Ensure the occupant record exists; auto-create if necessary.
    try {
      id = await ensureOccupantRecord(id, req.body);
    } catch (autoErr) {
      return res.status(500).json({
        success: false,
        message: 'Error auto-creating occupancy record',
        error: autoErr.message,
      });
    }

    const { data: existingRecord, error: fetchError } = await getHistoryRecordById(id);
    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching occupancy record for check-out',
        error: fetchError.message,
      });
    }
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: `Occupancy record not found for ID=${id}`,
      });
    }

    let wasEarly = false;
    if (existingRecord.check_out) {
      const expected = new Date(existingRecord.check_out).getTime();
      const actual = new Date(checkOutTime).getTime();
      wasEarly = actual < expected;
    }
    const reason = clientReason || (wasEarly ? 'Early Check-Out' : 'Auto Check-Out');

    const { data, error: updateError } = await checkOutOccupancyRecord(
      id,
      checkOutTime,
      reason,
      wasEarly
    );
    if (updateError) {
      return res.status(500).json({
        success: false,
        message: `Error updating occupancy record for check-out (ID=${id})`,
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Occupancy record check-out successful',
      data,
    });
  } catch (err) {
    console.error('[RoomOccupancyHistoryController] Error in checkOutHistory:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};
