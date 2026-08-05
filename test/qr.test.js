import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encode, toSvg, toAnsi, svgFor } from '../src/qr.js';

/**
 * Reference vectors captured from an independent QR implementation
 * (python `qrcode` 8.2). Each records the version, the mask it used, and every
 * module, so a regression anywhere in encoding, Reed-Solomon, interleaving, or
 * pattern placement shows up as a module mismatch.
 *
 * Mask *selection* is deliberately not pinned to the reference: choosing a mask
 * is an optimisation over penalty scores, not a correctness requirement, and the
 * two implementations score a few codes differently. Every code this module
 * produces was separately confirmed to decode back to its input.
 */
const VECTORS = JSON.parse(
  readFileSync(new URL('./fixtures/qr-vectors.json', import.meta.url), 'utf8'));

test('encoded modules match the reference implementation exactly', () => {
  assert.ok(VECTORS.length >= 7, 'expected a spread of fixtures');

  for (const v of VECTORS) {
    const qr = encode(v.text, { ecl: v.ecl, mask: v.mask });
    assert.equal(qr.version, v.version, `version for ${JSON.stringify(v.text)}`);
    assert.equal(qr.size, v.rows.length);

    const mine = qr.modules.map((row) => row.map((c) => (c ? '1' : '0')).join(''));
    assert.deepEqual(mine, v.rows,
      `modules for ${JSON.stringify(v.text)} at ECC ${v.ecl} mask ${v.mask}`);
  }
});

test('version scales with payload length', () => {
  assert.equal(encode('a', { ecl: 'M' }).version, 1);
  assert.equal(encode('http://fridge.local:8080', { ecl: 'M' }).version, 2);
  assert.equal(encode(`https://example.com/${'x'.repeat(120)}`, { ecl: 'M' }).version, 8);
});

test('a stronger ECC level needs a bigger symbol for the same text', () => {
  const text = 'https://drinks.corp.internal/mami/kitchen-fridge/check-in';
  const l = encode(text, { ecl: 'L' }).version;
  const h = encode(text, { ecl: 'H' }).version;
  assert.ok(h > l, `expected H (${h}) to exceed L (${l})`);
});

test('auto mask selection always lands on a real mask', () => {
  for (const v of VECTORS) {
    const qr = encode(v.text, { ecl: v.ecl });
    assert.ok(Number.isInteger(qr.mask) && qr.mask >= 0 && qr.mask <= 7,
      `mask out of range: ${qr.mask}`);
  }
});

test('finder patterns land in three corners', () => {
  const { modules, size } = encode('http://fridge.local:8080');
  for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    assert.equal(modules[oy][ox], true, 'finder outer ring');
    assert.equal(modules[oy + 1][ox + 1], false, 'finder inner gap');
    assert.equal(modules[oy + 3][ox + 3], true, 'finder centre');
  }
});

test('timing patterns alternate along row and column 6', () => {
  const { modules, size } = encode('http://fridge.local:8080');
  for (let i = 8; i < size - 8; i++) {
    assert.equal(modules[6][i], i % 2 === 0, `row 6 at ${i}`);
    assert.equal(modules[i][6], i % 2 === 0, `column 6 at ${i}`);
  }
});

test('unicode is encoded as UTF-8 bytes', () => {
  const qr = encode('🧊 café');
  assert.ok(qr.size >= 21);
  // 4 bytes for the emoji + space + 5 for "café" (é is two bytes) = 11 bytes.
  assert.equal(encode('🧊 café').version, encode('x'.repeat(11)).version);
});

test('data too long for the version range is rejected, not silently truncated', () => {
  assert.throws(() => encode('x'.repeat(5000), { ecl: 'H', maxVersion: 10 }), /too long/);
});

test('an unknown ECC level is rejected', () => {
  assert.throws(() => encode('hello', { ecl: 'Z' }), /unknown ECC level/);
});

test('toSvg emits a self-contained square SVG sized by scale and border', () => {
  const qr = encode('http://fridge.local:8080');
  const svg = toSvg(qr, { scale: 10, border: 2 });
  const expected = (qr.size + 4) * 10;

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, new RegExp(`width="${expected}" height="${expected}"`));
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.ok(svg.trimEnd().endsWith('</svg>'));
  assert.equal(svg.split('<path').length, 2, 'one path holds every dark module');
});

test('svgFor is encode + toSvg', () => {
  assert.equal(svgFor('http://fridge.local:8080', { scale: 4, border: 1 }),
    toSvg(encode('http://fridge.local:8080'), { scale: 4, border: 1 }));
});

test('toAnsi renders a square block of terminal cells', () => {
  const qr = encode('http://fridge.local:8080');
  const lines = toAnsi(qr, { border: 2 }).split('\n');
  assert.equal(lines.length, qr.size + 4);
  for (const line of lines) {
    // Two spaces per module keeps the aspect ratio square in a terminal.
    assert.equal((line.match(/ {2}/g) ?? []).length, qr.size + 4);
  }
});
