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
async function convertImage(srcPath, target, { trim = false, widths = WIDTHS } = {}) {
  let input = sharp(srcPath, { failOn: 'none' }).rotate() // honour EXIF orientation
  // Logos ship with wildly different amounts of built-in padding, which makes
  // them impossible to align on a grid. Cropping to the ink lets the layout
  // control the spacing instead.
  if (trim) input = sharp(await input.trim().toBuffer())
  const meta = await input.metadata()
  await mkdir(join(IMG_OUT, dirname(target)), { recursive: true })

  const entry = {}
  for (const [role, width] of Object.entries(widths)) {
    const w = Math.min(width, meta.width ?? width)
    const base = `${target}-${role}`
    await input
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: role === 'small' ? 72 : 80, effort: 5 })
      .toFile(join(IMG_OUT, `${base}.webp`))
    entry[role] = `/media/${base}.webp`
  }

  const midWidth = widths.mid ?? WIDTHS.mid
  await input
    .clone()
    .resize({ width: Math.min(midWidth, meta.width ?? midWidth), withoutEnlargement: true })
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

/**
 * iPhone HEICs only decode through `sips`, and only when it runs outside a
 * sandbox — libheif rejects the `heix` brand these files use. They are
 * pre-converted to full-resolution JPEG siblings by:
 *
 *   find "Portfolio Projects" -iname '*.HEIC' ! -name '._*' \
 *     -exec sh -c 'sips -s format jpeg -s formatOptions 95 "$1" \
 *     --out "${1%.*}.jpg"' _ {} \;
 *
 * so this pipeline stays sharp-only.
 */
const projectImages = [
  // Profile & context — the real photographs that make the site credible
  ['Headshot.jpg', 'profile/headshot'],
  ['Walking_Factory_Floor.jpeg', 'profile/factory-floor'],
  ['GE_Standardization_Team.jpeg', 'ge-vernova/team'],

  // Landing carousel, ordered as a career arc: shop floor -> digital thread
  // -> FrED -> capstone -> automation.
  ['Carousel Pictures/Walking_Factory_Floor.jpeg', 'carousel/01-floor'],
  ['crude_MES_iPad_Picture.jpg', 'carousel/02-mes'],
  ['Carousel Pictures/13451140-3648-42B1-B94C-D97B8F082A45_1_105_c.jpeg', 'carousel/03-fred-poster'],
  ['Carousel Pictures/IMG_9314.jpg', 'carousel/04-fred-summit'],
  ['Carousel Pictures/IMG_0553.jpg', 'carousel/05-capstone'],
  ['Carousel Pictures/Sankaran_Rockwell.jpeg', 'carousel/06-rockwell'],

  // The MES tablet in situ at station BC5 — the single best piece of evidence
  // that the digital thread shipped to a real floor.
  ['crude_MES_iPad_Picture.jpg', 'ge-vernova/mes-ipad'],

  // RC Car
  ['RC Car/RC_Car_Pic.avif', 'rc-car/pic'],
  ['RC Car/Drivetrain_Photographic.png', 'rc-car/drivetrain'],
  ['RC Car/Axle_Holder.png', 'rc-car/axle-holder'],
  ['RC Car/AxleHolder_Diameter_NonConformance.jpeg', 'rc-car/nonconformance'],
  ['RC Car/Quality_WebApp_Detection.png', 'rc-car/vision-webapp'],
  ['RC Car/RaspberryPi_Camera_Setup.png', 'rc-car/vision-rig'],
  ['RC Car/RaspberryPi_CameraSetup_2.jpg', 'rc-car/vision-rig-2'],
  ['RC Car/Water_Jet.png', 'rc-car/waterjet'],
  ['RC Car/Floor_Simulation_3D_Model.jpeg', 'rc-car/anylogic-3d'],
  ['RC Car/Simulation_Subassemblies.png', 'rc-car/sim-subassemblies'],
  ['RC Car/Simulation_Interpretation.png', 'rc-car/sim-interpretation'],
  ['RC Car/Simulation_results.png', 'rc-car/sim-results'],
  ['RC Car/Team.jpeg', 'rc-car/team'],
  ['RC Car/SPC_PHOTO.png', 'rc-car/spc-batch'],
  ['RC Car/SPC_Photo_Measurement.jpg', 'rc-car/spc-vision'],
  ['RC Car/SPC_Parameters.png', 'rc-car/spc-parameters'],
  ['RC Car/SPC_Problem_Definition.png', 'rc-car/spc-problem'],
  ['RC Car/SPC_Process_Control_Charts.png', 'rc-car/spc-xbar'],
  ['RC Car/SPC_Process_Values.png', 'rc-car/spc-distribution'],
  ['RC Car/SPC_Design_Specification_Limits.png', 'rc-car/spc-spec'],

  // TerraProbe
  ['TerraProbe/TerraProbe Dashboard/TerraProbe_logo.png', 'terraprobe/logo'],

  // Offshore drone
  ['UAV Drone/Example_Drone_Turbine_Inspection.avif', 'offshore-drone/context'],

  // Roll-to-roll — figures pulled from the 2.C51 analysis deck
  ['Roll_to_Roll_Mfg_Analysis/Process_Line.png', 'r2r/process'],
  ['Roll_to_Roll_Mfg_Analysis/Modeling_Methodology.png', 'r2r/methodology'],
  ['Roll_to_Roll_Mfg_Analysis/Web_Position_EDA.png', 'r2r/web-position'],
  ['Roll_to_Roll_Mfg_Analysis/Transport_Delays.png', 'r2r/delays'],
  ['Roll_to_Roll_Mfg_Analysis/Physics_Model_Fit.png', 'r2r/model-fit'],
  ['Roll_to_Roll_Mfg_Analysis/Film_On_Rollers.jpeg', 'r2r/film-rollers'],

  // Truck freight — figures from the SCM.C51 EDA and modeling decks
  ['Truck Freight Analysis/Market_Behavior.png', 'freight/market'],
  ['Truck Freight Analysis/Seasonality.png', 'freight/seasonality'],
  ['Truck Freight Analysis/LightGBM_Lanes.png', 'freight/lightgbm'],
  ['Truck Freight Analysis/Model_Comparison.png', 'freight/comparison'],

  // Despite the .gif extension this is a single frame — a screenshot of the
  // AnyLogic model, not an animation.
  ['RC Car/AnyLogic_Model_GIF.gif', 'rc-car/anylogic-model'],
]

