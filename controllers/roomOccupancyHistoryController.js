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
 * DISABLED to avoid duplicate occupancy record creation.
 */
export const addHistoryRecord = async (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Creation of occupancy record is disabled here. Use /api/hotel/checkin-flow instead.'
  });
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
      return res.status(200).json({
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

// Helper: ensureOccupantRecord or disallow creation outside hotelController
const ensureOccupantRecord = async (id, reqBody) => {
  // if you want to do something, you can. Otherwise leave blank
};

/**
 * POST /api/room-occupancy-history/:id/checkin
 */
export const checkInHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_in, hours_stay } = req.body;
    const checkInTime = check_in || new Date().toISOString();
    const numericHoursStay = typeof hours_stay === 'number' ? hours_stay : parseFloat(hours_stay);
    const hoursValue = !isNaN(numericHoursStay) ? numericHoursStay : undefined;

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
 */
export const checkOutHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const { check_out: providedCheckOut, check_out_reason: clientReason } = req.body;
    const checkOutTime = providedCheckOut || new Date().toISOString();

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
