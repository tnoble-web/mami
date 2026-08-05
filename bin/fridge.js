#!/usr/bin/env node
import { networkInterfaces } from 'node:os';
import { rankAddresses } from '../src/netinfo.js';

// Storage is Node's built-in SQLite, which only exists from 22.5 onward. Check
// before loading anything that imports it, so an old Node gets a sentence it can
// act on instead of "Cannot find module 'node:sqlite'". The imports below are
// dynamic for exactly this reason — static ones would run first.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error('');
  console.error(`  This needs Node.js 22.5 or newer. You have ${process.versions.node}.`);
  console.error('  Install the current LTS release from https://nodejs.org and try again.');
  console.error('');
  process.exit(1);
}

const { createApp } = await import('../src/server.js');
const { encode, toAnsi } = await import('../src/qr.js');

const port = Number.parseInt(process.env.FRIDGE_PORT ?? process.argv[2] ?? '8080', 10);
const host = process.env.FRIDGE_HOST || '0.0.0.0';

const { server, config } = createApp();

/** The address most likely to work from a phone on the office wifi. */
function lanAddress() {
  return rankAddresses(networkInterfaces())[0]?.address ?? 'localhost';
}

server.on('error', (err) => {
  console.error('');
  if (err.code === 'EADDRINUSE') {
    console.error(`  Port ${port} is already being used by another program.`);
    console.error('  Either close that program, or start this one on a different port:');
    console.error('      npm start -- 8081');
  } else if (err.code === 'EACCES') {
    console.error(`  Not allowed to use port ${port}. Try a number above 1024, such as 8080.`);
  } else {
    console.error(`  Could not start: ${err.message}`);
  }
  console.error('');
  process.exit(1);
});

server.listen(port, host, () => {
  const candidates = rankAddresses(networkInterfaces());
  const url = config.baseUrl || `http://${lanAddress()}:${port}/`;
  const dark = '\x1b[2m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  console.log('');
  console.log(`${bold}  FRIDGE${reset} — who is taking what, and what to reorder`);
  console.log('');
  console.log(`  check-in    ${bold}${url}${reset}`);
  console.log(`  dashboard   ${new URL('dashboard', url).href}`);
  console.log(`  print       ${new URL('print', url).href}  ${dark}(fridge sticker)${reset}`);
  console.log(`  timezone    ${config.tz}`);
  if (!config.adminToken) {
    console.log(`  ${dark}no admin token set — anyone on the network can edit the fridge config${reset}`);
  }
  console.log('');

  // If a phone can't reach the address above, this machine has more than one
  // network connection (often a VPN or virtual machine) and picked the wrong
  // one first. Any other address in this list is worth typing into a phone
  // browser directly.
  if (!config.baseUrl && candidates.length > 1) {
    console.log(`  ${dark}If that address doesn't load on a phone, try one of these instead:${reset}`);
    for (const c of candidates.slice(1, 5)) {
      console.log(`  ${dark}  http://${c.address}:${port}/  (${c.name})${reset}`);
    }
    console.log('');
  }

  try {
    console.log(toAnsi(encode(url, { ecl: 'M' }), { border: 2 }));
    console.log('');
    console.log(`  ${dark}Scan to check in, or print the sticker page for the fridge door.${reset}`);
    console.log('');
  } catch {
    // A URL too long to encode is not a reason to fail startup.
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
