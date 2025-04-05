// controllers/feedbackController.js
import supabase from '../config/supabase.js';
import {
  submitFeedback,
  getFeedbackByGuest,
  updateFeedbackReply
} from '../models/feedbackModel.js';
import { createNotification } from '../models/notificationModel.js';

// For FCM push notifications (if you want to send them directly here)
import { sendNotification } from '../services/fcmService.js';

/**
 * Handle POST /api/feedback/submit
 * Creates new feedback or complaint for a guest.
 */
export const submitGuestFeedback = async (req, res) => {
  try {
    const { guest_id, guest_name, feedback_type, description } = req.body;
    if (!guest_id || !guest_name || !feedback_type || !description) {
      return res.status(400).json({
        message:
          'All fields are required: guest_id, guest_name, feedback_type, description',
      });
    }

    // 1) Verify guest exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name, fcm_token')
      .eq('id', guest_id)
      .maybeSingle();

    if (guestError) {
      console.error('[Feedback] Error checking guest existence:', guestError);
      return res.status(500).json({
        message: 'Error checking guest',
        error: guestError.message
      });
    }
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    // 2) Insert feedback
    const created_at = new Date().toISOString();
    const { data: feedbackData, error: feedbackError } = await submitFeedback({
      guest_id,
      guest_name,
      feedback_type,
      description,
      status: 'pending',
      created_at,
    });

    if (feedbackError) {
      console.error('[Feedback] Database Insert Error:', feedbackError);
      return res.status(500).json({
        message: 'Database error: Unable to submit feedback',
        error: feedbackError.message,
      });
    }

    // 3) Notify all admins about the new feedback
    try {
      const { data: allAdmins, error: adminsError } = await supabase
        .from('admins')
        .select('id, fcm_token');
      if (adminsError) {
        console.error('[Feedback] Error fetching admins for notification:', adminsError);
      } else if (allAdmins && allAdmins.length > 0) {
        for (const admin of allAdmins) {
          const adminId = admin.id;
          const notifTitle = 'New Feedback/Complaint';
          const notifMessage = `Guest #${guest_id} submitted a ${feedback_type}.`;

          // Create a DB notification record
          const { error: notifError } = await createNotification({
            recipient_admin_id: adminId,
            title: notifTitle,
            message: notifMessage,
            notification_type: 'feedback',
          });
          if (notifError) {
            console.error(`[Feedback] Failed to notify admin ${adminId}:`, notifError);
          }

          // Optionally send an FCM push notification if admin.fcm_token is not null
          if (admin.fcm_token) {
            try {
              await sendNotification(
                admin.fcm_token,
                notifTitle,
                notifMessage,
                { userType: 'admin' } // No requestId here, but you can add a "feedbackId" if you want
              );
            } catch (pushErr) {
              console.error(`[Feedback] Push notification failed for admin ${adminId}:`, pushErr);
            }
          }
        }
      }
    } catch (notifCatchErr) {
      console.error('[Feedback] Unexpected error creating admin notifications:', notifCatchErr);
    }

    return res.status(201).json({
      message: 'Feedback submitted successfully',
      data: feedbackData,
    });
  } catch (error) {
    console.error('[Feedback] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle GET /api/feedback/guest/:guest_id
 * Fetches all feedback for a given guest, ordered by created_at DESC.
 */
export const getGuestFeedback = async (req, res) => {
  try {
    const { guest_id } = req.params;
    if (!guest_id) {
      return res.status(400).json({ message: 'Guest ID is required' });
    }

    const { data, error } = await getFeedbackByGuest(guest_id);
    if (error) {
      console.error('[Feedback] Database Error:', error);
      return res.status(500).json({
        message: 'Database error: Unable to fetch feedback',
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No feedback found for this guest' });
    }

    return res.status(200).json({
      message: 'Feedback retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Feedback] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle PUT /api/feedback/:id/reply
 * Admin updates the feedback with a reply_message and (optional) status.
 */
export const replyToFeedbackComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      admin_reply,
      status,
      admin_id,
      guest_id,
    } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ message: 'Feedback ID is required in the URL.' });
    }
    if (!admin_reply || !admin_id || !guest_id) {
      return res.status(400).json({
        message: 'admin_reply, admin_id, and guest_id are required fields.'
      });
    }

    // 1) Update the feedback record
    const updatedAt = new Date().toISOString();
    const { data: updatedFeedback, error: updateError } = await updateFeedbackReply({
      feedback_id: parseInt(id, 10),
      reply_message: admin_reply,
      status: status || 'pending',
      updated_at: updatedAt,
    });

    if (updateError) {
      console.error('[Feedback] Error updating feedback reply:', updateError);
      return res.status(500).json({
        message: 'Database error: Unable to update feedback reply',
        error: updateError.message,
      });
    }
    if (!updatedFeedback) {
      return res
        .status(404)
        .json({ message: 'Feedback not found or update failed.' });
    }

    // 2) Create a notification for the guest
    try {
      const notifTitle = 'Admin Replied to Your Feedback';
      const notifMessage = `Reply: ${admin_reply}`;
      const { error: notifError } = await createNotification({
        recipient_guest_id: guest_id,
        title: notifTitle,
        message: notifMessage,
        notification_type: 'feedback',
      });
      if (notifError) {
        console.error('[Feedback] Failed to notify guest:', notifError);
      }

      // Optionally send an FCM push notification if the guest has an fcm_token
      const { data: guestRecord, error: guestErr } = await supabase
        .from('guests')
        .select('fcm_token')
        .eq('id', guest_id)
        .maybeSingle();
      if (guestErr) {
        console.error('[Feedback] Error fetching guest fcm_token:', guestErr);
      } else if (guestRecord && guestRecord.fcm_token) {
        try {
          await sendNotification(
            guestRecord.fcm_token,
            notifTitle,
            notifMessage,
            {
              userType: 'guest',
              // Optionally, you can add "feedbackId" to the data
              // feedbackId: id.toString()
            }
          );
        } catch (pushErr) {
          console.error('[Feedback] Push notification failed for guest:', pushErr);
        }
      }
    } catch (notifCatchErr) {
      console.error('[Feedback] Unexpected error creating guest notification:', notifCatchErr);
    }

    return res.status(200).json({
      message: 'Feedback reply updated successfully',
      data: updatedFeedback,
    });
  } catch (error) {
    console.error('[Feedback] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
