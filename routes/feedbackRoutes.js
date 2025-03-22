// routes/feedbackRoutes.js
import express from 'express';
import {
  submitGuestFeedback,
  getGuestFeedback,
  replyToFeedbackComplaint
} from '../controllers/feedbackController.js';

const router = express.Router();

// Create a new feedback/complaint
router.post('/submit', submitGuestFeedback);

// Fetch feedback for a specific guest by guest_id
router.get('/guest/:guest_id', getGuestFeedback);

// Admin replies to a feedback/complaint
router.put('/:id/reply', replyToFeedbackComplaint);

export default router;
