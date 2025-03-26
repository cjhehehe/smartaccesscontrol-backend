// controllers/mikrotikController.js

import { RouterOSClient } from 'node-routeros';
import supabase from '../config/supabase.js';

// Read environment variables from .env
const MIKROTIK_IP = process.env.MIKROTIK_IP || '192.168.88.1';
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'sacaccess';
const MIKROTIK_PASSWORD = process.env.MIKROTIK_PASSWORD || 'jutbagabaleseyas';
const MIKROTIK_PORT = process.env.MIKROTIK_PORT || 8728; // Default 8728 if not specified

/**
 * GET /api/mikrotik/leases
 * Fetch DHCP leases from the MikroTik for the 'guest_dhcp' server.
 * This will return a list of objects containing MAC, IP, status, etc.
 */
export const getGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    // 1) Connect to MikroTik RouterOS via node-routeros
    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    // 2) Get all DHCP leases
    const leases = await client.menu('/ip/dhcp-server/lease').getAll();

    // 3) Filter for server=guest_dhcp + status=bound
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
 * 1) Fetch the DHCP leases from 'guest_dhcp'
 * 2) Insert or update them in Supabase's mac_addresses table
 * 
 * Table columns assumed:
 *   - mac (varchar or text)
 *   - ip (text)
 *   - rfid_uid (varchar?) - optional
 *   - status (varchar) - e.g. 'unauthenticated' or 'connected'
 *   - created_at (timestamp)
 * 
 * We set default status='connected' or 'unauthenticated' as needed.
 */
export const storeGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    // 1) Connect to MikroTik
    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    // 2) Fetch all DHCP leases from the guest DHCP server
    const leases = await client.menu('/ip/dhcp-server/lease').getAll();
    const guestLeases = leases.filter(
      (lease) => lease.server === 'guest_dhcp' && lease.status === 'bound'
    );

    // 3) For each lease, upsert into Supabase mac_addresses
    let insertedCount = 0;
    for (const lease of guestLeases) {
      const mac = lease['mac-address'];
      const ip = lease.address;
      // You could also read lease['host-name'] if you want

      if (!mac || !ip) {
        continue; // Skip invalid
      }

      // Upsert logic: check if we have an existing row with the same MAC
      // If none, insert. If yes, optionally update IP or status.
      const { data: existing, error: fetchError } = await supabase
        .from('mac_addresses')
        .select('*')
        .eq('mac', mac)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        continue;
      }

      if (!existing) {
        // Insert new row with default status, e.g. 'connected'
        const { error: insertError } = await supabase
          .from('mac_addresses')
          .insert([
            {
              mac: mac,
              ip: ip,
              status: 'connected', // or 'unauthenticated'
            },
          ]);

        if (insertError) {
          console.error(`Insert error for MAC ${mac}:`, insertError);
        } else {
          insertedCount++;
          console.log(`Inserted new MAC: ${mac}, IP: ${ip}`);
        }
      } else {
        // Optionally update IP or status if changed
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
      message: 'guest_dhcp leases polled & stored in Supabase successfully.',
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
 * Example of how you'd mark "authenticated" devices in MikroTik
 * (like a whitelist approach). This is optional if you want to
 * auto-grant internet after scanning RFID, etc.
 */
export const syncMikrotikStatus = async (req, res) => {
  let client;
  try {
    // 1) Fetch all authenticated MACs from Supabase
    const { data: authenticatedMacs, error } = await supabase
      .from('mac_addresses')
      .select('*')
      .eq('status', 'authenticated'); // or 'connected'

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Supabase error: Unable to fetch authenticated MAC addresses.',
        error,
      });
    }

    // 2) Connect to MikroTik
    client = new RouterOSClient({
      host: MIKROTIK_IP,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
      port: Number(MIKROTIK_PORT),
    });
    await client.connect();

    // Example: if you're using Hotspot user approach
    // or an Address List approach for firewall whitelisting:
    // We'll show the Address List approach for a simple firewall:

    const firewallList = await client.menu('/ip/firewall/address-list').getAll();
    // We might remove old entries or just upsert

    for (const macEntry of authenticatedMacs) {
      const mac = macEntry.mac;
      // If you're bridging on MAC, you might prefer 'layer2' approach
      // or if bridging on IP, we can add IP to the address list
      const ip = macEntry.ip;

      if (!ip) continue;

      // Check if IP is already in address-list=guest_whitelist
      const existingEntry = firewallList.find(
        (entry) => entry.list === 'guest_whitelist' && entry.address === ip
      );

      if (!existingEntry) {
        // Add it
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
      message: 'Synchronized authenticated MAC addresses to MikroTik firewall list.',
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
