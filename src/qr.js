/**
 * Minimal QR Code encoder (byte mode) with no dependencies, so the fridge
 * sticker can be generated on an office machine with no network access.
 *
 * Implements ISO/IEC 18004: Reed-Solomon error correction, block interleaving,
 * function patterns, and penalty-scored automatic mask selection. Verified
 * module-for-module against a reference encoder in test/qr.test.js.
 */

const ECC_LEVELS = {
  L: { ordinal: 0, formatBits: 1 },
  M: { ordinal: 1, formatBits: 0 },
  Q: { ordinal: 2, formatBits: 3 },
  H: { ordinal: 3, formatBits: 2 },
};

// Indexed [ecc ordinal][version - 1].
const ECC_CODEWORDS_PER_BLOCK = [
  [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [10, 16, 26, 18, 24, 16, 18, 22, 22, 20, 24, 28, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_ECC_BLOCKS = [
  [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const PENALTY_N1 = 3, PENALTY_N2 = 3, PENALTY_N3 = 40, PENALTY_N4 = 10;

function getBit(x, i) {
  return ((x >>> i) & 1) !== 0;
}

/** Total data+ECC modules available for a version, before ECC is subtracted. */
function numRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(version, ecl) {
  const o = ECC_LEVELS[ecl].ordinal;
  return Math.floor(numRawDataModules(version) / 8)
    - ECC_CODEWORDS_PER_BLOCK[o][version - 1] * NUM_ECC_BLOCKS[o][version - 1];
}

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMultiply(coef, factor); });
  }
  return result;
}

function alignmentPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const size = version * 4 + 17;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

class QrCode {
  constructor(version, ecl, dataCodewords, forcedMask = -1) {
    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));

    this.#drawFunctionPatterns();
    this.#drawCodewords(this.#addEccAndInterleave(dataCodewords));

    let mask = forcedMask;
    if (mask === -1) {
      let minPenalty = Infinity;
      for (let m = 0; m < 8; m++) {
        this.#applyMask(m);
        this.#drawFormatBits(m);
        const penalty = this.#penaltyScore();
        if (penalty < minPenalty) { mask = m; minPenalty = penalty; }
        this.#applyMask(m); // undo
      }
    }
    this.mask = mask;
    this.#applyMask(mask);
    this.#drawFormatBits(mask);
    this.isFunction = null;
  }

  #setFunctionModule(x, y, isDark) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  #drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) {
      this.#setFunctionModule(6, i, i % 2 === 0);
      this.#setFunctionModule(i, 6, i % 2 === 0);
    }
    this.#drawFinder(3, 3);
    this.#drawFinder(this.size - 4, 3);
    this.#drawFinder(3, this.size - 4);

    const pos = alignmentPositions(this.version);
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const isCorner = (i === 0 && j === 0)
          || (i === 0 && j === n - 1)
          || (i === n - 1 && j === 0);
        if (!isCorner) this.#drawAlignment(pos[i], pos[j]);
      }
    }
    this.#drawFormatBits(0);
    this.#drawVersion();
  }

  #drawFinder(x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.#setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  #drawAlignment(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.#setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  #drawFormatBits(mask) {
    const data = (ECC_LEVELS[this.ecl].formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.#setFunctionModule(8, i, getBit(bits, i));
    this.#setFunctionModule(8, 7, getBit(bits, 6));
    this.#setFunctionModule(8, 8, getBit(bits, 7));
    this.#setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.#setFunctionModule(14 - i, 8, getBit(bits, i));

    for (let i = 0; i < 8; i++) this.#setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.#setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.#setFunctionModule(8, this.size - 8, true);
  }

  #drawVersion() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const color = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.#setFunctionModule(a, b, color);
      this.#setFunctionModule(b, a, color);
    }
  }

  #addEccAndInterleave(data) {
    const o = ECC_LEVELS[this.ecl].ordinal;
    const numBlocks = NUM_ECC_BLOCKS[o][this.version - 1];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[o][this.version - 1];
    const rawCodewords = Math.floor(numRawDataModules(this.version) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks = [];
    const divisor = rsDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, divisor);
      if (i < numShortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }

    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
      });
    }
    return result;
  }

  #drawCodewords(data) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  #applyMask(mask) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: throw new RangeError('bad mask');
        }
        if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  #penaltyScore() {
    let result = 0;

    for (let y = 0; y < this.size; y++) {
      let runColor = false, runLen = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < this.size; x++) {
        if (this.modules[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += PENALTY_N1;
          else if (runLen > 5) result++;
        } else {
          this.#addHistory(runLen, history);
          if (!runColor) result += this.#countFinderPatterns(history) * PENALTY_N3;
          runColor = this.modules[y][x];
          runLen = 1;
        }
      }
      result += this.#terminateAndCount(runColor, runLen, history) * PENALTY_N3;
    }

    for (let x = 0; x < this.size; x++) {
      let runColor = false, runLen = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < this.size; y++) {
        if (this.modules[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += PENALTY_N1;
          else if (runLen > 5) result++;
        } else {
          this.#addHistory(runLen, history);
          if (!runColor) result += this.#countFinderPatterns(history) * PENALTY_N3;
          runColor = this.modules[y][x];
          runLen = 1;
        }
      }
      result += this.#terminateAndCount(runColor, runLen, history) * PENALTY_N3;
    }

    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const c = this.modules[y][x];
        if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
          result += PENALTY_N2;
        }
      }
    }

    let dark = 0;
    for (const row of this.modules) for (const c of row) if (c) dark++;
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + k * PENALTY_N4;
  }

  #addHistory(runLen, history) {
    if (history[0] === 0) runLen += this.size; // light border before the first run
    history.pop();
    history.unshift(runLen);
  }

  #countFinderPatterns(history) {
    const n = history[1];
    const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
    return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0)
      + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
  }

  #terminateAndCount(runColor, runLen, history) {
    if (runColor) {
      this.#addHistory(runLen, history);
      runLen = 0;
    }
    runLen += this.size;
    this.#addHistory(runLen, history);
    return this.#countFinderPatterns(history);
  }
}

