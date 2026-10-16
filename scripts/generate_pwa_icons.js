const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create crisp, high-res SVG Icon
function getSvgIcon(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.05;
  const contentSize = size - padding * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : size * 0.22}" fill="url(#bgGrad)"/>
  
  <!-- Outer Glow Ring -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.42}" stroke="url(#primaryGrad)" stroke-width="${size * 0.015}" stroke-dasharray="${size * 0.04} ${size * 0.02}" opacity="0.6"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.38}" stroke="url(#goldGrad)" stroke-width="${size * 0.008}" opacity="0.4"/>

  <!-- Center Hexagon / Shield -->
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(0.6)">
    <!-- Monitor Base & Screen -->
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.52}" rx="${size * 0.06}" fill="#1e293b" stroke="url(#primaryGrad)" stroke-width="${size * 0.025}" filter="url(#glow)"/>
    
    <!-- Screen Inner -->
    <rect x="${size * 0.14}" y="${size * 0.14}" width="${size * 0.72}" height="${size * 0.44}" rx="${size * 0.04}" fill="#0f172a"/>
    
    <!-- Sound Waves / Spreadsheet grid simulation -->
    <line x1="${size * 0.22}" y1="${size * 0.36}" x2="${size * 0.22}" y2="${size * 0.24}" stroke="#10b981" stroke-width="${size * 0.025}" stroke-linecap="round"/>
    <line x1="${size * 0.30}" y1="${size * 0.42}" x2="${size * 0.30}" y2="${size * 0.18}" stroke="#38bdf8" stroke-width="${size * 0.025}" stroke-linecap="round"/>
    <line x1="${size * 0.38}" y1="${size * 0.48}" x2="${size * 0.38}" y2="${size * 0.28}" stroke="#6366f1" stroke-width="${size * 0.025}" stroke-linecap="round"/>
    <line x1="${size * 0.46}" y1="${size * 0.40}" x2="${size * 0.46}" y2="${size * 0.20}" stroke="#a855f7" stroke-width="${size * 0.025}" stroke-linecap="round"/>
    
    <!-- Bold 'G' Logo on Right Screen -->
    <path d="M ${size * 0.72} ${size * 0.24} 
             A ${size * 0.12} ${size * 0.12} 0 1 0 ${size * 0.72} ${size * 0.44} 
             L ${size * 0.72} ${size * 0.34} 
             L ${size * 0.62} ${size * 0.34}" 
          fill="none" stroke="url(#goldGrad)" stroke-width="${size * 0.03}" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Monitor Stand -->
    <polygon points="${size * 0.42},${size * 0.62} ${size * 0.58},${size * 0.62} ${size * 0.64},${size * 0.78} ${size * 0.36},${size * 0.78}" fill="#334155"/>
    <rect x="${size * 0.28}" y="${size * 0.76}" width="${size * 0.44}" height="${size * 0.05}" rx="${size * 0.02}" fill="url(#primaryGrad)"/>
    
    <!-- Laurel Leaves (Bottom Left & Right) -->
    <path d="M ${size * 0.12} ${size * 0.78} C ${size * 0.18} ${size * 0.90}, ${size * 0.36} ${size * 0.92}, ${size * 0.5} ${size * 0.92}" fill="none" stroke="url(#goldGrad)" stroke-width="${size * 0.015}" stroke-linecap="round"/>
    <path d="M ${size * 0.88} ${size * 0.78} C ${size * 0.82} ${size * 0.90}, ${size * 0.64} ${size * 0.92}, ${size * 0.5} ${size * 0.92}" fill="none" stroke="url(#goldGrad)" stroke-width="${size * 0.015}" stroke-linecap="round"/>
  </g>

  <!-- Typography Badge -->
  <text x="50%" y="${size * 0.87}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${size * 0.065}" fill="#ffffff" text-anchor="middle" letter-spacing="${size * 0.005}">G-MONITOR</text>
  <text x="50%" y="${size * 0.93}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size * 0.038}" fill="#eab308" text-anchor="middle" letter-spacing="${size * 0.008}">DISKOPERINDAG BANYUASIN</text>
</svg>`;
}

// 2. Minimalist pure Node.js PNG builder
function createPngIcon(size, isMaskable = false) {
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.48;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter: none
    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 15, g = 23, b = 42, a = 255; // Background #0f172a

      if (!isMaskable && dist > radius) {
        a = 0; // Transparent corners
      } else {
        // Subtle vertical gradient
        const factor = y / size;
        r = Math.round(30 * (1 - factor) + 15 * factor);
        g = Math.round(27 * (1 - factor) + 23 * factor);
        b = Math.round(75 * (1 - factor) + 42 * factor);

        // Center emblem simulation
        if (dist < size * 0.35) {
          const innerDist = Math.abs(dist - size * 0.28);
          if (innerDist < size * 0.02) {
            // Gold Ring
            r = 234; g = 179; b = 8;
          } else if (dist < size * 0.25) {
            // Indigo core
            r = 99; g = 102; b = 241;
            // Draw crossbars
            if (Math.abs(dx) < size * 0.08 || Math.abs(dy) < size * 0.08) {
              r = 56; g = 189; b = 248; // Cyan
            }
          }
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate files
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), getSvgIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), getSvgIcon(512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), getSvgIcon(512, true));

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPngIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPngIcon(512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPngIcon(512, true));

console.log('✅ PWA Icons generated in:', iconsDir);
