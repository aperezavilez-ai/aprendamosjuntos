import sharp from 'sharp'
import { mkdir, copyFile } from 'fs/promises'
import path from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const src = path.join(process.cwd(), 'public', 'brand', 'logo.png')
const outDir = path.join(process.cwd(), 'public', 'icons')
const appDir = path.join(process.cwd(), 'src', 'app')

await mkdir(outDir, { recursive: true })

async function renderSquareIcon(size) {
  const padding = Math.round(size * 0.1)
  const maxInner = size - padding * 2
  const logoBuffer = await sharp(src)
    .resize(maxInner, maxInner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const meta = await sharp(logoBuffer).metadata()
  const left = Math.round((size - (meta.width || size)) / 2)
  const top = Math.round((size - (meta.height || size)) / 2)

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toBuffer()
}

for (const size of sizes) {
  const buf = await renderSquareIcon(size)
  await sharp(buf).toFile(path.join(outDir, `icon-${size}.png`))
}

const apple = await renderSquareIcon(180)
await sharp(apple).toFile(path.join(outDir, 'apple-touch-icon.png'))

const fav32 = await renderSquareIcon(32)
await sharp(fav32).toFile(path.join(outDir, 'icon-32.png'))

const appIcon = await renderSquareIcon(512)
await sharp(appIcon).toFile(path.join(appDir, 'icon.png'))

console.log('Icons generated from public/brand/logo.png')
