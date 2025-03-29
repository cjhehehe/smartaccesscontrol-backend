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
      // Expected as an array of objects: [ { mac, ip, status }, ... ]
      mac_addresses_snapshot,
    } = req.body;

    let numericHoursStay = null;
    if (typeof hours_stay !== 'undefined' && hours_stay !== null) {
      numericHoursStay = parseFloat(hours_stay);
      if (isNaN(numericHoursStay)) {
        numericHoursStay = null;
      }
    }

    // Insert MAC addresses if provided.
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

    // Create the occupant record.
    const recordData = {
      room_id: room_id ?? null,
      guest_id: guest_id ?? null,
      rfid_id: rfid_id || null,
      registration_time: registration_time || new Date().toISOString(),
      check_in: null, // To be set later by check-in event.
      check_out: check_out || null, // To be set later by check-out event.
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
 * Returns all occupancy history records, sorted by created_at desc.
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
 * Returns a single occupancy history record by ID.
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
      return res.status(200).json({  // Return empty response instead of error.
        success: true,
        message: `No record found for ID=${id}`,
        data: null,
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
 * Generic update method for partial updates.
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
 * If not, auto-create one using fields from the request body.
 */
const ensureOccupantRecord = async (id, reqBody) => {
  // Try fetching the record by ID.
  let recordResult = await getHistoryRecordById(id);
  if (!recordResult.data) {
    // Auto-create a new occupant record.
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
 * Stores a check-in event in the room occupancy history.
 * If the record does not exist, it auto-creates one.
 */
export const checkInHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_in, hours_stay } = req.body;
    const checkInTime = check_in || new Date().toISOString();
    const numericHoursStay =
      typeof hours_stay === 'number' ? hours_stay : parseFloat(hours_stay);
    const hoursValue = !isNaN(numericHoursStay) ? numericHoursStay : undefined;

    // Auto-create the occupant record if it doesn't exist.
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
    // Even if data is null, we want to respond with a success message as the event is stored.
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Error performing occupancy check-in for ID=${id}`,
        error: error.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Occupancy record check-in event stored successfully',
      data: data || {},
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
 * Stores a check-out event in the room occupancy history.
 * Computes if the check-out is early and sets a reason.
 * Auto-creates the record if it does not exist.
 */
export const checkOutHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_out: providedCheckOut, check_out_reason: clientReason } = req.body;
    const checkOutTime = providedCheckOut || new Date().toISOString();

    // Auto-create the occupant record if it doesn't exist.
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
    // Compute whether the check-out is early.
    let wasEarly = false;
    if (existingRecord && existingRecord.check_out) {
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
      message: 'Occupancy record check-out event stored successfully',
      data: data || {},
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
