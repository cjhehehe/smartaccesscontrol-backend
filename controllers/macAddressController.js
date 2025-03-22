// controllers/macAddressController.js
import supabase from '../config/supabase.js';

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
    const { mac_address } = req.body;
    if (!mac_address) {
      return res.status(400).json({
        success: false,
        message: 'mac_address is required.',
      });
    }

    // Update status -> 'authenticated'
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status: 'authenticated' })
      .eq('mac_address', mac_address)
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
        message: `MAC address ${mac_address} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac_address} authenticated successfully.`,
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
    const { mac_address } = req.body;
    if (!mac_address) {
      return res.status(400).json({
        success: false,
        message: 'mac_address is required.',
      });
    }

    // Update status -> 'unauthenticated'
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status: 'unauthenticated' })
      .eq('mac_address', mac_address)
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
        message: `MAC address ${mac_address} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac_address} deauthenticated successfully.`,
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
 * Unified method to update MAC address status (e.g. "authenticated", "unauthenticated", "blocked", etc.)
 */
export const updateMacAddressStatus = async (req, res) => {
  try {
    const { mac_address, status } = req.body;
    if (!mac_address || !status) {
      return res.status(400).json({
        success: false,
        message: 'mac_address and status are required.',
      });
    }

    // Update the status
    const { data, error } = await supabase
      .from('mac_addresses')
      .update({ status })
      .eq('mac_address', mac_address)
      .select()
      .single();

    if (error) {
      console.error('[updateMacAddressStatus] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to update MAC address status.',
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        message: `MAC address ${mac_address} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac_address} status updated to '${status}'.`,
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
 * Check if a MAC address is valid and "authenticated" (for advanced use, tie in room/hours_stay logic).
 */
export const verifyMacAddress = async (req, res) => {
  try {
    const { mac_address } = req.body;
    if (!mac_address) {
      return res.status(400).json({
        success: false,
        message: 'mac_address is required.',
      });
    }

    // 1) Fetch the MAC record
    const { data: macData, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('mac_address', mac_address)
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
        message: `MAC address ${mac_address} not found.`,
      });
    }

    // 2) Validate status
    if (macData.status !== 'authenticated') {
      return res.status(403).json({
        success: false,
        message: `MAC address ${mac_address} is not authenticated. Current status: ${macData.status}`,
      });
    }

    // (Optional) Add logic to check if hours_stay has expired or if there's a "check_out" time

    return res.status(200).json({
      success: true,
      message: `MAC address ${mac_address} is authenticated and valid.`,
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
