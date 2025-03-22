// routes/activityLogsRoutes.js
import express from 'express';
import {
  logServiceRequestActivity,
  getServiceRequestLogsForRequest,
} from '../controllers/activityLogController.js';

const router = express.Router();

// Create a new service request log (timestamps in UTC)
router.post('/', logServiceRequestActivity);

// Fetch logs for a specific service request
router.get('/:request_id', getServiceRequestLogsForRequest);

export default router;
