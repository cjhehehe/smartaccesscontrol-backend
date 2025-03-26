import { RouterOSClient } from 'routeros-client';

const client = new RouterOSClient({
  host: '192.168.88.1',
  user: 'sacaccess',
  password: 'jutbagabaleseyas',
  port: 8728,
  secure: false, // plain TCP
  timeout: 5000,
});

(async () => {
  try {
    console.log('Connecting to MikroTik...');
    await client.connect();
    console.log('Connected! Fetching leases...');

    const leases = await client.write('/ip/dhcp-server/lease/print');
    console.log('Leases:', leases);

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
