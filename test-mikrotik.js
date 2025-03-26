import pkg from 'routeros-client';
const { RouterOSClient } = pkg;

const client = new RouterOSClient({
  host: '192.168.88.1',
  user: 'sacaccess',
  password: 'jutbagabaleseyas',
  port: 8728,
  secure: false,
  timeout: 5000,
});

(async () => {
  try {
    console.log('Connecting to MikroTik...');
    const connectedClient = await client.connect();
    console.log('Connected! Fetching leases...');

    // Get all DHCP leases
    const leases = await connectedClient.menu('/ip/dhcp-server/lease').get();

    // Filter leases so only those coming from guest_dhcp are returned
    const guestLeases = leases.filter(lease => lease.server === 'guest_dhcp');

    console.log('Guest Leases:', guestLeases);

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
