// controllers/accessLogsController.js

import {
  saveAccessGranted,
  saveAccessDenied,
  getAccessLogs,
  // getRecentDenialsForRFID,  // Optional helper – not used for alerts in this version
} from "../models/accessLogModel.js";

/**
 * Log Access Granted
 * Logs a successful access event with RFID UID, Guest ID, timestamp, and measured latency.
 */
export const logAccessGranted = async (req, res) => {
  try {
    const { rfid_uid, guest_id, latency } = req.body;
    if (!rfid_uid || !guest_id) {
      return res.status(400).json({
        success: false,
        message: "RFID UID and Guest ID are required",
      });
    }
    const timestamp = new Date().toISOString();
    const { data, error } = await saveAccessGranted(rfid_uid, guest_id, timestamp, latency);
    if (error) {
      console.error("[logAccessGranted] Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error: Unable to log access granted",
        error: error.message,
      });
    }
    return res.status(201).json({
      success: true,
      message: "Access granted saved successfully",
      data,
    });
  } catch (error) {
    console.error("[logAccessGranted] Unexpected error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Log Access Denied
 * Logs a denied access event with RFID UID, timestamp, and measured latency.
 */
export const logAccessDenied = async (req, res) => {
  try {
    const { rfid_uid, latency } = req.body;
    if (!rfid_uid) {
      return res.status(400).json({
        success: false,
        message: "RFID UID is required",
      });
    }
    const timestamp = new Date().toISOString();
    const { data, error } = await saveAccessDenied(rfid_uid, timestamp, latency);
    if (error) {
      console.error("[logAccessDenied] Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error: Unable to log access denied",
        error: error.message,
      });
    }
    return res.status(201).json({
      success: true,
      message: "Access denied saved successfully",
      data,
    });
  } catch (error) {
    console.error("[logAccessDenied] Unexpected error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Get Access Logs for a Given Guest ID
 * Retrieves paginated access log entries (including latency data) for the specified guest.
 */
export const getAccessLogsByGuest = async (req, res) => {
  try {
    const { guest_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    if (!guest_id) {
      return res.status(400).json({
        success: false,
        message: "Guest ID is required",
      });
    }
    const { data, error } = await getAccessLogs(guest_id, parseInt(limit), parseInt(offset));
    if (error) {
      console.error("[getAccessLogsByGuest] Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error: Unable to fetch access logs",
        error: error.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Access logs fetched successfully",
      data: data || [],
    });
  } catch (error) {
    console.error("[getAccessLogsByGuest] Unexpected error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
