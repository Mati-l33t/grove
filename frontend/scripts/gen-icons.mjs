import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const svg = Buffer.from(`
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#18181b"/>
  <circle cx="256" cy="256" r="180" fill="#22c55e"/>
  <text x="256" y="330" font-family="Georgia, serif" font-size="220" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="auto">G</text>
</svg>
`)

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png')

// Maskable: same design but the important content fits in the 80% safe zone
const maskable = Buffer.from(`
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#18181b"/>
  <circle cx="256" cy="256" r="144" fill="#22c55e"/>
  <text x="256" y="318" font-family="Georgia, serif" font-size="176" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="auto">G</text>
</svg>
`)
await sharp(maskable).resize(512, 512).png().toFile('public/icons/icon-maskable.png')

console.log('Icons generated in public/icons/')
