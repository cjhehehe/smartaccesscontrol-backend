// controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import supabase from '../config/supabase.js';

dotenv.config();

export const loginAdmin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    console.log(`[Auth] Attempting login with identifier: ${identifier}`);

    // Query admin by username or email
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password, email, role')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (error || !admin) {
      console.log(`[Auth] Admin not found for identifier: ${identifier}`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    console.log(`[Auth] Retrieved admin data for: ${admin.username}`);

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log(`[Auth] Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`[Auth] Incorrect password for: ${identifier}`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token. (Token expiry based on UTC)
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' }
    );

    console.log(`[Auth] Admin login successful for: ${admin.username}`);
    return res.status(200).json({ message: 'Login successful.', token });
  } catch (error) {
    console.error(`[Auth] Unexpected error during login:`, error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// (Additional auth functions can be added here if needed)
