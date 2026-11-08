// Generates the PWA / apple-touch icons into public/ using only Node built-ins.
// Run with `npm run icons`. The output PNGs are committed.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0, 0, 0]
const FG = [10, 132, 255] // iOS system blue (dark)

// Dumbbell in a 100×100 design space: [x, y, w, h, radius]
const SHAPES = [
  [22, 47, 56, 6, 2], // bar
  [24, 30, 8, 40, 3], // inner plates
  [68, 30, 8, 40, 3],
  [14, 37, 8, 26, 3], // outer plates
  [78, 37, 8, 26, 3],
]

function inRoundRect(px, py, [x, y, w, h, r]) {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

/** scale: fraction of the canvas the 100-unit design occupies (smaller for maskable safe zone). */
function render(size, scale) {
  const SS = 4 // supersampling for anti-aliasing
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const offset = (100 - 100 / scale) / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * (100 / scale) + offset
          const v = ((y + (sy + 0.5) / SS) / size) * (100 / scale) + offset
          if (SHAPES.some((s) => inRoundRect(u, v, s))) hits++
        }
      const a = hits / (SS * SS)
      const i = y * (size * 3 + 1) + 1 + x * 3
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(BG[c] * (1 - a) + FG[c] * a)
    }
  }
  return png(size, size, raw)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB, no alpha (iOS fills transparency with black anyway)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = (name, buf) => writeFileSync(new URL(`../public/${name}`, import.meta.url), buf)
out('apple-touch-icon.png', render(180, 0.9))
out('pwa-192x192.png', render(192, 0.9))
out('pwa-512x512.png', render(512, 0.9))
out('maskable-512x512.png', render(512, 0.72)) // keep the mark inside the 80% safe zone

const rects = SHAPES.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`).join('')
out(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#000"/><g fill="#0a84ff">${rects}</g></svg>\n`,
)
console.log('icons written to public/')
