/**
 * Picks the network address most likely reachable from a phone on the same
 * wifi as this machine, out of everything the OS reports.
 *
 * A laptop commonly has more than one active network connection — a VPN
 * client, a virtual machine tool, a container runtime — and the OS gives no
 * guarantee that the real wifi/ethernet adapter is listed first. Handing out
 * the first address blind means the QR code can encode an address that only
 * exists inside the laptop, which looks identical to a working setup until a
 * phone actually tries to load it.
 *
 * Pure and dependency-injected (interfaces passed in, not read from the OS
 * here) so the ranking can be tested against a fixed, realistic layout
 * instead of whatever happens to be attached to the machine running the tests.
 */

// Interface-name patterns that mean "not the network a phone could join."
// Covers virtualization/container tooling by name, and VPN clients both by
// product name and by generic connection-type words, since a VPN vendor's
// exact adapter name is not standardized and new ones appear constantly.
const VIRTUAL_ADAPTER = new RegExp(
  [
    'vethernet', 'virtualbox', 'vmware', 'hyper-v', 'docker', 'wsl',
    'loopback', 'tap\\d*', 'tun\\d*', 'ppp',
    // VPN clients, by product name where they're distinctive...
    'tailscale', 'zerotier', 'wireguard', 'nordlynx', 'nordvpn', 'expressvpn',
    'surfshark', 'protonvpn', 'mullvad', 'openvpn', 'anyconnect',
    'globalprotect', 'forticlient', 'pulse secure', 'sonicwall', 'checkpoint',
    // ...and by the generic word every one of them tends to use somewhere.
    '\\bvpn\\b', 'tunnel',
  ].join('|'),
  'i',
);

function score(name, address) {
  if (address.startsWith('169.254.')) return -2; // link-local: no network reached
  if (VIRTUAL_ADAPTER.test(name)) return -1;
  if (/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 1;
  return 0;
}

/**
 * @param {Record<string, Array<{address:string, family:string, internal:boolean}>>} interfaces
 *        The shape `node:os`'s `networkInterfaces()` returns.
 * @returns {Array<{name:string, address:string, score:number}>} best guess first
 */
export function rankAddresses(interfaces) {
  const found = [];
  for (const [name, addrs] of Object.entries(interfaces ?? {})) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      found.push({ name, address: addr.address, score: score(name, addr.address) });
    }
  }
  return found.sort((a, b) => b.score - a.score);
}

/** The single best guess, or `fallback` when nothing usable was found. */
export function bestAddress(interfaces, fallback = 'localhost') {
  return rankAddresses(interfaces)[0]?.address ?? fallback;
}
