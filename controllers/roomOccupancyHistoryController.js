// controllers/roomOccupancyHistoryController.js

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
      mac_addresses_snapshot,
    } = req.body;

    // Convert hours_stay to a float if provided
    let numericHoursStay = null;
    if (typeof hours_stay !== 'undefined' && hours_stay !== null) {
      numericHoursStay = parseFloat(hours_stay);
      if (isNaN(numericHoursStay)) {
        numericHoursStay = null;
      }
    }

    // Prepare record data
    const recordData = {
      room_id: room_id ?? null,
      guest_id: guest_id ?? null,
      rfid_id: rfid_id || null,
      registration_time: registration_time || null, // if you want to store the time they "registered"
      check_in: null,    // set later by checkInOccupancy
      check_out: check_out || null, // set later by checkOutOccupancy
      hours_stay: numericHoursStay,
      check_out_reason: check_out_reason || null,
      was_early_checkout: was_early_checkout || false,
      occupant_snapshot: occupant_snapshot || {},
      mac_addresses_snapshot: mac_addresses_snapshot || {},
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
    console.error(
      '[RoomOccupancyHistoryController] Unexpected error in addHistoryRecord:',
      err
    );
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
    console.error(
      '[RoomOccupancyHistoryController] Unexpected error in getHistoryRecords:',
      err
    );
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
    console.error(
      '[RoomOccupancyHistoryController] Unexpected error in getHistoryRecord:',
      err
    );
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
    console.error(
      '[RoomOccupancyHistoryController] Unexpected error in updateHistoryRecord:',
      err
    );
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
    console.error(
      '[RoomOccupancyHistoryController] Unexpected error in searchHistory:',
      err
    );
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
 *   - Sets was_early_checkout if needed
 *   - Sets check_out_reason if provided
 */
export const checkOutHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      check_out,
      check_out_reason,
      was_early_checkout,
    } = req.body;

    const checkOutTime = check_out || new Date().toISOString();

    const { data, error } = await checkOutOccupancyRecord(
      id,
      checkOutTime,
      check_out_reason,
      was_early_checkout
    );
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error performing occupancy check-out',
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
