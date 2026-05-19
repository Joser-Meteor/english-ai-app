// Generate PWA icons: rounded-rect with gradient + "EN" text
import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

// --- Shape helpers (all coords in 0..1) ---

function roundedRectMask(nx, ny, radius) {
  // Inside the rect
  if (nx >= radius && nx <= 1 - radius) return 1
  if (ny >= radius && ny <= 1 - radius) return 1

  // Four corners: check distance from corner center
  let cx, cy
  if (nx < radius && ny < radius)          { cx = radius;       cy = radius }
  else if (nx > 1 - radius && ny < radius) { cx = 1 - radius;   cy = radius }
  else if (nx < radius && ny > 1 - radius) { cx = radius;       cy = 1 - radius }
  else if (nx > 1 - radius && ny > 1 - radius) { cx = 1 - radius; cy = 1 - radius }
  else return 1 // edge region, not a corner

  const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2)
  if (dist <= radius) return 1
  // 1-pixel anti-alias
  const aa = clamp((radius + 1 / 192) - dist, 0, 1)
  return aa
}

function rectOverlap(nx, ny, l, r, t, b) {
  return nx >= l && nx <= r && ny >= t && ny <= b ? 1 : 0
}

function diagonalOverlap(nx, ny, x1, y1, x2, y2, halfThick) {
  // Distance from point to line segment
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = ((nx - x1) * dx + (ny - y1) * dy) / len2
  t = clamp(t, 0, 1)
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2)
  if (dist <= halfThick) return 1
  // anti-alias
  const aa = clamp((halfThick + 0.005) - dist, 0, 1)
  return aa
}

function isOnText(nx, ny) {
  const thick = 0.06
  const halfT = thick / 2

  // Letter E: vertical stem + 3 horizontal bars
  let e = 0
  e = Math.max(e, rectOverlap(nx, ny, 0.20, 0.26, 0.22, 0.78))        // stem
  e = Math.max(e, rectOverlap(nx, ny, 0.20, 0.58, 0.22, 0.22 + thick)) // top bar
  e = Math.max(e, rectOverlap(nx, ny, 0.20, 0.52, 0.48 - halfT, 0.48 + halfT)) // mid bar
  e = Math.max(e, rectOverlap(nx, ny, 0.20, 0.58, 0.78 - thick, 0.78)) // bottom bar

  // Letter N: 2 stems + diagonal
  let n = 0
  n = Math.max(n, rectOverlap(nx, ny, 0.62, 0.62 + thick, 0.22, 0.78)) // left stem
  n = Math.max(n, rectOverlap(nx, ny, 0.82, 0.82 + thick, 0.22, 0.78)) // right stem
  n = Math.max(n, diagonalOverlap(nx, ny, 0.62, 0.22, 0.82 + thick, 0.78, halfT)) // diagonal

  return Math.max(e, n)
}

function createPNG(size) {
  // RGBA pixels
  const raw = Buffer.alloc(size * (1 + size * 4))

  for (let y = 0; y < size; y++) {
    const rowOff = y * (1 + size * 4)
    raw[rowOff] = 0 // filter byte: none

    for (let x = 0; x < size; x++) {
      const px = rowOff + 1 + x * 4
      const nx = x / size
      const ny = y / size

      // Rounded rect alpha mask
      const alpha = roundedRectMask(nx, ny, 0.2)

      // Gradient: #6366f1 (top) → #4f46e5 (bottom)
      const r = lerp(99, 79, ny)
      const g = lerp(102, 70, ny)
      const b = lerp(241, 229, ny)

      const isText = isOnText(nx, ny)

      raw[px]     = isText ? 255 : r
      raw[px + 1] = isText ? 255 : g
      raw[px + 2] = isText ? 255 : b
      raw[px + 3] = Math.round(255 * alpha)
    }
  }

  return raw
}

// --- PNG encoding ---

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeB = Buffer.from(type)
  const crc = crc32(Buffer.concat([typeB, data]))
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeB, data, crcBuf])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodePNG(width, height, raw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const compressed = deflateSync(raw)
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ])
}

// --- Main ---

const sizes = [
  { file: 'public/pwa-192x192.png', s: 192 },
  { file: 'public/pwa-512x512.png', s: 512 },
]

for (const { file, s } of sizes) {
  const raw = createPNG(s)
  writeFileSync(file, encodePNG(s, s, raw))
  console.log(`Created ${file} (${s}x${s})`)
}
