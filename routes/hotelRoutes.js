// routes/hotelRoutes.js
import express from 'express';
import { registerFlow } from '../controllers/hotelController.js';

const router = express.Router();

router.post('/register-flow', registerFlow);

export default router;
