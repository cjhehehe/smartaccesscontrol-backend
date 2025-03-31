// routes/hotelRoutes.js
import express from 'express';
import { checkinFlow } from '../controllers/hotelController.js';

const router = express.Router();

router.post('/checkin-flow', checkinFlow);

export default router;
