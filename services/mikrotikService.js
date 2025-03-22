// services/mikrotikService.js
import { RouterOSClient } from 'routeros-client';

const config = {
  host: process.env.MIKROTIK_HOST,
  user: process.env.MIKROTIK_USER,
  password: process.env.MIKROTIK_PASSWORD,
};

export async function allowMac(macAddress) {
  const client = new RouterOSClient();
  try {
    await client.connect(config);

    // Retrieve existing firewall rules with comment containing the MAC address
    const rules = await client.write('/ip/firewall/filter/print', {
      '?comment': macAddress,
    });

    // Remove each rule found that blocks the MAC address
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        await client.write('/ip/firewall/filter/remove', { '.id': rule['.id'] });
      }
    }
    await client.disconnect();
    return { success: true };
  } catch (err) {
    console.error('[MikrotikService] allowMac error:', err);
    await client.disconnect();
    return { success: false, error: err };
  }
}

export async function blockMac(macAddress) {
  const client = new RouterOSClient();
  try {
    await client.connect(config);
    // Add a firewall rule to drop all packets from the given MAC address.
    // Using "src-mac-address" field and setting a comment to easily find it later.
    const result = await client.write('/ip/firewall/filter/add', {
      chain: 'forward',
      'src-mac-address': macAddress,
      action: 'drop',
      comment: macAddress,
    });
    await client.disconnect();
    return { success: true, ruleId: result };
  } catch (err) {
    console.error('[MikrotikService] blockMac error:', err);
    await client.disconnect();
    return { success: false, error: err };
  }
}
