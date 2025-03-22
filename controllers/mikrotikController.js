// controllers/mikrotikController.js
import MikroNode from 'mikronode';
import supabase from '../config/supabase.js';

const MIKROTIK_IP = process.env.MIKROTIK_IP || '192.168.88.1';
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'api_user';
const MIKROTIK_PASS = process.env.MIKROTIK_PASS || 'strong_api_password';

/**
 * GET /api/mikrotik/connected
 * Fetch the currently connected hotspot hosts from MikroTik.
 * (Uses /ip/hotspot/host to capture any device that connects.)
 */
export const getConnectedDevices = async (req, res) => {
  try {
    const device = new MikroNode(MIKROTIK_IP);
    const [login] = await device.connect(MIKROTIK_USER, MIKROTIK_PASS);
    const hotspotHost = login.menu('/ip/hotspot/host');
    const hosts = await hotspotHost.getAll();

    return res.status(200).json({
      success: true,
      message: 'MikroTik hotspot hosts fetched successfully.',
      data: hosts,
    });
  } catch (error) {
    console.error('[getConnectedDevices] MikroTik error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching connected devices from MikroTik.',
    });
  }
};

/**
 * POST /api/mikrotik/store
 * Poll the MikroTik hotspot hosts and store any new MAC addresses
 * in the database as 'unauthenticated'.
 */
export const storeConnectedDevices = async (req, res) => {
  try {
    const device = new MikroNode(MIKROTIK_IP);
    const [login] = await device.connect(MIKROTIK_USER, MIKROTIK_PASS);
    const hotspotHost = login.menu('/ip/hotspot/host');
    const hosts = await hotspotHost.getAll();

    for (const host of hosts) {
      const macAddress = host['mac-address'];
      if (!macAddress) continue;

      // Check if we already have this MAC in our DB
      const { data: existing, error: fetchError } = await supabase
        .from('mac_addresses')
        .select('mac_address')
        .eq('mac_address', macAddress);

      if (fetchError) {
        console.error(`Error checking MAC ${macAddress}:`, fetchError);
        continue;
      }
      // If not in DB, insert with default status: 'unauthenticated'
      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase
          .from('mac_addresses')
          .insert([{ mac_address: macAddress, status: 'unauthenticated' }]);
        if (insertError) {
          console.error(`Error inserting MAC ${macAddress}:`, insertError);
        } else {
          console.log(`Inserted new MAC: ${macAddress}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Hotspot hosts polled and stored in the database successfully.',
      data: hosts,
    });
  } catch (error) {
    console.error('[storeConnectedDevices] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error storing connected devices in the database.',
    });
  }
};

/**
 * POST /api/mikrotik/sync-status
 * Push all authenticated MAC addresses from the database into MikroTik hotspot user profiles.
 * (This creates users with the "with_internet" profile so that those devices get Internet access.)
 */
export const syncMikrotikStatus = async (req, res) => {
  try {
    // 1) Fetch all authenticated MACs from the database
    const { data: authenticatedMacs, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('status', 'authenticated');

    if (error) {
      console.error('[syncMikrotikStatus] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch authenticated MAC addresses.',
      });
    }

    // 2) Connect to MikroTik and update hotspot user profiles
    const device = new MikroNode(MIKROTIK_IP);
    const [login] = await device.connect(MIKROTIK_USER, MIKROTIK_PASS);
    const hotspotUser = login.menu('/ip/hotspot/user');

    // For demonstration, clear all existing hotspot users.
    // In production you might update only the relevant entries.
    const existingUsers = await hotspotUser.getAll();
    for (const usr of existingUsers) {
      await hotspotUser.remove({ '.id': usr['.id'] });
    }

    // Add each authenticated MAC as a hotspot user with the "with_internet" profile
    for (const item of authenticatedMacs) {
      await hotspotUser.add({
        name: item.mac_address,
        password: item.mac_address,  // Using MAC as password (can be randomized if desired)
        profile: 'with_internet'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Synchronized authenticated MAC addresses to MikroTik successfully.',
      data: authenticatedMacs,
    });
  } catch (error) {
    console.error('[syncMikrotikStatus] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error synchronizing MAC status with MikroTik.',
    });
  }
};
