/**
 * Converts the legacy images/personal/ library (~52 MB of PNG/JPEG) into
 * responsive WebP + AVIF under site/public/media/.
 *
 * Run: npm run media
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '../../images/personal')
const OUT = resolve(here, '../public/media')

/** Output widths per role. Small = grid thumb, mid = card, large = lightbox. */
const WIDTHS = { small: 480, mid: 1000, large: 1800 }

const RENAMES = new Map([
  ['Iyer_Sankaran.png', 'profile/portrait'],
  ['Sankaran_Rockwell.jpeg', 'profile/rockwell'],
  ['timeline.png', 'misc/timeline'],
  ['Deloitte.png', 'logos/deloitte'],
  ['GE.jpg', 'logos/ge'],
  ['RA.jpg', 'logos/rockwell'],
  ['Data_Mine.jpg', 'logos/datamine'],
  ['coupa.jpg', 'logos/coupa'],
  ['richards.jpeg', 'logos/richards'],
  ['PU.jpg', 'logos/purdue'],
  ['UPS_DataMine.png', 'projects/ups'],
  ['GE_DS.png', 'projects/ge-ds'],
  ['GE_SC.png', 'projects/ge-sc'],
  ['JohnDeere_DataMine.png', 'projects/deere'],
  ['UPS_Poster.png', 'projects/ups-poster'],
])

const pad = (n) => String(n).padStart(2, '0')

function targetFor(file) {
  if (RENAMES.has(file)) return RENAMES.get(file)

  let m = file.match(/^TerraProbe_(\d+)\.png$/i)
  if (m) return `terraprobe/${pad(Number(m[1]))}`

  m = file.match(/^parkvue_(\d+)\.png$/i)
  if (m) return `parkvue/${pad(Number(m[1]))}`

  return null
}

const manifest = {}

async function convert(file) {
  const target = targetFor(file)
  if (!target) {
    console.warn(`  skip (unmapped): ${file}`)
    return
  }

  const input = sharp(join(SRC, file), { failOn: 'none' })
  const meta = await input.metadata()
  await mkdir(join(OUT, dirname(target)), { recursive: true })

  const sources = {}
  for (const [role, width] of Object.entries(WIDTHS)) {
    // Never upscale past the source resolution.
    const w = Math.min(width, meta.width ?? width)
    const base = `${target}-${role}`

    await input
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: role === 'small' ? 72 : 80, effort: 5 })
      .toFile(join(OUT, `${base}.webp`))

    sources[role] = `/media/${base}.webp`
  }

  // AVIF at card size only — best size/effort tradeoff for a library this big.
  await input
    .clone()
    .resize({ width: Math.min(WIDTHS.mid, meta.width ?? WIDTHS.mid), withoutEnlargement: true })
    .avif({ quality: 58, effort: 4 })
    .toFile(join(OUT, `${target}-mid.avif`))
  sources.midAvif = `/media/${target}-mid.avif`

  // 16px LQIP, inlined as a data URI for instant blur-up placeholders.
  const tiny = await input.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer()

  manifest[target] = {
    ...sources,
    lqip: `data:image/webp;base64,${tiny.toString('base64')}`,
    width: meta.width ?? null,
    height: meta.height ?? null,
    aspect: meta.width && meta.height ? +(meta.width / meta.height).toFixed(4) : null,
  }
}

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
console.log(`Converting ${files.length} images from ${SRC}`)

// Modest concurrency keeps memory sane on the larger PNGs.
const queue = [...files]
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const f = queue.shift()
      await convert(f)
      process.stdout.write('.')
    }
  }),
)

await writeFile(
  resolve(here, '../src/content/media.generated.json'),
  JSON.stringify(manifest, null, 2) + '\n',
)

console.log(`\nDone. ${Object.keys(manifest).length} images -> ${OUT}`)
