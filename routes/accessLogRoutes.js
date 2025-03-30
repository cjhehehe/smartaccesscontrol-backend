// routes/accessLogsRoutes.js

import express from 'express';
import {
  logAccessGranted,
  logAccessDenied,
  getAccessLogsByGuest,
} from '../controllers/accessLogsController.js';

const router = express.Router();

// Endpoint to log an access granted event.
router.post('/granted', logAccessGranted);

// Endpoint to log an access denied event.
router.post('/denied', logAccessDenied);

// Endpoint to fetch access logs for a given guest ID.
router.get('/:guest_id', getAccessLogsByGuest);

export default router;
