// routes/roomOccupancyHistoryRoutes.js
import express from 'express';
import { addHistoryRecord, getHistoryRecords, getHistoryRecord, searchHistory } from '../controllers/roomOccupancyHistoryController.js';

const router = express.Router();

// Place the search route first to avoid conflict with the parameter route.
router.get('/search', searchHistory);
router.get('/:id', getHistoryRecord);
router.get('/', getHistoryRecords);
router.post('/', addHistoryRecord);

export default router;
