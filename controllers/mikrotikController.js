// mikrotikController.js
import pkg from 'routeros-client';
const { RouterOSClient } = pkg;
import supabase from '../config/supabase.js';

// MikroTik config from .env
const MIKROTIK_HOST = process.env.MIKROTIK_HOST || 'pi-gateway.tail1e634e.ts.net';
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'sacaccess';
const MIKROTIK_PASSWORD = process.env.MIKROTIK_PASSWORD || 'jutbagabaleseyas';
const MIKROTIK_PORT = process.env.MIKROTIK_PORT || 443;
const MIKROTIK_TIMEOUT = Number(process.env.MIKROTIK_TIMEOUT) || 10000;

/**
 * Utility: Create a new RouterOSClient instance
 * 
 * This is the function used to initialize the MikroTik client
 * using the environment variables in .env or default values.
 */
function createMikroTikClient() {
  console.log(`[MikroTik] Creating RouterOSClient for ${MIKROTIK_HOST}:${MIKROTIK_PORT}`);
  return new RouterOSClient({
    host: MIKROTIK_HOST,
    user: MIKROTIK_USER,
    password: MIKROTIK_PASSWORD,
    port: Number(MIKROTIK_PORT),
    secure: false,
    timeout: MIKROTIK_TIMEOUT,
  });
}

/**
 * GET /api/mikrotik/leases
 * 
 * Retrieves DHCP leases from the MikroTik router,
 * filtered by server === 'guest_dhcp' and status === 'bound'.
 */
export const getGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    client = createMikroTikClient();
    console.log('[Mikrotik] Connecting to fetch DHCP leases...');
    // IMPORTANT: Use the connected client returned by .connect()
    const connectedClient = await client.connect();

    const leases = await connectedClient.menu('/ip/dhcp-server/lease').get();
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
 * 
 * Fetches guest_dhcp leases and stores them in Supabase
 * (table: mac_addresses). If the MAC doesn’t exist, inserts a new row;
 * if it does exist but IP changed, updates the IP.
 */
export const storeGuestDhcpLeases = async (req, res) => {
  let client;
  try {
    client = createMikroTikClient();
    console.log('[Mikrotik] Connecting to poll and store DHCP leases...');
    const connectedClient = await client.connect();

    // Get all DHCP leases
    const leases = await connectedClient.menu('/ip/dhcp-server/lease').get();
    const guestLeases = leases.filter(
      (lease) => lease.server === 'guest_dhcp' && lease.status === 'bound'
    );

    let insertedCount = 0;
    for (const lease of guestLeases) {
      const mac = lease['mac-address'];
      const ip = lease.address;
      if (!mac || !ip) continue;

      // Check if MAC exists in Supabase
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
        // Insert new row if not present
        const { error: insertError } = await supabase
          .from('mac_addresses')
          .insert([{ mac, ip, status: 'connected' }]);

        if (insertError) {
          console.error(`Insert error for MAC ${mac}:`, insertError);
        } else {
          insertedCount++;
          console.log(`[storeGuestDhcpLeases] Inserted new MAC: ${mac}, IP: ${ip}`);
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
            console.log(`[storeGuestDhcpLeases] Updated IP for MAC: ${mac}, new IP: ${ip}`);
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
 * 
 * Fetches authenticated MAC addresses from Supabase, 
 * then ensures each IP is whitelisted in the MikroTik’s firewall address-list.
 */
export const syncMikrotikStatus = async (req, res) => {
  let client;
  try {
    // Fetch authenticated MAC addresses from Supabase
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

    client = createMikroTikClient();
    console.log('[Mikrotik] Connecting to synchronize authenticated MACs...');
    const connectedClient = await client.connect();

    // Fetch existing firewall address-list entries
    const firewallList = await connectedClient.menu('/ip/firewall/address-list').get();

    for (const macEntry of authenticatedMacs) {
      const mac = macEntry.mac;
      const ip = macEntry.ip;
      if (!ip) continue; // Skip if no IP is assigned

      const existingEntry = firewallList.find(
        (entry) => entry.list === 'guest_whitelist' && entry.address === ip
      );

      if (!existingEntry) {
        // Add new entries to firewall
        await connectedClient.menu('/ip/firewall/address-list').add({
          list: 'guest_whitelist',
          address: ip,
          comment: `Auth MAC: ${mac}`,
        });
        console.log(`[syncMikrotikStatus] Whitelisted IP ${ip} for MAC: ${mac}`);
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
