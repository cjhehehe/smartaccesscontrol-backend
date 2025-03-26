// routes/mikrotikRoutes.js
import express from 'express';
import {
  getGuestDhcpLeases,
  storeGuestDhcpLeases,
  syncMikrotikStatus
} from '../controllers/mikrotikController.js';

const router = express.Router();

// GET: Retrieve guest_dhcp leases from MikroTik
router.get('/leases', getGuestDhcpLeases);

// POST: Poll & store DHCP leases from guest_dhcp in Supabase
router.post('/store-leases', storeGuestDhcpLeases);

// POST: Example: Sync "authenticated" MAC addresses into MikroTik firewall/hotspot
router.post('/activate-internet', syncMikrotikStatus);

export default router;
