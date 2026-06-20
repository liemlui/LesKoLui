// Generate PWA icons as proper PNG files (Node.js built-in only)
// Run: node scripts/generate-icons.mjs

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { deflateSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public");

// Minimal PNG generator for a solid-color rounded square with text
function createPNG(width, height, r, g, b) {
  // Create raw pixel data (RGBA)
  const stride = width * 4;
  const raw = new Uint8Array(height * stride);
  
  // Draw rounded rectangle (simple approximation)
  const radius = Math.floor(width * 0.2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * stride + x * 4;
      
      // Check if pixel is inside the rounded rect
      const dx = x < radius ? radius - x : x > width - radius - 1 ? x - (width - radius - 1) : 0;
      const dy = y < radius ? radius - y : y > height - radius - 1 ? y - (height - radius - 1) : 0;
      
      if (dx * dx + dy * dy > radius * radius) {
        // Outside corner - transparent
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
      } else {
        // Inside - blue color (#3f7fd0)
        raw[idx] = r;
        raw[idx + 1] = g;
        raw[idx + 2] = b;
        raw[idx + 3] = 255;
      }
    }
  }
  
  return raw;
}

function writePNG(filePath, width, height, rawData) {
  // PNG chunks
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  // Prepare raw data with filter bytes (0 = None per row)
  const filtered = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0; // filter byte
    filtered.set(rawData.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  
  // Compress the filtered data
  const compressed = deflateSync(filtered);
  
  // IDAT chunk
  const idatData = compressed;
  
  // IEND chunk
  const iendData = new Uint8Array(0);
  
  const chunks = [
    { type: "IHDR", data: ihdrData },
    { type: "IDAT", data: idatData },
    { type: "IEND", data: iendData },
  ];
  
  const uint8arrays = [signature];
  for (const chunk of chunks) {
    const typeBytes = new TextEncoder().encode(chunk.type);
    const lenBytes = new Uint8Array(4);
    new DataView(lenBytes.buffer).setUint32(0, chunk.data.length);
    
    const crcData = new Uint8Array(typeBytes.length + chunk.data.length);
    crcData.set(typeBytes, 0);
    crcData.set(chunk.data, typeBytes.length);
    const crc = crc32(crcData);
    const crcBytes = new Uint8Array(4);
    new DataView(crcBytes.buffer).setUint32(0, crc);
    
    uint8arrays.push(lenBytes, typeBytes, chunk.data, crcBytes);
  }
  
  const totalLen = uint8arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of uint8arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  
  writeFileSync(filePath, result);
  console.log(`Created ${filePath} (${width}x${height})`);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const blueR = 63, blueG = 127, blueB = 208;  // #3f7fd0

const data192 = createPNG(192, 192, blueR, blueG, blueB);
writePNG(resolve(outDir, "icon-192.png"), 192, 192, data192);

const data512 = createPNG(512, 512, blueR, blueG, blueB);
writePNG(resolve(outDir, "icon-512.png"), 512, 512, data512);

console.log("Done! PWA icons generated.");
