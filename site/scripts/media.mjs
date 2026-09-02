/**
 * Builds every web asset the site needs from two source libraries:
 *
 *   images/personal/        legacy portfolio images
 *   Portfolio Projects/     project media: photos, GIFs, videos, CAD, decks
 *
 * Outputs into site/public/ and writes two manifests consumed by the app.
 * The source libraries are gitignored (~1.4GB, and several files exceed
 * GitHub's 100MB per-file limit) — only these derivatives are committed.
 *
 * Requires: sharp (npm), ffmpeg + sips (system).
 *
 * Run: npm run media
 */
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '../..')
const LEGACY = join(ROOT, 'images/personal')
const PROJECTS = join(ROOT, 'Portfolio Projects')
const OUT = join(here, '../public')
const TMP = join(here, '../.media-tmp')

const IMG_OUT = join(OUT, 'media')
const VID_OUT = join(OUT, 'video')
const MODEL_OUT = join(OUT, 'models')
const DOC_OUT = join(OUT, 'docs')

const WIDTHS = { small: 480, mid: 1000, large: 1800 }

const images = {}
const videos = {}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */
async function convertImage(srcPath, target) {
  const input = sharp(srcPath, { failOn: 'none' }).rotate() // honour EXIF orientation
  const meta = await input.metadata()
  await mkdir(join(IMG_OUT, dirname(target)), { recursive: true })

  const entry = {}
  for (const [role, width] of Object.entries(WIDTHS)) {
    const w = Math.min(width, meta.width ?? width)
    const base = `${target}-${role}`
    await input
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: role === 'small' ? 72 : 80, effort: 5 })
      .toFile(join(IMG_OUT, `${base}.webp`))
    entry[role] = `/media/${base}.webp`
  }

  await input
    .clone()
    .resize({ width: Math.min(WIDTHS.mid, meta.width ?? WIDTHS.mid), withoutEnlargement: true })
    .avif({ quality: 58, effort: 4 })
    .toFile(join(IMG_OUT, `${target}-mid.avif`))
  entry.midAvif = `/media/${target}-mid.avif`

  const tiny = await input.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer()
  entry.lqip = `data:image/webp;base64,${tiny.toString('base64')}`

  // .rotate() may swap dimensions relative to the stored metadata.
  const rotated = await input.clone().toBuffer({ resolveWithObject: true })
  entry.width = rotated.info.width
  entry.height = rotated.info.height
  entry.aspect = +(rotated.info.width / rotated.info.height).toFixed(4)

  images[target] = entry
}

