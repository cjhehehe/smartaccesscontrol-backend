// models/adminModel.js
import supabase from '../config/supabase.js';

/**
 * Create a new admin record in the "admins" table.
 * The created_at field is set in UTC.
 */
export async function createAdmin({ username, email, password, role = 'admin' }) {
  if (!username || !email || !password) {
    return { data: null, error: new Error('username, email, and password are required') };
  }

  try {
    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          username,
          email,
          password, // hashed beforehand
          role,
          created_at: new Date().toISOString(), // store UTC timestamp
        },
      ])
      .single();

    if (error) {
      console.error('[createAdmin] Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[createAdmin] Unexpected error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch all admins with minimal fields.
 */
export async function getAllAdmins() {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, email, role');

    if (error) {
      console.error('[getAllAdmins] Error fetching admins:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[getAllAdmins] Unexpected error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch a single admin by ID.
 */
export async function getAdminById(adminId) {
  if (!adminId || typeof adminId !== 'number') {
    return { data: null, error: new Error('adminId must be a valid number') };
  }
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, email, role')
      .eq('id', adminId)
      .maybeSingle();

    if (error) {
      console.error('[getAdminById] Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[getAdminById] Unexpected error:', err);
    return { data: null, error: err };
  }
}

/**
 * Update an admin profile by ID.
 */
export async function updateAdminProfile(adminId, updateFields) {
  if (!adminId || typeof adminId !== 'number') {
    return { data: null, error: new Error('adminId must be a valid number') };
  }
  if (!updateFields || typeof updateFields !== 'object') {
    return { data: null, error: new Error('updateFields must be an object') };
  }
  try {
    const { data, error } = await supabase
      .from('admins')
      .update(updateFields)
      .eq('id', adminId)
      .single();
    if (error) {
      console.error('[updateAdminProfile] Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[updateAdminProfile] Unexpected error:', err);
    return { data: null, error: err };
  }
}

/**
 * Delete an admin by ID.
 */
export async function deleteAdmin(adminId) {
  if (!adminId || typeof adminId !== 'number') {
    return { data: null, error: new Error('adminId must be a valid number') };
  }
  try {
    const { data, error } = await supabase
      .from('admins')
      .delete()
      .eq('id', adminId)
      .single();

    if (error) {
      console.error('[deleteAdmin] Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[deleteAdmin] Unexpected error:', err);
    return { data: null, error: err };
  }
}
