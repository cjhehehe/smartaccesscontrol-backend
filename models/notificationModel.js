// models/notificationModel.js
import supabase from '../config/supabase.js';

/**
 * Make sure your notifications table has:
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 * in Supabase.
 *
 * We do NOT pass created_at so the DB can insert the current UTC time.
 */

/**
 * Create a new notification.
 */
export const createNotification = async (notifData) => {
  try {
    // Default is_read to false if not provided
    if (notifData.is_read === undefined) {
      notifData.is_read = false;
    }

    // Omit created_at so DB sets it automatically
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          recipient_guest_id: notifData.recipient_guest_id ?? null,
          recipient_admin_id: notifData.recipient_admin_id ?? null,
          title: notifData.title,
          message: notifData.message,
          note_message: notifData.note_message ?? null,
          notification_type: notifData.notification_type ?? null,
          is_read: notifData.is_read
          // NO created_at field
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('[NotificationModel] createNotification() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in createNotification():', err);
    return { data: null, error: err };
  }
};

/**
 * Get notifications by Guest ID.
 */
export const getNotificationsByGuest = async (guest_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_guest_id', guest_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[NotificationModel] getNotificationsByGuest() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in getNotificationsByGuest():', err);
    return { data: null, error: err };
  }
};

/**
 * Get notifications by Admin ID.
 */
export const getNotificationsByAdmin = async (admin_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_admin_id', admin_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[NotificationModel] getNotificationsByAdmin() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in getNotificationsByAdmin():', err);
    return { data: null, error: err };
  }
};

/**
 * Mark a notification as read (by ID).
 */
export const markNotificationAsRead = async (notif_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif_id)
      .select('*')
      .single();

    if (error) {
      console.error('[NotificationModel] markNotificationAsRead() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in markNotificationAsRead():', err);
    return { data: null, error: err };
  }
};

/**
 * Mark ALL notifications for a given admin as read.
 */
export const markAllNotificationsAsRead = async (admin_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_admin_id', admin_id)
      .select();

    if (error) {
      console.error('[NotificationModel] markAllNotificationsAsRead() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in markAllNotificationsAsRead():', err);
    return { data: null, error: err };
  }
};

/**
 * Mark ALL notifications for a given guest as read.
 */
export const markAllNotificationsAsReadForGuest = async (guest_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_guest_id', guest_id)
      .select();

    if (error) {
      console.error('[NotificationModel] markAllNotificationsAsReadForGuest() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in markAllNotificationsAsReadForGuest():', err);
    return { data: null, error: err };
  }
};

/**
 * Delete a notification (by ID).
 */
export const deleteNotification = async (notif_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notif_id)
      .select('*')
      .single();

    if (error) {
      console.error('[NotificationModel] deleteNotification() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in deleteNotification():', err);
    return { data: null, error: err };
  }
};

/**
 * Delete ALL notifications for a given admin.
 */
export const deleteAllNotificationsForAdmin = async (admin_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_admin_id', admin_id)
      .select();

    if (error) {
      console.error('[NotificationModel] deleteAllNotificationsForAdmin() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in deleteAllNotificationsForAdmin():', err);
    return { data: null, error: err };
  }
};

/**
 * Delete ALL notifications for a given guest.
 */
export const deleteAllNotificationsForGuest = async (guest_id) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_guest_id', guest_id)
      .select();

    if (error) {
      console.error('[NotificationModel] deleteAllNotificationsForGuest() Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[NotificationModel] Unexpected Error in deleteAllNotificationsForGuest():', err);
    return { data: null, error: err };
  }
};
