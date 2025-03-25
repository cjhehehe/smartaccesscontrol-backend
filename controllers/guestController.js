// controllers/guestController.js
import bcrypt from 'bcryptjs';
import {
  createUser,
  findUserByEmail,
  findUserByPhone,
  findUserById,
  updateUser,
  signOutUser,
  searchUsersByQuery,
  getAllUsers,
} from '../models/userModel.js';

/**
 * Convert "bigint" or "{ low: number, high: number }" ID to a plain number.
 */
function fixId(obj) {
  if (!obj) return;
  if (typeof obj.id === 'object' && obj.id !== null) {
    if (typeof obj.id.low === 'number') {
      obj.id = obj.id.low;
    }
  } else if (typeof obj.id === 'bigint') {
    obj.id = Number(obj.id);
  }
}

/**
 * Register a new guest with an optional membership level.
 * The membership_start timestamp is stored in UTC.
 */
export const registerGuest = async (req, res) => {
  try {
    const { name, email, phone, password, membershipLevel } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: 'Name, email, phone, and password are required.',
      });
    }

    // (Optional) Add uniqueness checks if needed here.

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set default membership level if none provided
    const newUser = {
      name,
      email,
      phone,
      password: hashedPassword,
      membership_level: membershipLevel || 'Regular',
      membership_start: new Date().toISOString(),
      membership_renewals: 0,
      avatar_url: null,
    };

    console.log('[Guest] Registering new guest:', newUser);
    const { data, error } = await createUser(newUser);
    if (error) {
      console.error('[Guest] Database Insert Error:', error);
      return res
        .status(500)
        .json({ message: 'Database error: Unable to register guest.' });
    }

    // Fix ID if necessary
    fixId(data);

    return res
      .status(201)
      .json({ message: 'Guest registered successfully.', data });
  } catch (error) {
    console.error('[Guest] Unexpected Error (registerGuest):', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Guest Login (supports identifier as either email or phone).
 */
export const loginGuest = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        message: 'Identifier (email or phone) and password are required.',
      });
    }

    let guest = null;

    if (identifier.includes('@')) {
      const { data, error } = await findUserByEmail(identifier);
      if (error) {
        console.error('[Guest] Error finding user by email:', error);
        return res.status(500).json({ message: 'Database error.' });
      }
      if (!data) {
        return res.status(404).json({ message: 'Guest not found.' });
      }
      const isPasswordValid = await bcrypt.compare(password, data.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      guest = data;
    } else {
      const { data, error } = await findUserByPhone(identifier);
      if (error) {
        console.error('[Guest] Error finding user by phone:', error);
        return res.status(500).json({ message: 'Database error.' });
      }
      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'Guest not found.' });
      }
      let matchedGuest = null;
      for (const candidate of data) {
        const isPasswordValid = await bcrypt.compare(password, candidate.password);
        if (isPasswordValid) {
          matchedGuest = candidate;
          break;
        }
      }
      if (!matchedGuest) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      guest = matchedGuest;
    }

    fixId(guest);

    return res.status(200).json({
      message: 'Guest logged in successfully.',
      guest,
    });
  } catch (error) {
    console.error('[Guest] Unexpected login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Fetch a single Guest Profile by ID.
 */
export const fetchGuestProfileById = async (req, res) => {
  try {
    const { guestId } = req.params;
    if (!guestId) {
      return res.status(400).json({ message: 'Guest ID is required.' });
    }
    const { data: guest, error } = await findUserById(guestId);
    if (error) {
      return res.status(500).json({ message: 'Error fetching guest.' });
    }
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found.' });
    }
    fixId(guest);
    return res.status(200).json(guest);
  } catch (error) {
    console.error('[Guest] Error fetching guest profile:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Change Guest Password.
 */
export const changeGuestPassword = async (req, res) => {
  try {
    const { guestId, currentPassword, newPassword } = req.body;
    if (!guestId || !currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'guestId, currentPassword, and newPassword are required.',
      });
    }
    const { data: guest, error: findError } = await findUserById(guestId);
    if (findError || !guest) {
      return res.status(404).json({ message: 'Guest not found.' });
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, guest.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid current password.' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const { data: updated, error: updateError } = await updateUser(guestId, {
      password: hashedNewPassword,
    });
    if (updateError || !updated) {
      return res
        .status(500)
        .json({ message: 'Database error: Unable to update password.' });
    }
    return res.status(200).json({ message: 'Guest password changed successfully.' });
  } catch (error) {
    console.error('[Guest] Error changing guest password:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Update Guest Profile.
 */
export const updateGuestProfile = async (req, res) => {
  try {
    const { guestId, name, email, phone, membershipLevel, avatarUrl } = req.body;
    if (!guestId) {
      return res.status(400).json({ message: 'guestId is required.' });
    }
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (membershipLevel) updateFields.membership_level = membershipLevel;
    if (avatarUrl) updateFields.avatar_url = avatarUrl;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }
    const { data: updated, error: updateError } = await updateUser(guestId, updateFields);
    if (updateError || !updated) {
      return res
        .status(500)
        .json({ message: 'Database error: Unable to update guest profile.' });
    }
    fixId(updated);
    return res
      .status(200)
      .json({ message: 'Guest profile updated successfully.', updated });
  } catch (error) {
    console.error('[Guest] Error updating guest profile:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Upload Guest Avatar.
 */
export const uploadGuestAvatar = async (req, res) => {
  try {
    const { guestId, newAvatarUrl } = req.body;
    if (!guestId || !newAvatarUrl) {
      return res
        .status(400)
        .json({ message: 'guestId and newAvatarUrl are required.' });
    }
    const { data: updated, error } = await updateUser(guestId, { avatar_url: newAvatarUrl });
    if (error || !updated) {
      console.error('[Guest] Error updating guest avatar URL:', error);
      return res
        .status(500)
        .json({ message: 'Database error: Unable to update avatar URL.' });
    }
    fixId(updated);
    console.log(`[Guest] Guest (ID: ${updated.id}) avatar updated to: ${newAvatarUrl}`);
    return res
      .status(200)
      .json({ message: 'Guest avatar updated successfully.', updated });
  } catch (err) {
    console.error('[Guest] Error in uploadGuestAvatar:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Sign Out Guest.
 */
export const signOutGuest = async (req, res) => {
  try {
    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ message: 'guestId is required.' });
    }
    const { error: signOutError } = await signOutUser(guestId);
    if (signOutError) {
      return res.status(500).json({ message: 'Error signing out guest.' });
    }
    return res.status(200).json({ message: 'Guest signed out successfully.' });
  } catch (error) {
    console.error('[Guest] Error signing out guest:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/************************************************
 * Search guests by name, email, or phone.
 ************************************************/
export const searchGuests = async (req, res) => {
  try {
    const { query } = req.query;
    console.log('[Guest] searchGuests called with query:', query); // Debug log

    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Query string is required.' });
    }
    const { data: guests, error } = await searchUsersByQuery(query);
    if (error) {
      console.error('[Guest] searchGuests error:', error);
      return res.status(500).json({ message: 'Database error occurred.' });
    }
    if (!guests || guests.length === 0) {
      // 404 if no matches
      return res.status(404).json({ message: 'No matching guest found.' });
    }

    // If guests found, fix IDs and return 200
    guests.forEach((g) => fixId(g));
    console.log(`[Guest] Found ${guests.length} guest(s). Returning 200...`);
    return res.status(200).json({ guests });
  } catch (err) {
    console.error('[Guest] Unexpected error in searchGuests:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/************************************************
 * Get all guests.
 ************************************************/
export const getAllGuests = async (req, res) => {
  try {
    const { data, error } = await getAllUsers();
    if (error) {
      console.error('[Guest] Error fetching all guests:', error);
      return res
        .status(500)
        .json({ message: 'Database error fetching all guests.' });
    }
    data.forEach((g) => fixId(g));
    return res.status(200).json({ guests: data });
  } catch (err) {
    console.error('[Guest] Unexpected error in getAllGuests:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
