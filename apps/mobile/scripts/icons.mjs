// Draws the app icons and splash image from the brand mark of the web app.
// Usage: pnpm --filter mobile icons
import { Buffer } from "node:buffer"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const markFile = new URL(
  "../../web/public/brand/bible-plan-mark.svg",
  import.meta.url
)
const out = (name) =>
  fileURLToPath(new URL(`../assets/images/${name}`, import.meta.url))

const night = "#10284a"
const gold = "#f2b441"

const mark = await readFile(markFile, "utf8")
const path = /<path[^>]*\/>/.exec(mark)[0]
const viewBox = /viewBox="([^"]+)"/.exec(mark)[1]

/** A square of `size` px with the mark centred at `scale` of its width. */
function svg(size, { scale, color = gold, background }) {
  const width = size * scale
  const offset = (size - width) / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      (background
        ? `<rect width="${size}" height="${size}" fill="${background}"/>`
        : "") +
      `<svg x="${offset}" y="${offset}" width="${width}" height="${width}" viewBox="${viewBox}">` +
      path.replace(`fill="${gold}"`, `fill="${color}"`) +
      `</svg></svg>`
  )
}

const images = {
  // iOS and the stores mask the corners themselves.
  "icon.png": svg(1024, { scale: 0.64, background: night }),
  // Android keeps the inner 66% of adaptive icons visible.
  "android-icon-foreground.png": svg(1024, { scale: 0.46 }),
  "android-icon-background.png": svg(1024, { scale: 0, background: night }),
  "android-icon-monochrome.png": svg(1024, { scale: 0.46, color: "#ffffff" }),
  "splash-icon.png": svg(512, { scale: 1 }),
  "favicon.png": svg(48, { scale: 0.8, background: night }),
}

for (const [name, image] of Object.entries(images)) {
  await sharp(image).png().toFile(out(name))
  console.log(name)
}
