// controllers/adminController.js
import supabase from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getAllAdmins } from '../models/adminModel.js';

dotenv.config();

/**
 * Create Admin
 */
export const createAdmin = async (req, res) => {
  try {
    const { username, password, email, role = 'admin' } = req.body;
    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ message: 'All fields are required (username, password, email).' });
    }

    console.log("Checking existing admins...");
    const { data: existingAdmins, error: findError } = await supabase
      .from('admins')
      .select('id')
      .limit(1);

    if (findError) {
      console.error("Error checking existing admins:", findError);
      return res
        .status(500)
        .json({ message: 'Database error while checking existing admins' });
    }

    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new admin row
    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          username,
          password: hashedPassword,
          email,
          role,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating admin:', error);
      return res
        .status(500)
        .json({ message: 'Database error: Unable to create admin' });
    }

    console.log("Admin created successfully:", username);
    return res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Login Admin
 */
export const loginAdmin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: 'Username/Email and password are required' });
    }

    console.log("Attempting login with:", identifier);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password, email, role')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (error || !admin) {
      console.log("Admin not found:", identifier);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log("Retrieved Admin Data:", admin);

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log("Password Match Result:", isPasswordValid);
    if (!isPasswordValid) {
      console.log("Incorrect Password");
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Remove the password field before sending back
    const { password: _, ...publicAdmin } = admin;

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' }
    );

    console.log("Admin login successful:", admin.username);
    return res.status(200).json({
      message: 'Admin logged in successfully',
      token,
      admin: publicAdmin
    });
  } catch (error) {
    console.error('Unexpected Login Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Change Admin Password
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const { adminId, currentPassword, newPassword } = req.body;
    if (!adminId || !currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'All fields are required (adminId, currentPassword, newPassword).' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, password')
      .eq('id', adminId)
      .maybeSingle();

    if (error || !admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password: hashedPassword })
      .eq('id', adminId);

    if (updateError) {
      return res.status(500).json({ message: 'Error updating password.' });
    }

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error changing admin password:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Update Admin Profile
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const { adminId, username, email, role } = req.body;
    if (!adminId) {
      return res.status(400).json({ message: 'adminId is required.' });
    }

    const validRoles = ['superadmin', 'admin', 'manager'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided.' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const { error } = await supabase
      .from('admins')
      .update(updateData)
      .eq('id', adminId);

    if (error) {
      console.error('Error updating admin profile:', error);
      return res
        .status(500)
        .json({ message: 'Database error: Unable to update admin profile' });
    }

    console.log(`Admin (ID: ${adminId}) profile updated successfully.`);
    return res.status(200).json({ message: 'Admin profile updated successfully.' });
  } catch (err) {
    console.error('Unexpected error updating admin profile:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Upload Admin Avatar
 */
export const uploadAdminAvatar = async (req, res) => {
  try {
    const { adminId, newAvatarUrl } = req.body;
    if (!adminId || !newAvatarUrl) {
      return res
        .status(400)
        .json({ message: 'adminId and newAvatarUrl are required.' });
    }

    const { error } = await supabase
      .from('admins')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', adminId);

    if (error) {
      console.error('Error updating admin avatar URL:', error);
      return res
        .status(500)
        .json({ message: 'Database error: Unable to update avatar URL' });
    }

    console.log(`Admin (ID: ${adminId}) avatar updated to: ${newAvatarUrl}`);
    return res.status(200).json({
      message: 'Admin avatar updated successfully.',
      avatarUrl: newAvatarUrl,
    });
  } catch (err) {
    console.error('Error in uploadAdminAvatar:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Update Admin FCM Token
 */
export const updateAdminFcmToken = async (req, res) => {
  try {
    const { adminId, fcmToken } = req.body;
    if (!adminId || !fcmToken) {
      return res.status(400).json({ message: 'adminId and fcmToken are required.' });
    }
    // Added .select() to return the updated row(s)
    const { data, error } = await supabase
      .from('admins')
      .update({ fcm_token: fcmToken })
      .eq('id', adminId)
      .select();
    if (error || !data || data.length === 0) {
      console.error('[Admin] Error updating FCM token:', error);
      return res.status(500).json({ message: 'Failed to update FCM token.' });
    }
    return res.status(200).json({ message: 'FCM token updated successfully.' });
  } catch (err) {
    console.error('[Admin] Exception updating FCM token:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Sign Out Admin
 */
export const signOutAdmin = async (req, res) => {
  try {
    // If you have session or token invalidation logic, do it here
    return res.status(200).json({ message: 'Admin signed out successfully.' });
  } catch (error) {
    console.error('Error signing out admin:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get All Admins
 */
export const getAllAdminsController = async (req, res) => {
  try {
    const { data, error } = await getAllAdmins();
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching admins',
        error,
      });
    }
    return res.status(200).json({ success: true, admins: data });
  } catch (err) {
    console.error('[getAllAdminsController] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
