// routes/serviceRequestRoutes.js
import express from 'express';
import {
  submitServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus
} from '../controllers/serviceRequestController.js';

const router = express.Router();

// POST /api/service-requests/submit -> create a request
router.post('/submit', submitServiceRequest);

// PUT /api/service-requests/:request_id/update-status -> update request status
router.put('/:request_id/update-status', updateServiceRequestStatus);

// GET /api/service-requests/:guest_id -> fetch a guest's requests
router.get('/:guest_id', getServiceRequests);

export default router;
