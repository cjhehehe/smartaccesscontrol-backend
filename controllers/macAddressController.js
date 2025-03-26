// controllers/macAddressController.js

import supabase from '../config/supabase.js';
import { 
  saveMacAddress, 
  upsertMacAddress 
} from '../models/macAddressModel.js';

/**
 * POST /api/mac-address
 * Create a new MAC address record (if you want a dedicated route).
 */
export const createMacAddress = async (req, res) => {
  try {
    const {
      guest_id,
      rfid_uid,
      mac,  // The actual device MAC
      ip,
      status,
    } = req.body;

    if (!mac || !ip) {
      return res.status(400).json({
        success: false,
        message: 'mac and ip are required fields.'
      });
    }

    const { data, error } = await saveMacAddress({
      guest_id,
      rfid_uid,
      mac,
      ip,
      status,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[createMacAddress] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to create MAC address record.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'MAC address record created successfully.',
      data,
    });
  } catch (error) {
    console.error('[createMacAddress] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * GET /api/mac-address/all
 * Fetch all MAC addresses in the system.
 */
export const getAllMacAddresses = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[getAllMacAddresses] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch MAC addresses.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All MAC addresses fetched successfully.',
      data,
    });
  } catch (error) {
    console.error('[getAllMacAddresses] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * GET /api/mac-address/unauthenticated
 * Fetch all MAC addresses that are "unauthenticated".
 */
export const getUnauthenticatedMacAddresses = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('status', 'unauthenticated')
      .order('id', { ascending: true });

    if (error) {
      console.error('[getUnauthenticatedMacAddresses] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch unauthenticated MAC addresses.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Unauthenticated MAC addresses fetched successfully.',
      data,
    });
  } catch (error) {
    console.error('[getUnauthenticatedMacAddresses] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/mac-address/authenticate
 * Mark a MAC address as "authenticated".
 */
export const authenticateMacAddress = async (req, res) => {
  try {
    const { mac } = req.body; // "mac" in DB
    if (!mac) {
      return res.status(400).json({
        success: false,
        message: 'mac is required.',
      });
    }

    // Attempt to update the existing record
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status: 'authenticated' })
      .eq('mac', mac)
      .select()
      .single();

    if (error) {
      console.error('[authenticateMacAddress] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to authenticate MAC address.',
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: `MAC address ${mac} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac} authenticated successfully.`,
      data,
    });
  } catch (error) {
    console.error('[authenticateMacAddress] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/mac-address/deauthenticate
 * Mark a MAC address as "unauthenticated".
 */
export const deauthenticateMacAddress = async (req, res) => {
  try {
    const { mac } = req.body;
    if (!mac) {
      return res.status(400).json({
        success: false,
        message: 'mac is required.',
      });
    }

    // Attempt to update the existing record
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status: 'unauthenticated' })
      .eq('mac', mac)
      .select()
      .single();

    if (error) {
      console.error('[deauthenticateMacAddress] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to deauthenticate MAC address.',
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: `MAC address ${mac} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac} deauthenticated successfully.`,
      data,
    });
  } catch (error) {
    console.error('[deauthenticateMacAddress] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * PUT /api/mac-address/update-status
 * Upsert logic to set MAC address status (e.g. "authenticated", "unauthenticated", "blocked", etc.).
 * If the MAC doesn't exist, creates a new record with the given status.
 * If it exists, updates that record.
 */
export const updateMacAddressStatus = async (req, res) => {
  try {
    const { mac, status } = req.body;
    if (!mac || !status) {
      return res.status(400).json({
        success: false,
        message: 'mac and status are required.',
      });
    }

    // Perform an upsert (create if not found, update if existing)
    const { data, error } = await upsertMacAddress(mac, status);
    if (error) {
      console.error('[updateMacAddressStatus] upsert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to upsert MAC address status.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac} status set to '${status}'.`,
      data,
    });
  } catch (error) {
    console.error('[updateMacAddressStatus] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/mac-address/verify
 * Check if a MAC address is valid and "authenticated".
 */
export const verifyMacAddress = async (req, res) => {
  try {
    const { mac } = req.body;
    if (!mac) {
      return res.status(400).json({
        success: false,
        message: 'mac is required.',
      });
    }

    // 1) Fetch the MAC record
    const { data: macData, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('mac', mac)
      .single();

    if (error) {
      console.error('[verifyMacAddress] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to look up MAC address.',
      });
    }
    if (!macData) {
      return res.status(404).json({
        success: false,
        message: `MAC address ${mac} not found.`,
      });
    }

    // 2) Validate status
    if (macData.status !== 'authenticated') {
      return res.status(403).json({
        success: false,
        message: `MAC address ${mac} is not authenticated. Current status: ${macData.status}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac} is authenticated and valid.`,
      data: macData,
    });
  } catch (error) {
    console.error('[verifyMacAddress] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};
