// routes/requestLogsRoutes.js
import express from 'express';
import {
  createNewRequestLog,
  getAllLogs,
  getLogsForRequest
} from '../controllers/requestLogsController.js';

const router = express.Router();

// POST /api/request-logs -> create a new log entry
router.post('/', createNewRequestLog);

// GET /api/request-logs -> fetch all logs
router.get('/', getAllLogs);

// GET /api/request-logs/:request_id -> fetch logs for a specific request
router.get('/:request_id', getLogsForRequest);

export default router;
