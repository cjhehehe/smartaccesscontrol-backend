// routes/macAddressRoutes.js
import express from 'express';
import {
  createMacAddress,
  getAllMacAddresses,
  getUnauthenticatedMacAddresses,
  authenticateMacAddress,
  deauthenticateMacAddress,
  updateMacAddressStatus,
  verifyMacAddress,
} from '../controllers/macAddressController.js';

const router = express.Router();

// POST: create a new MAC address record
router.post('/', createMacAddress);

// GET: all MAC addresses
router.get('/all', getAllMacAddresses);

// GET: all "unauthenticated" MAC addresses
router.get('/unauthenticated', getUnauthenticatedMacAddresses);

// POST: authenticate a MAC address
router.post('/authenticate', authenticateMacAddress);

// POST: deauthenticate a MAC address
router.post('/deauthenticate', deauthenticateMacAddress);

// PUT: update status for a MAC address (upsert)
router.put('/update-status', updateMacAddressStatus);

// POST: verify if a MAC address is valid/authenticated
router.post('/verify', verifyMacAddress);

export default router;
