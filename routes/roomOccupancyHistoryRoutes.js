// routes/roomOccupancyHistoryRoutes.js
import express from 'express';
import {
  addHistoryRecord,
  getHistoryRecords,
  getHistoryRecord,
  updateHistoryRecord,
  searchHistory,
  checkInHistory,
  checkOutHistory,
} from '../controllers/roomOccupancyHistoryController.js';

const router = express.Router();

// Search route first to avoid param conflicts
router.get('/search', searchHistory);

// Standard CRUD routes
router.get('/:id', getHistoryRecord);
router.get('/', getHistoryRecords);
router.post('/', addHistoryRecord);
router.put('/:id', updateHistoryRecord);

// New check-in/check-out endpoints
router.post('/:id/checkin', checkInHistory);
router.post('/:id/checkout', checkOutHistory);

export default router;