/**
 * High-resolution replacements for the tiny legacy logos (some were 89px
 * wide). Trimmed to the ink and capped small, since they never render above
 * ~160px. These deliberately reuse the legacy keys to overwrite them, which
 * works because this phase runs after the legacy pass.
 */
const LOGO_WIDTHS = { small: 160, mid: 320 }

const logos = [
  ['MIT-Logo.png', 'logos/mit'],
  ['purdue-logo.webp', 'logos/purdue'],
  ['GE-Aerospace-Emblem.png', 'logos/ge-aerospace'],
  ['GE-Vernova-Emblem.png', 'logos/ge-vernova'],
  ['Rockwell.png', 'logos/rockwell'],
  ['Deloitte.png', 'logos/deloitte'],
]

const projectVideos = [
  // Short clips — silent, autoplay-loop friendly
  ['TerraProbe/Soil_Sampling_Demo.MOV', 'terraprobe/sampling', { maxHeight: 720, crf: 27 }],
  ['UAV Drone/IMG_9460.MOV', 'offshore-drone/clamp', { maxHeight: 720, crf: 27 }],
  ['UAV Drone/IMG_9462.gif', 'offshore-drone/platform-motion', { maxHeight: 711, crf: 28 }],
  ['RC Car/AnyLogic_Sim_Loop.gif', 'rc-car/anylogic-loop', { maxHeight: 720, crf: 28 }],
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
  ['ParkVue/parkVue_PitchDeck.pdf', 'parkvue-pitch-deck.pdf'],
  [
    'John Deere Time Series Analysis/TDM_Symposium2024_Poster_JohnDeere_PartsDemandForecasting.pdf',
    'john-deere-poster-2024.pdf',
  ],
  [
    'John Deere Time Series Analysis/TDM_Symposium2025_Poster_JohnDeere_DemandForecasting.pdf',
    'john-deere-poster-2025.pdf',
  ],
  ['TerraProbe/TerraProbe_MotorTest/Electronic Schematic.pdf', 'terraprobe-schematic.pdf'],
  ['TerraProbe/CDR_ME463_TerraProbe.pdf', 'terraprobe-cdr.pdf'],
  ['TerraProbe/FDR_ME463_TerraProbe.pdf', 'terraprobe-fdr.pdf'],
  ['UAV Drone/Platform Team Sponsor Slides.pdf', 'offshore-platform-sponsor-slides.pdf'],
  ['Roll_to_Roll_Mfg_Analysis/roll-to-roll-mfg-analysis.pdf', 'roll-to-roll-mfg-analysis.pdf'],
  ['Truck Freight Analysis/truck-freight-initial.pdf', 'truck-freight-initial.pdf'],
  ['Truck Freight Analysis/truck-freight-final.pdf', 'truck-freight-final.pdf'],
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

  console.log(`\nLogos: ${logos.length}`)
  await pool(logos, ([rel, target]) =>
    convertImage(join(PROJECTS, 'Logos', rel), target, { trim: true, widths: LOGO_WIDTHS }),
  )
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
