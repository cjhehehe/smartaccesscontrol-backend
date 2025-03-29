// controllers/roomOccupancyHistoryController.js

import {
  createHistoryRecord,
  getAllHistoryRecords,
  getHistoryRecordById,
  updateHistoryRecord as updateRecordModel,
  searchHistoryRecords,
} from '../models/roomOccupancyHistoryModel.js';

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

    // Since the new table definition does NOT require these fields,
    // we remove the strict check:
    // if (!room_id || !guest_id || !registration_time) { ... }

    // Convert hours_stay to a numeric if provided
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
      registration_time: registration_time || null,
      check_in: null, // can be updated later
      check_out: check_out || null,
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

    // Optionally parse hours_stay if provided
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
