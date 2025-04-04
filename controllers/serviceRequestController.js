// controllers/serviceRequestController.js
import supabase from '../config/supabase.js';
import {
  createServiceRequest,
  getServiceRequestsByGuest
} from '../models/serviceRequestModel.js';
import { createNotification } from '../models/notificationModel.js';
import {
  createRequestLog,    // New import from requestLogsModel
  logRequestSize       // New import from requestLogsModel
} from '../models/requestLogsModel.js';

export const submitServiceRequest = async (req, res) => {
  try {
    // Now expect delay_minutes (number) instead of preferred_time from the client
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
      delay_minutes,         // store the delay in minutes
      preferred_time: preferredTime,
      status: 'pending',
      created_at: nowUtc
    };

    // 3) Insert the new service request
    const { data, error } = await createServiceRequest(requestPayload);
    if (error) {
      console.error('[submitServiceRequest] Database error:', error);
      return res.status(500).json({
        message: 'Database error: Unable to submit service request',
        error: error.message
      });
    }

    // 4) Calculate the JSON payload size and log it in request_logs
    const requestSize = Buffer.byteLength(JSON.stringify(requestPayload), 'utf8');
    const { error: logSizeError } = await logRequestSize(requestSize);
    if (logSizeError) {
      console.error('[submitServiceRequest] Error logging request size:', logSizeError);
      // Continue processing even if logging fails
    }

    const newRequestId = data.id;

    // 5) Log the "request_created" event
    if (newRequestId) {
      const logType = 'request_created';
      const logMessage = `Guest #${guest_id} created a ${service_type} request with a delay of ${delay_minutes} minutes.`;

      // We now call createRequestLog instead of saveActivityLog
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

    // 6) Notify all admins about the new request
    try {
      const { data: allAdmins, error: adminsError } = await supabase
        .from('admins')
        .select('id');
      if (adminsError) {
        console.error('[submitServiceRequest] Error fetching admins for notification:', adminsError);
      } else if (allAdmins && allAdmins.length > 0) {
        for (const admin of allAdmins) {
          const adminId = admin.id;
          const notifTitle = 'New Service Request';
          const notifMessage = `Guest #${guest_id} submitted a ${service_type} request with a delay of ${delay_minutes} minutes.`;
          const { error: notifError } = await createNotification({
            recipient_admin_id: adminId,
            title: notifTitle,
            message: notifMessage,
            notification_type: 'service_request',
            created_at: new Date().toISOString()
          });
          if (notifError) {
            console.error(`[submitServiceRequest] Failed to notify admin ${adminId}:`, notifError);
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
      return res.status(400).json({
        message: 'Missing request_id or status in request.'
      });
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
      parseInt(limit),
      parseInt(offset)
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
