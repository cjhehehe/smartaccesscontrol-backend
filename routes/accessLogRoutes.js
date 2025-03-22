// routes/accessLogsRoutes.js
import express from 'express';
import {
  logAccessGranted,
  logAccessDenied,
  getAccessLogsByGuest,
} from '../controllers/accessLogController.js';

const router = express.Router();

// Log when access is granted or denied, and fetch logs by guest ID
router.post('/granted', logAccessGranted);
router.post('/denied', logAccessDenied);
router.get('/:guest_id', getAccessLogsByGuest);

export default router;
