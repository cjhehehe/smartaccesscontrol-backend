// routes/mikrotikRoutes.js
import express from 'express';
import {
  getConnectedDevices,
  storeConnectedDevices,
  syncMikrotikStatus,
} from '../controllers/mikrotikController.js';

const router = express.Router();

// GET: Retrieve connected hotspot hosts from MikroTik
router.get('/connected', getConnectedDevices);

// POST: Poll and store new MAC addresses from the hotspot hosts
router.post('/store', storeConnectedDevices);

// POST: Push authenticated MAC addresses into MikroTik hotspot user profiles
router.post('/sync-status', syncMikrotikStatus);

export default router;
