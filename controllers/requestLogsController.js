// controllers/requestLogsController.js
import {
    createRequestLog,
    getRequestLogsByRequestId,
    getAllRequestLogs
  } from '../models/requestLogsModel.js';
  
  /**
   * POST /api/request-logs
   * Create a new request log entry.
   */
  export const createNewRequestLog = async (req, res) => {
    try {
      const {
        request_id,
        admin_id,
        guest_id,
        log_type,
        log_message,
        request_size
      } = req.body;
  
      // Require at least one identifying field.
      if (!request_id && !request_size && !log_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: provide request_id or request_size or log_type.'
        });
      }
  
      const { data, error } = await createRequestLog({
        request_id,
        admin_id,
        guest_id,
        log_type,
        log_message,
        request_size
      });
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Database error: Unable to create request log',
          error: error.message
        });
      }
  
      return res.status(201).json({
        success: true,
        message: 'Request log created successfully',
        data
      });
    } catch (error) {
      console.error('[createNewRequestLog] Unexpected Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  /**
   * GET /api/request-logs
   * Fetch all request logs.
   */
  export const getAllLogs = async (req, res) => {
    try {
      const { data, error } = await getAllRequestLogs();
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Database error: Unable to fetch request logs',
          error: error.message
        });
      }
      return res.status(200).json({
        success: true,
        message: 'All request logs fetched successfully',
        data: data || []
      });
    } catch (error) {
      console.error('[getAllLogs] Unexpected Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  /**
   * GET /api/request-logs/:request_id
   * Fetch logs for a specific request.
   */
  export const getLogsForRequest = async (req, res) => {
    try {
      const { request_id } = req.params;
      const { limit = 10, offset = 0 } = req.query;
  
      if (!request_id) {
        return res.status(400).json({
          success: false,
          message: 'request_id is required'
        });
      }
  
      const { data, error } = await getRequestLogsByRequestId(
        parseInt(request_id, 10),
        parseInt(limit, 10),
        parseInt(offset, 10)
      );
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Database error: Unable to fetch request logs',
          error: error.message
        });
      }
  
      return res.status(200).json({
        success: true,
        message: `Request logs for request_id #${request_id}`,
        data: data || []
      });
    } catch (error) {
      console.error('[getLogsForRequest] Unexpected Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  