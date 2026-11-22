// Renders the two Plotter Tide scenes from the vendored official source into media/.
// Needs Node 22.18+ (runs the .ts file directly with built-in type stripping). No npm packages.
//   node scripts/build-scenes.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { plotterTideSvg, plotterTideNightSvg } from '../vendor/theme-examples/plotter-tide.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const media = join(root, 'media')
mkdirSync(media, { recursive: true })

for (const [name, build] of [['plotter-tide-day.svg', plotterTideSvg], ['plotter-tide-night.svg', plotterTideNightSvg]]) {
  const svg = build()
  writeFileSync(join(media, name), svg)
  console.log(`media/${name}  ${(svg.length / 1024).toFixed(1)} KB`)
}
