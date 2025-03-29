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
    //    We'll store the newly inserted rows in an array called "insertedMacs"
    let insertedMacs = [];
    if (Array.isArray(mac_addresses_snapshot) && mac_addresses_snapshot.length > 0) {
      for (const device of mac_addresses_snapshot) {
        // Each "device" is expected to be an object with "mac", "ip", "status", etc.
        // We'll insert it into mac_addresses, along with the guest_id and rfid_id if you want.

        // For example, if you want to override device.guest_id with the one from request:
        const toInsert = {
          mac: device.mac,
          ip: device.ip ?? null,
          status: device.status ?? 'unauthenticated',
          guest_id: guest_id ?? null,
          rfid_id: rfid_id ?? null,
          // You can add other columns if needed
        };

        const { data: macData, error: macError } = await supabase
          .from('mac_addresses')
          .insert([toInsert])
          .single();

        if (macError) {
          console.error('[addHistoryRecord] Error inserting MAC:', macError);
          // If desired, you could return an error here. But typically you'd just log it
          // and continue. For now, let's just continue but skip adding it to insertedMacs.
          continue;
        }

        // Add the newly inserted row to insertedMacs array
        insertedMacs.push(macData);
      }
    }

    // 3) Now we create the room occupancy record
    //    We store the newly inserted MAC rows in the mac_addresses_snapshot field.
    const recordData = {
      room_id: room_id ?? null,
      guest_id: guest_id ?? null,
      rfid_id: rfid_id || null,
      registration_time: registration_time || null,
      check_in: null, // set later by checkInOccupancy
      check_out: check_out || null, // set later by checkOutOccupancy
      hours_stay: numericHoursStay,
      check_out_reason: check_out_reason || null,
      was_early_checkout: was_early_checkout || false,
      occupant_snapshot: occupant_snapshot || {},
      // Final snapshot is the array of inserted rows from the mac_addresses table
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

    // 4) Return success
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
      return res.status(404).json({
        success: false,
        message: 'Room occupancy history record not found',
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
 * Generic update method for partial updates (including occupant_snapshot).
 */
export const updateHistoryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing record ID',
      });
    }

    // Convert hours_stay if provided
    if (typeof updateData.hours_stay !== 'undefined') {
      const parsed = parseFloat(updateData.hours_stay);
      if (!isNaN(parsed)) {
        updateData.hours_stay = parsed;
      } else {
        updateData.hours_stay = null;
      }
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
 * Searches occupant_snapshot for partial text match.
 */
export const searchHistory = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required for search',
      });
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
 * POST /api/room-occupancy-history/:id/checkin
 * "Check-in" the occupancy record:
 *   - Sets check_in if not already set
 *   - Optionally updates hours_stay if provided
 */
export const checkInHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, hours_stay } = req.body;

    // You could default check_in to now() if not provided
    const checkInTime = check_in || new Date().toISOString();

    const numericHoursStay =
      typeof hours_stay === 'number' ? hours_stay : parseFloat(hours_stay);
    const hoursValue = !isNaN(numericHoursStay) ? numericHoursStay : undefined;

    const { data, error } = await checkInOccupancyRecord(id, checkInTime, hoursValue);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error performing occupancy check-in',
        error: error.message,
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Room occupancy history record not found',
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
 */
export const checkOutHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      check_out: providedCheckOut, // optional override
      check_out_reason: clientReason, // e.g. "Early Check-Out" or "Auto Check-Out"
    } = req.body;

    // Use now() as fallback if check_out is not provided
    const checkOutTime = providedCheckOut || new Date().toISOString();

    // Step 1: Fetch the existing record to compare scheduled vs. actual checkout time
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
        message: 'Occupancy record not found',
      });
    }

    // Step 2: Determine if this is early checkout
    let wasEarly = false;
    if (existingRecord.check_out) {
      const expected = new Date(existingRecord.check_out).getTime();
      const actual = new Date(checkOutTime).getTime();
      wasEarly = actual < expected;
    }

    // Step 3: Default reason if none passed in
    const reason = clientReason || (wasEarly ? 'Early Check-Out' : 'Auto Check-Out');

    // Step 4: Update the record
    const { data, error: updateError } = await checkOutOccupancyRecord(
      id,
      checkOutTime,
      reason,
      wasEarly
    );
    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Error updating occupancy record for check-out',
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
