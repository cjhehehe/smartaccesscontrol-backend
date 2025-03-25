// models/userModel.js
import supabase from '../config/supabase.js';

/**
 * Find guest by email (unique).
 */
export const findUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        email,
        phone,
        password,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .eq('email', email)
      .maybeSingle();
    if (error) {
      console.error('[UserModel] Error finding user by email:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in findUserByEmail:', err);
    return { data: null, error: err };
  }
};

/**
 * Find guest(s) by phone (may return multiple rows).
 */
export const findUserByPhone = async (phone) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        email,
        phone,
        password,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .eq('phone', phone);
    if (error) {
      console.error('[UserModel] Error finding user by phone:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in findUserByPhone:', err);
    return { data: null, error: err };
  }
};

/**
 * Find guest by ID.
 */
export const findUserById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        email,
        phone,
        password,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[UserModel] Error finding user by ID:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in findUserById:', err);
    return { data: null, error: err };
  }
};

/**
 * Create a new guest in the 'guests' table.
 */
export const createUser = async (userData) => {
  try {
    if (!userData.membership_start) {
      userData.membership_start = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('guests')
      .insert([userData])
      .select(`
        id,
        name,
        email,
        phone,
        password,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .single();
    if (error) {
      console.error('[UserModel] Supabase Insert Error:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in createUser:', err);
    return { data: null, error: err };
  }
};

/**
 * Update a guest record by ID.
 */
export const updateUser = async (id, updateFields) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update(updateFields)
      .eq('id', id)
      .select(`
        id,
        name,
        email,
        phone,
        password,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .maybeSingle();
    if (error) {
      console.error('[UserModel] Supabase Update Error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in updateUser:', err);
    return { data: null, error: err };
  }
};

/**
 * Sign out a guest by ID.
 */
export const signOutUser = async (guestId) => {
  try {
    return { error: null };
  } catch (err) {
    console.error('[UserModel] Error signing out user:', err);
    return { error: err };
  }
};

/**
 * Search for guests by name, email, or phone.
 * Note: Password is excluded to keep responses lightweight.
 */
export const searchUsersByQuery = async (query) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        email,
        phone,
        membership_level,
        membership_start,
        membership_renewals,
        avatar_url
      `)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    if (error) {
      console.error('[UserModel] searchUsersByQuery error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in searchUsersByQuery:', err);
    return { data: null, error: err };
  }
};

/**
 * Get all guests from the 'guests' table.
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*');
    if (error) {
      console.error('[UserModel] Error fetching all guests:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[UserModel] Unexpected error in getAllUsers:', err);
    return { data: null, error: err };
  }
};
