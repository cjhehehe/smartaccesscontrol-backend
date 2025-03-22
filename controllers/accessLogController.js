// controllers/accessLogsController.js
import {
  saveAccessGranted,
  saveAccessDenied,
  getAccessLogs,
} from '../models/accessLogModel.js';

/**
 * Log Access Granted
 */
export const logAccessGranted = async (req, res) => {
  try {
    const { rfid_uid, guest_id } = req.body;
    if (!rfid_uid || !guest_id) {
      return res.status(400).json({
        success: false,
        message: 'RFID UID and Guest ID are required',
      });
    }
    // Generate UTC timestamp
    const timestamp = new Date().toISOString();

    const { data, error } = await saveAccessGranted(rfid_uid, guest_id, timestamp);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to log access granted',
        error: error.message,
      });
    }
    return res
      .status(201)
      .json({ success: true, message: 'Access granted saved successfully', data });
  } catch (error) {
    console.error('Unexpected Error in logAccessGranted:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Log Access Denied
 */
export const logAccessDenied = async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: 'RFID UID is required',
      });
    }
    const timestamp = new Date().toISOString();
    const { data, error } = await saveAccessDenied(rfid_uid, timestamp);
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to log access denied',
        error: error.message,
      });
    }
    return res
      .status(201)
      .json({ success: true, message: 'Access denied saved successfully', data });
  } catch (error) {
    console.error('Unexpected Error in logAccessDenied:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get Access Logs for a Given Guest ID
 */
export const getAccessLogsByGuest = async (req, res) => {
  try {
    const { guest_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    if (!guest_id) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID is required',
      });
    }
    const { data, error } = await getAccessLogs(
      guest_id,
      parseInt(limit),
      parseInt(offset)
    );
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch access logs',
        error: error.message,
      });
    }
    // Even if no logs are found, return an empty array.
    return res.status(200).json({
      success: true,
      message: 'Access logs fetched successfully',
      data: data || [],
    });
  } catch (error) {
    console.error('Unexpected Error in getAccessLogsByGuest:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
