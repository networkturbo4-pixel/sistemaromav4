import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width: number, height: number, getPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rowLength = 1 + width * 4; // 1 filter byte (0) + 4 bytes per pixel (RGBA)
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // Bit depth: 8
  ihdr.writeUInt8(6, 9); // Color type: RGBA
  ihdr.writeUInt8(0, 10); // Compression: Deflate
  ihdr.writeUInt8(0, 11); // Filter: Standard
  ihdr.writeUInt8(0, 12); // Interlace: None
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + length);
  const crc = zlib.crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Generate ROMA square icon (192x192 & 512x512)
function renderRomaIcon(size: number): Buffer {
  return createPng(size, size, (x, y) => {
    // Normalize coordinates to 0..100
    const nx = (x / size) * 100;
    const ny = (y / size) * 100;

    // Rounded rectangle background (radius 25%)
    const margin = 4;
    const radius = 22;
    const innerW = 100 - margin * 2;
    const innerH = 100 - margin * 2;

    const dx = Math.max(margin + radius - nx, 0, nx - (100 - margin - radius));
    const dy = Math.max(margin + radius - ny, 0, ny - (100 - margin - radius));
    const isOutside = Math.sqrt(dx * dx + dy * dy) > radius;

    if (isOutside) {
      return [0, 0, 0, 0]; // Transparent
    }

    // Gradient background: Violet to Indigo (#7c3aed to #4338ca)
    const t = (nx + ny) / 200;
    let bgR = Math.round(124 * (1 - t) + 67 * t);
    let bgG = Math.round(58 * (1 - t) + 56 * t);
    let bgB = Math.round(237 * (1 - t) + 202 * t);

    // Letter 'R' and accent dot
    // Stem of R: nx between 28 and 38, ny between 26 and 74
    const inStem = nx >= 30 && nx <= 39 && ny >= 26 && ny <= 74;

    // Top loop of R:
    // Outer arc center (46, 38), radius ~16
    // Inner cutout center (46, 38), radius ~7
    const loopDx = nx - 46;
    const loopDy = ny - 38;
    const loopDist = Math.sqrt(loopDx * loopDx + loopDy * loopDy);
    const inLoop = nx >= 35 && loopDist <= 14 && loopDist >= 6 && nx <= 60;
    const inTopBar = nx >= 35 && nx <= 48 && ny >= 26 && ny <= 33;
    const inMidBar = nx >= 35 && nx <= 48 && ny >= 43 && ny <= 50;

    // Diagonal leg of R:
    const inLeg = nx >= 42 && nx <= 64 && ny >= 47 && ny <= 74 && Math.abs(ny - (47 + (nx - 42) * 1.25)) <= 5.5;

    // Pink accent dot top right: center (68, 28), radius 7
    const dotDx = nx - 68;
    const dotDy = ny - 28;
    const inDot = Math.sqrt(dotDx * dotDx + dotDy * dotDy) <= 7.5;

    if (inDot) {
      return [244, 114, 182, 255]; // Pink #f472b6
    }

    if (inStem || inLoop || inTopBar || inMidBar || inLeg) {
      return [255, 255, 255, 255]; // White
    }

    return [bgR, bgG, bgB, 255];
  });
}

// Generate Open Graph preview image (1200x630)
function renderOgBanner(): Buffer {
  const w = 1200;
  const h = 630;
  return createPng(w, h, (x, y) => {
    // Deep dark obsidian background #090d16 with rich purple glow on top left and cyan glow on bottom right
    const dLeft = Math.sqrt(x * x + y * y);
    const dRight = Math.sqrt((w - x) * (w - x) + (h - y) * (h - y));

    // Base color: #0b0f19
    let r = 11;
    let g = 15;
    let b = 25;

    // Purple glow top-left
    if (dLeft < 800) {
      const factor = (1 - dLeft / 800) * 0.45;
      r += Math.round(124 * factor);
      g += Math.round(58 * factor);
      b += Math.round(237 * factor);
    }

    // Cyan glow bottom-right
    if (dRight < 700) {
      const factor = (1 - dRight / 700) * 0.35;
      r += Math.round(6 * factor);
      g += Math.round(182 * factor);
      b += Math.round(212 * factor);
    }

    // Central card container (x: 120 to 1080, y: 80 to 550)
    if (x >= 120 && x <= 1080 && y >= 80 && y <= 550) {
      // Rounded border check (radius 24)
      const cx = Math.max(120 + 24 - x, 0, x - (1080 - 24));
      const cy = Math.max(80 + 24 - y, 0, y - (550 - 24));
      if (Math.sqrt(cx * cx + cy * cy) <= 24) {
        // Border highlight
        const isBorder = x <= 122 || x >= 1078 || y <= 82 || y >= 548;
        if (isBorder) {
          return [147, 51, 234, 200]; // Purple border
        }
        // Inner card: #111827 / slate-900
        r = Math.round(r * 0.3 + 17 * 0.7);
        g = Math.round(g * 0.3 + 24 * 0.7);
        b = Math.round(b * 0.3 + 39 * 0.7);

        // Card icon on the left (x: 180 to 300, y: 180 to 300)
        if (x >= 180 && x <= 300 && y >= 250 && y <= 370) {
          const iconSize = 120;
          const ix = x - 180;
          const iy = y - 250;
          const inx = (ix / iconSize) * 100;
          const iny = (iy / iconSize) * 100;
          const idist = Math.sqrt(
            Math.max(16 - inx, 0, inx - 84) ** 2 + Math.max(16 - iny, 0, iny - 84) ** 2
          );
          if (idist <= 16) {
            // Icon content
            const inStem = inx >= 30 && inx <= 40 && iny >= 26 && iny <= 74;
            const ldist = Math.sqrt((inx - 48) ** 2 + (iny - 38) ** 2);
            const inLoop = inx >= 35 && ldist <= 15 && ldist >= 6 && inx <= 63;
            const inLeg = inx >= 44 && inx <= 66 && iny >= 47 && iny <= 74 && Math.abs(iny - (47 + (inx - 44) * 1.25)) <= 5.5;
            const inDot = Math.sqrt((inx - 70) ** 2 + (iny - 28) ** 2) <= 7;
            if (inDot) return [244, 114, 182, 255];
            if (inStem || inLoop || inLeg) return [255, 255, 255, 255];
            return [124, 58, 237, 255];
          }
        }
      }
    }

    return [Math.min(255, r), Math.min(255, g), Math.min(255, b), 255];
  });
}

const publicDir = path.resolve(process.cwd(), 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), renderRomaIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), renderRomaIcon(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderRomaIcon(180));
fs.writeFileSync(path.join(publicDir, 'og-preview.png'), renderOgBanner());

console.log('PNG Icons and OG Banner generated successfully in public/');
