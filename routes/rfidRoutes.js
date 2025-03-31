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
  updateRFIDStatus,
  getValidRFIDCards,
  postVerifyActions,
} from '../controllers/rfidController.js';

const router = express.Router();

// GET all RFID tags
router.get('/all', getAllRFIDTags);

// GET available RFID tags
router.get('/available', getAvailableRFIDTags);

// POST: Assign an RFID to a guest
router.post('/assign', assignRFID);

// POST: Activate an assigned RFID
router.post('/activate', activateRFIDTag);

// POST: Mark an RFID as lost
router.post('/lost', markRFIDAsLost);

// POST: Unassign an RFID (set to available)
router.post('/unassign', unassignRFIDTag);

// POST: Verify an RFID for door access
router.post('/verify', verifyRFID);

// PUT: Update RFID status
router.put('/update-status', updateRFIDStatus);

// GET: Valid RFID→Guest mappings for local caching
router.get('/valid-cards', getValidRFIDCards);

// POST: Consolidated post-verification actions
router.post('/post-verify-actions', postVerifyActions);

export default router;
