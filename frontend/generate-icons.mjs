import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICONS = path.join(__dirname, 'public/icons')

const leafSVG = (size) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>`
)

async function makeIcon(filename, canvas, leafSize) {
  const offset = Math.round((canvas - leafSize) / 2)
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: '#09090b' } })
    .composite([{ input: leafSVG(leafSize), top: offset, left: offset }])
    .png()
    .toFile(path.join(ICONS, filename))
  console.log(`✓ ${filename}`)
}

await makeIcon('icon-192.png',   192, 128)
await makeIcon('icon-512.png',   512, 340)
await makeIcon('icon-maskable.png', 512, 260)
console.log('Done.')
