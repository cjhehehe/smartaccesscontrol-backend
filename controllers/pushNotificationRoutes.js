// pushNotificationRoutes.js
import express from 'express';
import { updateFcmToken } from '../controllers/pushNotificationController.js';

const router = express.Router();

router.post('/update-token', updateFcmToken);

export default router;