/**
 * Encode text as a QR code in byte mode.
 * @returns {{size:number, modules:boolean[][], version:number, mask:number, ecl:string}}
 */
export function encode(text, { ecl = 'M', minVersion = 1, maxVersion = 20, mask = -1 } = {}) {
  if (!ECC_LEVELS[ecl]) throw new RangeError(`unknown ECC level: ${ecl}`);
  const bytes = [...new TextEncoder().encode(text)];

  let version = 0;
  for (let v = minVersion; v <= maxVersion; v++) {
    const capacityBits = numDataCodewords(v, ecl) * 8;
    const countBits = v <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= capacityBits) { version = v; break; }
  }
  if (version === 0) {
    throw new RangeError(`data too long for QR version ${maxVersion} at ECC level ${ecl}`);
  }

  // Bit stream: mode indicator, character count, payload.
  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  const capacityBits = numDataCodewords(version, ecl) * 8;
  push(0, Math.min(4, capacityBits - bits.length));       // terminator
  push(0, (8 - (bits.length % 8)) % 8);                   // byte align
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  const qr = new QrCode(version, ecl, codewords, mask);
  return { size: qr.size, modules: qr.modules, version: qr.version, mask: qr.mask, ecl };
}

/** Render an encoded QR code as a standalone SVG string. */
export function toSvg(qr, { scale = 8, border = 4, dark = '#000000', light = '#ffffff' } = {}) {
  const dim = (qr.size + border * 2) * scale;
  const parts = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) {
        parts.push(`M${(x + border) * scale},${(y + border) * scale}h${scale}v${scale}h-${scale}z`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code">`
    + `<rect width="${dim}" height="${dim}" fill="${light}"/>`
    + `<path d="${parts.join('')}" fill="${dark}"/>`
    + `</svg>`;
}

/** Convenience: text straight to SVG. */
export function svgFor(text, options = {}) {
  return toSvg(encode(text, options), options);
}

/**
 * Render as ANSI background blocks so it can be scanned straight off a
 * terminal. Two spaces per module keeps the aspect ratio square.
 */
export function toAnsi(qr, { border = 2 } = {}) {
  const LIGHT = '\x1b[107m  \x1b[0m';
  const DARK = '\x1b[40m  \x1b[0m';
  const width = qr.size + border * 2;
  const blank = LIGHT.repeat(width);
  const lines = [];
  for (let i = 0; i < border; i++) lines.push(blank);
  for (let y = 0; y < qr.size; y++) {
    let line = LIGHT.repeat(border);
    for (let x = 0; x < qr.size; x++) line += qr.modules[y][x] ? DARK : LIGHT;
    lines.push(line + LIGHT.repeat(border));
  }
  for (let i = 0; i < border; i++) lines.push(blank);
  return lines.join('\n');
}
