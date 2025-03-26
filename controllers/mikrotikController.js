// controllers/mikrotikController.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import supabase from '../config/supabase.js';

// 1) Dynamically require node-routeros
const nodeRouterOS = require('node-routeros');

// 2) Fallback approach to get the correct constructor
let RouterOSClient = nodeRouterOS.RouterOSClient;
if (!RouterOSClient && typeof nodeRouterOS.default === 'function') {
  RouterOSClient = nodeRouterOS.default;
}

// Environment variables
const MIKROTIK_IP = process.env.MIKROTIK_IP || '192.168.88.1';
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'sacaccess';
const MIKROTIK_PASSWORD = process.env.MIKROTIK_PASSWORD || 'jutbagabaleseyas';
const MIKROTIK_PORT = process.env.MIKROTIK_PORT || 8728;

/**
 * GET /api/mikrotik/leases
 * Fetch DHCP leases from the MikroTik for the 'guest_dhcp' server.
 */
export const getGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    const leases = await client.menu('/ip/dhcp-server/lease').getAll();
    const guestLeases = leases.filter(
      (lease) => lease.server === 'guest_dhcp' && lease.status === 'bound'
    );

    return res.status(200).json({
      success: true,
      message: 'DHCP leases fetched successfully from guest_dhcp.',
      data: guestLeases,
    });
  } catch (error) {
    console.error('[getGuestDhcpLeases] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching guest DHCP leases from MikroTik.',
      error: error.message,
    });
  } finally {
    if (client) {
      client.close();
    }
  }
};

/**
 * POST /api/mikrotik/store-leases
 * Poll the MikroTik guest_dhcp leases and store them in Supabase.
 */
export const storeGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    const leases = await client.menu('/ip/dhcp-server/lease').getAll();
    const guestLeases = leases.filter(
      (lease) => lease.server === 'guest_dhcp' && lease.status === 'bound'
    );

    let insertedCount = 0;
    for (const lease of guestLeases) {
      const mac = lease['mac-address'];
      const ip = lease.address;
      if (!mac || !ip) continue;

      const { data: existing, error: fetchError } = await supabase
        .from('mac_addresses')
        .select('*')
        .eq('mac', mac)
        .maybeSingle();

      if (fetchError) {
        console.error(`Supabase fetch error for MAC ${mac}:`, fetchError);
        continue;
      }

      if (!existing) {
        // Insert a new row with default status
        const { error: insertError } = await supabase
          .from('mac_addresses')
          .insert([{ mac, ip, status: 'connected' }]);
        if (insertError) {
          console.error(`Insert error for MAC ${mac}:`, insertError);
        } else {
          insertedCount++;
          console.log(`Inserted new MAC: ${mac}, IP: ${ip}`);
        }
      } else {
        // Optionally update IP if changed
        if (existing.ip !== ip) {
          const { error: updateError } = await supabase
            .from('mac_addresses')
            .update({ ip })
            .eq('mac', mac);
          if (updateError) {
            console.error(`Update IP error for MAC ${mac}:`, updateError);
          } else {
            console.log(`Updated IP for MAC: ${mac}, new IP: ${ip}`);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'guest_dhcp leases polled and stored in Supabase successfully.',
      insertedCount,
      totalLeases: guestLeases.length,
    });
  } catch (error) {
    console.error('[storeGuestDhcpLeases] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error storing guest DHCP leases in Supabase.',
      error: error.message,
    });
  } finally {
    if (client) {
      client.close();
    }
  }
};

/**
 * POST /api/mikrotik/activate-internet
 * Example approach for adding authenticated MAC addresses to a firewall list.
 */
export const syncMikrotikStatus = async (req, res) => {
  let client;
  try {
    const { data: authenticatedMacs, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('status', 'authenticated');

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database error: Unable to fetch authenticated MAC addresses.',
      });
    }

    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    const firewallList = await client.menu('/ip/firewall/address-list').getAll();

    for (const macEntry of authenticatedMacs) {
      const mac = macEntry.mac;
      const ip = macEntry.ip;
      if (!ip) continue;

      const existingEntry = firewallList.find(
        (entry) => entry.list === 'guest_whitelist' && entry.address === ip
      );

      if (!existingEntry) {
        await client.write('/ip/firewall/address-list/add', [
          '=list=guest_whitelist',
          `=address=${ip}`,
          `=comment=Auth MAC: ${mac}`,
        ]);
        console.log(`Whitelisted IP ${ip} for MAC: ${mac}`);
      }
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
      message: 'Error synchronizing MAC addresses with MikroTik.',
      error: error.message,
    });
  } finally {
    if (client) {
      client.close();
    }
  }
};
