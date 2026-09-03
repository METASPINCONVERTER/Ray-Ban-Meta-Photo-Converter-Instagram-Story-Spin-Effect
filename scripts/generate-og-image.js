import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG writer in pure Node using built-in zlib
function createPNG(width, height, getPixel) {
  const bytesPerPixel = 4; // RGBA
  const rowSize = 1 + width * bytesPerPixel; // 1 byte filter per line
  const rawData = Buffer.alloc(height * rowSize);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // Precomputed CRC table
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return c ^ -1;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const width = 1200;
const height = 630;

console.log(`Generating ${width}x${height} Open Graph image...`);

const pngBuffer = createPNG(width, height, (x, y) => {
  // Sophisticated dark card with red accent gradient & border
  const margin = 24;
  const isBorder = x < margin || x >= width - margin || y < margin || y >= height - margin;
  if (isBorder) {
    return [23, 23, 23, 255]; // #171717
  }

  // Inner canvas with smooth top-left to bottom-right gradient (#1C1C1C to #121212)
  const normX = x / width;
  const normY = y / height;
  
  // Header accent bar at the top
  if (y >= margin && y < margin + 12) {
    return [251, 0, 0, 255]; // #FB0000 Signature Red
  }

  // Subtle circular spotlight in center-right
  const dx = x - 900;
  const dy = y - 315;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const glow = Math.max(0, 1 - dist / 380);

  const baseR = Math.floor(24 + 18 * glow + 10 * normY);
  const baseG = Math.floor(24 + 4 * glow);
  const baseB = Math.floor(26 + 4 * glow);

  return [baseR, baseG, baseB, 255];
});

fs.mkdirSync('./public/assets', { recursive: true });
fs.mkdirSync('./assets', { recursive: true });

fs.writeFileSync('./public/assets/og-image.png', pngBuffer);
fs.writeFileSync('./assets/og-image.png', pngBuffer);

console.log('Open Graph image successfully generated at public/assets/og-image.png');
