#!/usr/bin/env node
import { networkInterfaces } from 'node:os';
import { createApp } from '../src/server.js';
import { encode, toAnsi } from '../src/qr.js';

const port = Number.parseInt(process.env.MAMI_PORT ?? process.argv[2] ?? '8080', 10);
const host = process.env.MAMI_HOST || '0.0.0.0';

const { server, config } = createApp();

/** First non-internal IPv4, so the printed URL works from a phone on the wifi. */
function lanAddress() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return 'localhost';
}

server.listen(port, host, () => {
  const url = config.baseUrl || `http://${lanAddress()}:${port}/`;
  const dark = '\x1b[2m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  console.log('');
  console.log(`${bold}  mami${reset} — office drink fridge`);
  console.log('');
  console.log(`  check-in    ${bold}${url}${reset}`);
  console.log(`  dashboard   ${new URL('dashboard', url).href}`);
  console.log(`  print       ${new URL('print', url).href}  ${dark}(fridge sticker)${reset}`);
  console.log(`  timezone    ${config.tz}`);
  if (!config.adminToken) {
    console.log(`  ${dark}no admin token set — anyone on the network can edit the fridge config${reset}`);
  }
  console.log('');

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
