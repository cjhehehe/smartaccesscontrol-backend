// models/serviceRequestModel.js
import supabase from '../config/supabase.js';

/**
 * Create a new service request.
 * Expects requestData to include all required fields,
 * including the new delay_minutes column.
 */
export const createServiceRequest = async (requestData) => {
  try {
    // Ensure the created_at field is set to now if not provided.
    if (!requestData.created_at) {
      requestData.created_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('service_requests')
      .insert([requestData])
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

    if (error) {
      console.error('[ServiceRequestModel] Insert Error:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[ServiceRequestModel] Unexpected error in createServiceRequest:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch service requests for a given guest ID.
 */
export const getServiceRequestsByGuest = async (guest_id, limit = 10, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('service_requests')
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
      .eq('guest_id', guest_id)
      .order('preferred_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[ServiceRequestModel] Error fetching service requests:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[ServiceRequestModel] Unexpected error in getServiceRequestsByGuest:', err);
    return { data: null, error: err };
  }
};
