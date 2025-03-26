// mikrotikRoutes.js
import express from 'express';
import {
  getGuestDhcpLeases,
  storeGuestDhcpLeases,
  syncMikrotikStatus,
} from '../controllers/mikrotikController.js';

const router = express.Router();

// GET: Retrieve guest_dhcp leases from MikroTik
router.get('/leases', getGuestDhcpLeases);

// POST: Poll and store DHCP leases from guest_dhcp into Supabase
router.post('/store-leases', storeGuestDhcpLeases);

// POST: Synchronize authenticated MAC addresses into MikroTik
router.post('/activate-internet', syncMikrotikStatus);

export default router;