/* ------------------------------------------------------------------ */
/* Video — GIFs become video too; a 34MB GIF is ~1MB as H.264          */
/* ------------------------------------------------------------------ */
async function convertVideo(srcPath, target, { maxHeight = 720, crf = 27, audio = false } = {}) {
  await mkdir(join(VID_OUT, dirname(target)), { recursive: true })
  const mp4 = join(VID_OUT, `${target}.mp4`)
  const poster = `${target}-poster`

  const args = [
    '-y',
    '-i',
    srcPath,
    // -2 keeps dimensions even, which H.264 requires
    '-vf',
    `scale='min(iw,trunc(iw*${maxHeight}/ih/2)*2)':'min(ih,${maxHeight})':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
  ]
  args.push(...(audio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']))
  args.push(mp4)

  await run('ffmpeg', args, { maxBuffer: 1024 * 1024 * 64 })

  // Poster from ~15% in, which avoids black lead-in frames
  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    mp4,
  ])
  const [w, h, duration] = probe.stdout.trim().split('\n')

  await mkdir(TMP, { recursive: true })
  const frame = join(TMP, `${basename(target)}-poster.png`)
  // Very short clips can't be seeked into, so only seek when there's room.
  const seek = Number(duration) > 1 ? Number(duration) * 0.15 : 0
  await run('ffmpeg', [
    '-y',
    ...(seek > 0 ? ['-ss', String(seek)] : []),
    '-i',
    mp4,
    '-frames:v',
    '1',
    frame,
  ])
  await convertImage(frame, poster)

  videos[target] = {
    mp4: `/video/${target}.mp4`,
    poster: images[poster],
    width: Number(w),
    height: Number(h),
    aspect: +(Number(w) / Number(h)).toFixed(4),
    duration: +Number(duration).toFixed(1),
  }
}

/* ------------------------------------------------------------------ */
/* Source map                                                          */
/* ------------------------------------------------------------------ */
const LEGACY_RENAMES = new Map([
  ['Sankaran_Rockwell.jpeg', 'profile/rockwell'],
  ['Deloitte.png', 'logos/deloitte'],
  ['GE.jpg', 'logos/ge'],
  ['RA.jpg', 'logos/rockwell'],
  ['Data_Mine.jpg', 'logos/datamine'],
  ['coupa.jpg', 'logos/coupa'],
  ['richards.jpeg', 'logos/richards'],
  ['PU.jpg', 'logos/purdue'],
  ['UPS_DataMine.png', 'projects/ups'],
  ['JohnDeere_DataMine.png', 'projects/deere'],
  ['UPS_Poster.png', 'projects/ups-poster'],
])

const pad = (n) => String(n).padStart(2, '0')

const projectImages = [
  // Profile & context — the real photographs that make the site credible
  ['Headshot.jpg', 'profile/headshot'],
  ['Walking_Factory_Floor.jpeg', 'profile/factory-floor'],
  ['GE_Standardization_Team.jpeg', 'ge-vernova/team'],

  // RC Car
  ['RC Car/Drivetrain_Photographic.png', 'rc-car/drivetrain'],
  ['RC Car/Axle_Holder.png', 'rc-car/axle-holder'],
  ['RC Car/AxleHolder_Diameter_NonConformance.jpeg', 'rc-car/nonconformance'],
  ['RC Car/Quality_WebApp_Detection.png', 'rc-car/vision-webapp'],
  ['RC Car/RaspberryPi_Camera_Setup.png', 'rc-car/vision-rig'],
  ['RC Car/RaspberryPi_CameraSetup_2.jpg', 'rc-car/vision-rig-2'],
  ['RC Car/Water_Jet.png', 'rc-car/waterjet'],
  ['RC Car/Floor_Simulation_3D_Model.jpeg', 'rc-car/anylogic-3d'],
  ['RC Car/Team.jpeg', 'rc-car/team'],

  // TerraProbe
  ['TerraProbe/TerraProbe Dashboard/TerraProbe_logo.png', 'terraprobe/logo'],

  // Offshore drone
  ['UAV Drone/Example_Drone_Turbine_Inspection.avif', 'offshore-drone/context'],

  // Despite the .gif extension this is a single frame — a screenshot of the
  // AnyLogic model, not an animation.
  ['RC Car/AnyLogic_Model_GIF.gif', 'rc-car/anylogic-model'],

  // NOTE: crude_MES_iPad_Picture.HEIC is skipped — the file decodes to solid
  // black in libheif, ffmpeg and sips, so it appears to be corrupt. Re-export
  // it as JPEG from Photos and add it here as 'ge-vernova/mes-ipad'.
]

const projectVideos = [
  // Short clips — silent, autoplay-loop friendly
  ['TerraProbe/Soil_Sampling_Demo.MOV', 'terraprobe/sampling', { maxHeight: 720, crf: 27 }],
  ['UAV Drone/IMG_9460.MOV', 'offshore-drone/clamp', { maxHeight: 720, crf: 27 }],
  ['UAV Drone/IMG_9462.gif', 'offshore-drone/platform-motion', { maxHeight: 711, crf: 28 }],
  ['UAV Drone/VIDEO-2026-03-14-10-00-35.mp4', 'offshore-drone/test-1', { maxHeight: 478, crf: 28 }],
  ['UAV Drone/VIDEO-2026-03-14-10-00-41.mp4', 'offshore-drone/test-2', { maxHeight: 478, crf: 28 }],

  // Full demos — keep audio, click to play
  [
    'UAV Drone/Full_Platform_Demo.MOV',
    'offshore-drone/full-demo',
    { maxHeight: 720, crf: 28, audio: true },
  ],
  ['TerraProbe/Full_Demo.mov', 'terraprobe/full-demo', { maxHeight: 720, crf: 30, audio: true }],
]

const models = [
  ['RC Car/R4_Assembly v21.glb', 'rc-car-assembly.glb'],
  ['RC Car/Wheels and Drivetrain v4.glb', 'rc-car-drivetrain.glb'],
  ['RC Car/R5_Base_Print.glb', 'rc-car-axle-holder.glb'],
  // 14DD661A.glb is skipped: different bytes, but the same 55-node / 18,988
  // triangle model as R4_Assembly, so it renders identically.
]

const docs = [
  ['RC Car/RC_Car_Simulation_Modeling_Paper.pdf', 'rc-car-simulation-paper.pdf'],
  [
    'John Deere Time Series Analysis/John_Deere_Final_Presentation_Fall2024.pdf',
    'john-deere-final-presentation.pdf',
  ],
  [
    'John Deere Time Series Analysis/TDM2024_Point_Forecasting_Analysis.pdf',
    'john-deere-point-forecasting.pdf',
  ],
  ['ParkVue/parkVue_PitchDeck.pdf', 'parkvue-pitch-deck.pdf'],
  ['TerraProbe/TerraProbe_MotorTest/Electronic Schematic.pdf', 'terraprobe-schematic.pdf'],
]

/* ------------------------------------------------------------------ */
/* Drive                                                               */
/* ------------------------------------------------------------------ */
const only = process.argv[2] // optional: images | video | static

async function pool(items, worker, concurrency = 4) {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const item = queue.shift()
        try {
          await worker(item)
          process.stdout.write('.')
        } catch (err) {
          console.error(`\n  FAILED ${JSON.stringify(item)}\n  ${err.message?.slice(0, 300)}`)
        }
      }
    }),
  )
}

if (!only || only === 'images') {
  // Legacy library
  const legacyFiles = existsSync(LEGACY)
    ? (await readdir(LEGACY)).filter((f) => /\.(png|jpe?g|heic|avif)$/i.test(f))
    : []
  const legacyJobs = []
  for (const file of legacyFiles) {
    let target = LEGACY_RENAMES.get(file)
    if (!target) {
      const tp = file.match(/^TerraProbe_(\d+)\.png$/i)
      const pv = file.match(/^parkvue_(\d+)\.png$/i)
      if (tp) target = `terraprobe/${pad(Number(tp[1]))}`
      else if (pv) target = `parkvue/${pad(Number(pv[1]))}`
    }
    if (target) legacyJobs.push([join(LEGACY, file), target])
  }
  console.log(`\nLegacy images: ${legacyJobs.length}`)
  await pool(legacyJobs, ([src, target]) => convertImage(src, target))

  console.log(`\nProject images: ${projectImages.length}`)
  await pool(projectImages, ([rel, target]) => convertImage(join(PROJECTS, rel), target))
}

if (!only || only === 'video') {
  console.log(`\nVideo: ${projectVideos.length} (transcoding, this takes a while)`)
  await pool(
    projectVideos,
    ([rel, target, opts]) => convertVideo(join(PROJECTS, rel), target, opts),
    2,
  )
}

if (!only || only === 'static') {
  await mkdir(MODEL_OUT, { recursive: true })
  await mkdir(DOC_OUT, { recursive: true })

  console.log(`\nCAD models: ${models.length}`)
  await pool(models, ([rel, name]) => copyFile(join(PROJECTS, rel), join(MODEL_OUT, name)))

  console.log(`\nDocuments: ${docs.length}`)
  await pool(docs, ([rel, name]) => copyFile(join(PROJECTS, rel), join(DOC_OUT, name)))
}

/* Manifests are merged so a partial run doesn't wipe the other half. */
const imgManifestPath = resolve(here, '../src/content/media.generated.json')
const vidManifestPath = resolve(here, '../src/content/video.generated.json')

async function mergeWrite(path, next) {
  let prev = {}
  if (existsSync(path)) {
    prev = JSON.parse(await readFile(path, 'utf8'))
  }
  const merged = { ...prev, ...next }
  await writeFile(path, JSON.stringify(merged, null, 2) + '\n')
  return Object.keys(merged).length
}

const imgCount = Object.keys(images).length ? await mergeWrite(imgManifestPath, images) : 'unchanged'
const vidCount = Object.keys(videos).length ? await mergeWrite(vidManifestPath, videos) : 'unchanged'

await rm(TMP, { recursive: true, force: true })
console.log(`\n\nDone. images: ${imgCount}, videos: ${vidCount}`)
