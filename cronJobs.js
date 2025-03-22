// cronJobs.js
import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Use your API base URL (for local testing it might be 'http://localhost:5000/api')
// You mentioned a Railway domain; ensure your NODE environment variable is set accordingly.
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

cron.schedule('*/1 * * * *', async () => {
  try {
    console.log('[CRON] Polling MikroTik hosts...');
    const response = await axios.post(`${API_BASE_URL}/mikrotik/store`);
    console.log('[CRON] Polling complete:', response.data.message);
  } catch (error) {
    console.error('[CRON] Error polling MikroTik hosts:', error.message);
  }
});
