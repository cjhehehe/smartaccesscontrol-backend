// backend/routes/resetRoutes.js

import express from 'express';
import { resetDatabase } from '../config/setup_db.js';

const router = express.Router();

/**
 * GET /api/setup/reset
 * 
 * Resets the database when provided with a valid secret.
 * Usage (assuming your Railway domain and port are configured):
 *    GET https://smartaccesscontrol.up.railway.app/api/setup/reset?secret=YOUR_SECRET
 */
router.get('/reset', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.SETUP_DB_SECRET) {
    return res.status(403).json({ message: 'Forbidden: Invalid secret key.' });
  }
  try {
    await resetDatabase();
    return res.status(200).json({ message: 'Database reset successfully.' });
  } catch (err) {
    console.error('Error resetting database:', err);
    return res.status(500).json({ message: 'Internal server error while resetting database.' });
  }
});

export default router;
