import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAddresses, bestAddress } from '../src/netinfo.js';

function iface(address, { internal = false, name } = {}) {
  return { name, addr: { address, family: 'IPv4', internal } };
}

/** Builds the object shape node:os's networkInterfaces() returns. */
function interfaces(entries) {
  const out = {};
  for (const { name, addr } of entries) (out[name] ??= []).push(addr);
  return out;
}

test('a real wifi adapter wins over a VPN adapter reporting a private-looking address', () => {
  // This is the exact shape of the bug that shipped: a VPN client's virtual
  // adapter handed out a 10.x address that looked just as "private-network
  // valid" as the real wifi address, and simply came first in OS order.
  const nics = interfaces([
    iface('10.8.0.6', { name: 'VPN Client Adapter' }),
    iface('192.168.1.42', { name: 'Wi-Fi' }),
    iface('127.0.0.1', { name: 'Loopback', internal: true }),
  ]);

  assert.equal(bestAddress(nics), '192.168.1.42');
});

test('known VPN products are recognised by name even without the word "VPN"', () => {
  for (const name of [
    'Tailscale', 'ZeroTier One Virtual Adapter', 'WireGuard Tunnel',
    'NordLynx', 'Cisco AnyConnect Secure Mobility Client',
    'GlobalProtect Virtual Adapter', 'TAP-Windows Adapter V9',
  ]) {
    const nics = interfaces([
      iface('10.0.0.5', { name }),
      iface('192.168.1.10', { name: 'Ethernet' }),
    ]);
    assert.equal(bestAddress(nics), '192.168.1.10', `${name} should be deprioritised`);
  }
});

test('a virtual machine or container adapter is deprioritised the same way', () => {
  for (const name of ['vEthernet (WSL)', 'VirtualBox Host-Only Network', 'Hyper-V Virtual Switch', 'Docker']) {
    const nics = interfaces([
      iface('172.28.32.1', { name }),
      iface('192.168.1.10', { name: 'Ethernet' }),
    ]);
    assert.equal(bestAddress(nics), '192.168.1.10', `${name} should be deprioritised`);
  }
});

test('link-local addresses (no network reached) sort last of all', () => {
  const nics = interfaces([
    iface('169.254.83.107', { name: 'Ethernet' }), // cable unplugged
    iface('10.8.0.6', { name: 'VPN Client Adapter' }),
  ]);
  // Neither is great, but a VPN address is at least a working network; a
  // link-local address means this interface reached no network at all.
  assert.equal(bestAddress(nics), '10.8.0.6');
});

test('internal and non-IPv4 addresses are never candidates', () => {
  const nics = interfaces([
    iface('127.0.0.1', { name: 'lo', internal: true }),
    { name: 'eth0', addr: { address: '::1', family: 'IPv6', internal: false } },
  ]);
  assert.deepEqual(rankAddresses(nics), []);
  assert.equal(bestAddress(nics), 'localhost');
});

test('with nothing usable, bestAddress falls back cleanly', () => {
  assert.equal(bestAddress({}), 'localhost');
  assert.equal(bestAddress({}, '0.0.0.0'), '0.0.0.0');
});

test('an ordinary single-adapter machine just works', () => {
  const nics = interfaces([iface('192.0.2.2', { name: 'eth0' })]);
  assert.equal(bestAddress(nics), '192.0.2.2');
});

test('rankAddresses exposes every candidate in order, not just the winner', () => {
  const nics = interfaces([
    iface('10.8.0.6', { name: 'VPN Client Adapter' }),
    iface('192.168.1.42', { name: 'Wi-Fi' }),
    iface('169.254.1.1', { name: 'Ethernet' }),
  ]);
  const ranked = rankAddresses(nics);
  assert.deepEqual(ranked.map((r) => r.address), ['192.168.1.42', '10.8.0.6', '169.254.1.1']);
});
