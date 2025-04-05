// controllers/serviceRequestController.js
import supabase from '../config/supabase.js';
import {
  createServiceRequest,
  getServiceRequestsByGuest
} from '../models/serviceRequestModel.js';
import { createNotification } from '../models/notificationModel.js';
// Log request event in request logs
import { createRequestLog } from '../models/requestLogsModel.js';
// Import our FCM service to send push notifications
import { sendNotification } from '../services/fcmService.js';

export const submitServiceRequest = async (req, res) => {
  try {
    // Expect delay_minutes (number) from the client
    const { guest_id, guest_name, service_type, description, delay_minutes } = req.body;

    // Validate required fields (delay_minutes must be a positive number)
    if (!guest_id || !guest_name || !service_type || !description || delay_minutes == null) {
      return res.status(400).json({
        message: 'All fields are required: guest_id, guest_name, service_type, description, delay_minutes'
      });
    }
    if (typeof delay_minutes !== 'number' || delay_minutes <= 0) {
      return res.status(400).json({
        message: 'delay_minutes must be a positive number'
      });
    }

    // 1) Verify that the guest exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('id', guest_id)
      .maybeSingle();

    if (guestError) {
      console.error('[submitServiceRequest] Error checking guest existence:', guestError);
      return res.status(500).json({ message: 'Error checking guest', error: guestError.message });
    }
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    // 2) Build the payload
    const now = new Date();
    const nowUtc = now.toISOString(); // current UTC timestamp
    // Calculate preferred_time by adding delay_minutes to now
    const preferredTime = new Date(now.getTime() + delay_minutes * 60000).toISOString();

    const requestPayload = {
      guest_id,
      guest_name,
      service_type,
      description,
      delay_minutes,
      preferred_time: preferredTime,
      status: 'pending',
      created_at: nowUtc
    };

    // 3) Calculate JSON payload size (in bytes)
    const requestSize = Buffer.byteLength(JSON.stringify(requestPayload), 'utf8');
    requestPayload.request_size = requestSize;

    // 4) Insert the new service request
    const { data, error } = await createServiceRequest(requestPayload);
    if (error) {
      console.error('[submitServiceRequest] Database error:', error);
      return res.status(500).json({
        message: 'Database error: Unable to submit service request',
        error: error.message
      });
    }
    const newRequestId = data.id;

    // 5) Log the "request_created" event (excluding request_size)
    if (newRequestId) {
      const logType = 'request_created';
      const logMessage = `Guest #${guest_id} created a ${service_type} request with a delay of ${delay_minutes} minutes.`;
      const { error: logError } = await createRequestLog({
        request_id: newRequestId,
        guest_id,
        log_type: logType,
        log_message: logMessage
      });
      if (logError) {
        console.error('[submitServiceRequest] Error saving service request log:', logError);
      }
    }

    // 6) Notify all admins about the new request:
    try {
      // Query admins with non-null fcm_token
      const { data: adminList, error: adminsError } = await supabase
        .from('admins')
        .select('id, fcm_token')
        .neq('fcm_token', null);
      if (adminsError) {
        console.error('[submitServiceRequest] Error fetching admins for push notification:', adminsError);
      } else if (adminList && adminList.length > 0) {
        for (const admin of adminList) {
          const adminId = admin.id;
          const notifTitle = 'New Service Request';
          const notifMessage = `Guest #${guest_id} submitted a ${service_type} request with a delay of ${delay_minutes} minutes.`;
          // Create notification record in the database
          const { error: notifError } = await createNotification({
            recipient_admin_id: adminId,
            title: notifTitle,
            message: notifMessage,
            notification_type: 'service_request',
            created_at: new Date().toISOString()
          });
          if (notifError) {
            console.error(`[submitServiceRequest] Failed to create notification for admin ${adminId}:`, notifError);
          }
          // Send push notification using FCM (if fcm_token exists)
          if (admin.fcm_token) {
            try {
              await sendNotification(
                admin.fcm_token,
                notifTitle,
                notifMessage,
                { requestId: newRequestId.toString() }
              );
            } catch (pushErr) {
              console.error(`[submitServiceRequest] Push notification failed for admin ${adminId}:`, pushErr);
            }
          }
        }
      }
    } catch (notifCatchErr) {
      console.error('[submitServiceRequest] Unexpected error creating admin notifications:', notifCatchErr);
    }

    return res.status(201).json({
      message: 'Service request submitted successfully',
      data
    });
  } catch (error) {
    console.error('[submitServiceRequest] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateServiceRequestStatus = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { status } = req.body;
    if (!request_id || !status) {
      return res.status(400).json({ message: 'Missing request_id or status in request.' });
    }
    const reqIdNum = parseInt(request_id, 10);
    if (isNaN(reqIdNum)) {
      return res.status(400).json({ message: 'Invalid request_id format.' });
    }

    // 1) Update the service request row
    const { data: updatedData, error: updateError } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', reqIdNum)
      .select(`
        id,
        guest_id,
        guest_name,
        service_type,
        description,
        delay_minutes,
        preferred_time,
        status,
        created_at
      `)
      .single();

    if (updateError) {
      console.error('[updateServiceRequestStatus] Error updating service request status:', updateError);
      return res.status(500).json({
        message: 'Database error: Unable to update status',
        error: updateError.message
      });
    }
    if (!updatedData) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    // 2) Log the status change event
    try {
      const {
        id: updatedRequestId,
        guest_id: guestId,
        service_type: stype,
        status: newStatus
      } = updatedData;

      let statusLabel = 'Pending';
      if (newStatus === 'in_progress') statusLabel = 'In Progress';
      else if (newStatus === 'completed') statusLabel = 'Completed';
      else if (newStatus === 'canceled') statusLabel = 'Canceled';

      const logMessage = `Status changed to ${statusLabel}.`;
      const { error: logError } = await createRequestLog({
        request_id: updatedRequestId,
        guest_id: guestId,
        log_type: 'status_change',
        log_message: logMessage
      });
      if (logError) {
        console.error('[updateServiceRequestStatus] Error saving status_change log:', logError);
      }
    } catch (logCatchErr) {
      console.error('[updateServiceRequestStatus] Unexpected error logging status change:', logCatchErr);
    }

    // 3) Notify the guest about the status update
    try {
      const guestId = updatedData.guest_id;
      const serviceType = updatedData.service_type || 'service request';
      const newStatus = updatedData.status;

      let statusLabel = 'Pending';
      if (newStatus === 'in_progress') statusLabel = 'In Progress';
      else if (newStatus === 'completed') statusLabel = 'Completed';
      else if (newStatus === 'canceled') statusLabel = 'Canceled';

      const notifTitle = 'Service Request Updated';
      const notifMessage = `Your ${serviceType} request is now ${statusLabel}.`;

      // (a) Create a DB notification record for the guest
      const { error: notifError } = await createNotification({
        recipient_guest_id: guestId,
        title: notifTitle,
        message: notifMessage,
        notification_type: 'service_request',
        created_at: new Date().toISOString()
      });
      if (notifError) {
        console.error('[updateServiceRequestStatus] Failed to create guest notification:', notifError);
      }

      // (b) Fetch the guest's FCM token
      const { data: guestRecord, error: guestErr } = await supabase
        .from('guests')
        .select('fcm_token')
        .eq('id', guestId)
        .maybeSingle();
      if (guestErr) {
        console.error('[updateServiceRequestStatus] Error fetching guest fcm_token:', guestErr);
      } else if (guestRecord && guestRecord.fcm_token) {
        // (c) Send push notification to the guest’s device.
        // The payload now includes extra fields so the guest app knows to redirect
        // to room_service_page.dart (via initialTab set to '1').
        await sendNotification(
          guestRecord.fcm_token,
          notifTitle,
          notifMessage,
          {
            requestId: updatedData.id.toString(),
            userType: 'guest',
            guestId: guestId.toString(),
            initialTab: '1'
          }
        );
        console.log(`[updateServiceRequestStatus] Guest #${guestId} notified via FCM.`);
      }
    } catch (notifCatchErr) {
      console.error('[updateServiceRequestStatus] Unexpected error notifying guest about status change:', notifCatchErr);
    }

    return res.status(200).json({
      message: `Service request #${request_id} status updated to ${status}.`,
      data: updatedData
    });
  } catch (err) {
    console.error('[updateServiceRequestStatus] Unexpected Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getServiceRequests = async (req, res) => {
  try {
    const { guest_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    if (!guest_id) {
      return res.status(400).json({ message: 'Guest ID is required' });
    }
    const { data, error } = await getServiceRequestsByGuest(
      guest_id,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );
    if (error) {
      console.error('[getServiceRequests] Database error:', error);
      return res.status(500).json({
        message: 'Database error: Unable to fetch service requests',
        error: error.message
      });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No service requests found for this guest' });
    }
    return res.status(200).json({
      message: 'Service requests fetched successfully',
      data
    });
  } catch (error) {
    console.error('[getServiceRequests] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
