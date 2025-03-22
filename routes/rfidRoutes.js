// routes/rfidRoutes.js
import express from 'express';
import {
  getAllRFIDTags,
  getAvailableRFIDTags,
  assignRFID,
  activateRFIDTag,
  markRFIDAsLost,
  unassignRFIDTag,
  verifyRFID,
  updateRFIDStatus
} from '../controllers/rfidController.js';

const router = express.Router();

// GET all RFID tags
router.get('/all', getAllRFIDTags);

// GET RFID tags that are 'available'
router.get('/available', getAvailableRFIDTags);

// POST: Assign an RFID to a guest
router.post('/assign', assignRFID);

// POST: Activate an assigned RFID
router.post('/activate', activateRFIDTag);

// POST: Mark RFID as lost
router.post('/lost', markRFIDAsLost);

// POST: Unassign RFID (status -> 'available')
router.post('/unassign', unassignRFIDTag);

// POST: Verify an RFID for door access
router.post('/verify', verifyRFID);

// PUT: Unified status update route
router.put('/update-status', updateRFIDStatus);

export default router;
