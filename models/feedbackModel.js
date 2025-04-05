// models/feedbackModel.js
import supabase from '../config/supabase.js';

/**
 * Insert Guest Feedback into the "feedback_complaints" table.
 * Timestamps are stored in UTC.
 */
export const submitFeedback = async (feedbackData) => {
  try {
    if (!feedbackData.status) {
      feedbackData.status = 'pending';
    }
    if (!feedbackData.created_at) {
      feedbackData.created_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('feedback_complaints')
      .insert([feedbackData])
      .select(
        'id, guest_id, guest_name, feedback_type, description, status, created_at, reply_message'
      )
      .single();

    if (error) {
      console.error('[FeedbackModel] Supabase Insert Error:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[FeedbackModel] Unexpected Error in submitFeedback:', err);
    return { data: null, error: err };
  }
};

/**
 * Retrieve Feedback by Guest ID from the "feedback_complaints" table.
 * Results are ordered by UTC timestamp (created_at) in descending order.
 */
export const getFeedbackByGuest = async (guest_id) => {
  try {
    const { data, error } = await supabase
      .from('feedback_complaints')
      .select(
        'id, guest_id, guest_name, feedback_type, description, status, created_at, reply_message'
      )
      .eq('guest_id', guest_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FeedbackModel] Database Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[FeedbackModel] Unexpected Error in getFeedbackByGuest:', err);
    return { data: null, error: err };
  }
};

/**
 * Update a feedback row with an admin reply, new status, and updated_at timestamp.
 */
export const updateFeedbackReply = async ({
  feedback_id,
  reply_message,
  status,
  updated_at,
}) => {
  try {
    const { data, error } = await supabase
      .from('feedback_complaints')
      .update({
        reply_message,
        status,
        updated_at
      })
      .eq('id', feedback_id)
      .select(
        'id, guest_id, guest_name, feedback_type, description, status, created_at, reply_message, updated_at'
      )
      .maybeSingle();

    if (error) {
      console.error('[FeedbackModel] Supabase Update Error:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[FeedbackModel] Unexpected Error in updateFeedbackReply:', err);
    return { data: null, error: err };
  }
};
