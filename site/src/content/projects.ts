import type { ActId } from './acts'

/**
 * Content model is deliberately split by audience:
 *
 *   Card fields  (oneLiner, cardMedia, tags, headlineMetrics) are what a
 *                recruiter sees in their first 20 seconds on the home page.
 *   Page fields  (problem, did, outcome, media, docs) are the payoff for
 *                someone who clicked through.
 *
 * Papers and decks are viewed on the page. PDFs are not offered as downloads.
 */

export type InteractiveId =
  | 'line-sim'
  | 'proliferation'
  | 'spc-chart'
  | 'vision-overlay'
  | 'forecast-chart'
  | 'r2r-chart'

export interface MediaItem {
  kind: 'image' | 'video'
  /** Key into media.generated.json or video.generated.json */
  key: string
  caption: string
  /** Short clips loop silently; full demos are click-to-play. */
  loop?: boolean
  /** Give a single item the full content width. */
  wide?: boolean
}

export interface ModelItem {
  src: string
  label: string
  caption: string
  /** Starting explode amount, 0–100. */
  explode?: number
}

export interface Doc {
  label: string
  kind: 'paper' | 'deck' | 'schematic' | 'code' | 'poster'
  /** In-page slide images. The document is viewed here, not downloaded. */
  slides?: string[]
  /** Preview image for a poster viewed on the page. */
  preview?: string
}

export interface Chapter {
  code: string
  act: ActId
  title: string
  body: string
  interactive?: InteractiveId
  media?: MediaItem
  model?: ModelItem
}

export interface Metric {
  value: string
  unit?: string
  label: string
}

export interface Project {
  id: string
  slug: string
  act: ActId
  spans: ActId[]

  title: string
  subtitle: string
  org: string
  period: string
  role: string
  team?: string

  /* ---- card ---- */
  oneLiner: string
  cardMedia: MediaItem
  tags: string[]
  headlineMetrics: Metric[]
  featured?: boolean

  /* ---- page ---- */
  problem: string
  /** Shown with the problem, before any build media. */
  problemMedia?: MediaItem
  /** What we built, a short narrative, then the figures. */
  build?: string
  did: string[]
  outcome: string[]
  media?: MediaItem[]
  models?: ModelItem[]
  chapters?: Chapter[]
  interactive?: InteractiveId
  docs?: Doc[]
  stack: string[]
  /** A short status line shown in place of later sections, e.g. a paper in review. */
  note?: string
  /** This page continues another project, rendered as a link above the problem. */
  continues?: { slug: string; title: string }

  /** Real figures Sankaran still needs to supply. */
  needsMetrics?: boolean
}

export const projects: Project[] = [
  /* ================================================================== */
  /* 1. RC CAR, the whole loop, with real hardware and real artefacts   */
  /* ================================================================== */
  {
    id: 'rc-car',
    slug: 'rc-car-drivetrain',
    act: 'make',
    spans: ['design', 'make'],
    title: 'RC Car Manufacturing',
    subtitle: 'Building 40 drivetrains, manufacturing at scale',
    org: 'MIT Mechanical Engineering',
    period: '2024',
    role: 'Drivetrain design, quality & simulation',
    team: 'Drivetrain team of 4, within a class of ~40',

    oneLiner:
      'Designed a rear-wheel drivetrain and manufactured forty of them, the jump from a working prototype to a production run.',
    cardMedia: { kind: 'image', key: 'rc-car/pic', caption: 'The finished RC car from the production run' },
    tags: ['CAD', 'Waterjet', 'Machine vision', 'AnyLogic'],
    headlineMetrics: [],
    featured: true,

    problem:
      'A class of engineers had to deliver forty complete, working RC cars, not one prototype, forty units off a shared, improvised production line. My team of four owned the drivetrain. The moment you commit to forty, the interesting problems stop being "does it work" and start being "does it work every time, and how do we know before final assembly".',
    did: [
      'Designed a rear-wheel-drive drivetrain for controllability, negotiating interfaces with the chassis and steering teams so forty units could actually be assembled.',
      'Manufactured the production run, waterjet-cut plate parts, and axle holders that were waterjet-cut then faced and drilled on a mill so the bearing bore was a machined feature.',
      'Built a machine-vision inspection rig on a Raspberry Pi and camera that detects the bearing bore, measures its diameter, and rejects scrap automatically, with a web app front end for the operator.',
      'Modelled the assembly line in AnyLogic as a digital twin to locate the bottleneck station and test how to raise throughput before changing anything physically.',
    ],
    outcome: [
      'Forty drivetrains delivered, with every bearing bore measured against tolerance instead of eyeballed.',
      'Inspection criteria became consistent and fast enough not to gate production, the scrap decision stopped depending on who was holding the calipers.',
      'The AnyLogic twin identified where throughput was actually constrained, which is a different answer than where the line felt slowest.',
    ],

    media: [
      {
        kind: 'image',
        key: 'rc-car/drivetrain',
        caption: 'The manufactured rear-wheel drivetrain assembly.',
      },
      {
        kind: 'image',
        key: 'rc-car/vision-webapp',
        caption:
          'The quality web app, bore detected, diameter measured, pass/fail returned to the operator.',
      },
      {
        kind: 'image',
        key: 'rc-car/vision-rig',
        caption: 'The inspection rig: Raspberry Pi and camera in a fixed-geometry mount.',
      },
      {
        kind: 'image',
        key: 'rc-car/waterjet',
        caption: 'Waterjet cutting the plate parts and axle-holder blanks.',
      },
      { kind: 'image', key: 'rc-car/team', caption: 'The build team.' },
    ],

    models: [
      {
        src: '/models/rc-car-drivetrain.glb',
        label: 'Wheels & drivetrain assembly',
        caption: 'The rear-wheel-drive subsystem my team owned. Drag to orbit.',
      },
      {
        src: '/models/rc-car-assembly.glb',
        label: 'Full vehicle assembly',
        caption: 'The integrated car the class converged on.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'design',
        title: 'Design for the forty, not the one',
        body: 'Rear-wheel drive was chosen for controllability on the obstacle course. The harder constraint was never performance, it was that every dimension had to be producible forty times, on shared equipment, to a tolerance the bearings would accept.',
        model: {
          src: '/models/rc-car-drivetrain.glb',
          label: 'Drivetrain assembly',
          caption: 'The as-designed drivetrain. Orbit, explode, or switch to wireframe.',
        },
      },
      {
        code: '02',
        act: 'make',
        title: 'Waterjet, then the mill',
        body: 'Plate parts were waterjet-cut. The axle holders started the same way, then were faced and drilled on a mill so the bearing bore was a machined feature rather than a printed one.',
        media: {
          kind: 'image',
          key: 'rc-car/waterjet',
          caption: 'Waterjet cutting the plate components and axle-holder blanks.',
        },
      },
      {
        code: '03',
        act: 'automate',
        title: 'Inspection that does not depend on a human',
        body: 'Rather than gauge every bore by hand, I built a vision system that detects the bore, measures its diameter, and rejects parts outside tolerance, consistent criteria applied to every part, with a web app for the operator.',
        media: {
          kind: 'image',
          key: 'rc-car/vision-webapp',
          caption: 'The quality web app as the operator sees it, bore detected, diameter measured, verdict returned.',
        },
      },
    ],

    docs: [
      {
        label: 'Design Review',
        kind: 'deck',
        slides: Array.from(
          { length: 28 },
          (_, i) => `/docs/rc-car-design-review/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
      {
        label: 'Manufacturing Review',
        kind: 'deck',
        slides: Array.from(
          { length: 47 },
          (_, i) => `/docs/rc-car-manufacturing-review/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'SolidWorks',
      'Waterjet',
      'Mill',
      'Machine vision',
      'Raspberry Pi',
      'AnyLogic',
    ],
    needsMetrics: true,
  },

  {
    id: 'rc-car-line',
    slug: 'rc-car-line-simulation',
    act: 'automate',
    spans: ['automate'],
    title: 'RC Car Factory Line Simulation',
    subtitle: 'How do we actually raise throughput?',
    org: 'MIT Mechanical Engineering',
    period: '2024',
    role: 'Simulation & line design',
    team: 'Drivetrain team of 4, within a class of ~40',

    oneLiner:
      'An extension of the RC car build: an AnyLogic digital twin of the assembly line, used to see how we could raise throughput before changing anything on the floor.',
    cardMedia: {
      kind: 'image',
      key: 'rc-car/sim-subassemblies',
      caption: 'The five subassemblies the line has to produce together.',
    },
    tags: ['AnyLogic', 'Digital twin', 'Throughput'],
    headlineMetrics: [],
    continues: { slug: 'rc-car-drivetrain', title: 'RC Car Manufacturing' },

    problem:
      'We already knew how to make the parts. The question here was how the line that builds the whole car actually runs, five subassemblies sharing machines and people, and where we could raise throughput without guessing.',
    did: [
      'We modelled the line in AnyLogic as a discrete-event twin of the five subassemblies, so we could watch work move before we moved anything physically.',
      'I used the operator and machine pools to read the model the way you would a floor, who is busy, which resource is seized, where capacity is sitting idle.',
      'The results showed the subassemblies were uneven. The line was not balanced: some teams were underused, which meant operators could be reallocated instead of adding headcount.',
    ],
    outcome: [],

    media: [
      {
        kind: 'video',
        key: 'rc-car/anylogic-loop',
        caption: 'The AnyLogic model running, parts moving, pools updating.',
        loop: true,
      },
      {
        kind: 'image',
        key: 'rc-car/sim-interpretation',
        caption:
          'How to read the model: operator-pool usage, machine utilisation, and throughput counters on the floor plan.',
      },
      {
        kind: 'image',
        key: 'rc-car/sim-results',
        caption:
          'Subassembly throughput and utilisation. The line is uneven, some teams sit idle while others gate the car.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'automate',
        title: 'Watch the line before you change it',
        body: 'We ran the twin continuously so the floor was visible as a process, not a snapshot. Parts move, pools update, and you can see which station is actually holding the car.',
        media: {
          kind: 'video',
          key: 'rc-car/anylogic-loop',
          caption: 'The AnyLogic model running.',
          loop: true,
        },
      },
      {
        code: '02',
        act: 'prove',
        title: 'How to read the model',
        body: 'Each pool is a resource, operators, waterjet, mill, tapping. Utilisation and the free/busy count tell you whether a team is working or waiting. Throughput counters on the right show what has actually left each subassembly.',
        media: {
          kind: 'image',
          key: 'rc-car/sim-interpretation',
          caption: 'Operator and machine pools on the floor plan, with utilisation and throughput.',
        },
      },
      {
        code: '03',
        act: 'prove',
        title: 'The line is not balanced',
        body: 'Throughput across the five subassemblies was uneven. Some teams were underutilised while others gated the car, which means operators could be reallocated before anyone asked for more machines or more people.',
        media: {
          kind: 'image',
          key: 'rc-car/sim-results',
          caption: 'Throughput, subteam utilisation, and machine load, the imbalance in one view.',
        },
      },
    ],

    docs: [
      {
        label: 'AnyLogic Simulation',
        kind: 'deck',
        slides: Array.from(
          { length: 36 },
          (_, i) => `/docs/rc-car-anylogic-simulation/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
      {
        label: 'Simulation modelling paper',
        kind: 'paper',
        slides: Array.from(
          { length: 10 },
          (_, i) => `/docs/rc-car-simulation-paper/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: ['AnyLogic', 'Discrete-event simulation', 'Throughput analysis'],
    needsMetrics: true,
  },

  {
    id: 'rc-car-spc',
    slug: 'rc-car-axle-spc',
    act: 'make',
    spans: ['make', 'prove'],
    title: 'RC Car Axle Holder Process Control',
    subtitle: 'Could FDM print settings actually hold the bearing bore?',
    org: 'MIT Mechanical Engineering',
    period: '2024',
    role: 'Process characterization',
    team: 'Drivetrain team of 4, within a class of ~40',

    oneLiner:
      'We took the axle-holder bore problem from the cars and asked whether FDM print parameters could be controlled tightly enough to keep that diameter in spec.',
    cardMedia: {
      kind: 'image',
      key: 'rc-car/axle-holder',
      caption: 'FDM-printed axle holder used for the process study',
    },
    tags: ['DOE', 'FDM', 'SPC', 'Machine vision'],
    headlineMetrics: [],

    problem:
      'The production axle holders on the cars were waterjet-cut and milled. We still had a bore-diameter problem worth studying: if we printed the same part, could the knobs on an FDM printer be controlled tightly enough to keep a bearing press-fit in spec? Printed bores do not honour a nominal diameter for free, the study was to find out whether the process could.',
    did: [
      'We took the axle-holder bore from the cars and recast it as an FDM experiment, same critical feature, a process we could vary on purpose.',
      'I set up a four-factor experiment: print speed, layer resolution, filament (PLA versus PETG), and whether the cooling fan was on or off.',
      'We measured every bore two ways, calipers by hand, and the vision system, so a single method could not hide the variation.',
      'I put the diameters on control charts and against the design spec (12.65–12.69 mm) so we could see what share of parts were actually in control.',
    ],
    outcome: [
      'The process sat centered, but the control limits fell outside the specification window, more than half the parts were out of spec before we changed anything.',
      'The four factors gave us a ranked view of which print settings actually moved bore variation, instead of guessing from the printer menu.',
      'We stopped treating inspection as the fix. The charts told us whether the process itself was in control.',
    ],

    media: [
      {
        kind: 'image',
        key: 'rc-car/spc-batch',
        caption: 'A full plate of FDM-printed axle holders for the process study.',
      },
      {
        kind: 'image',
        key: 'rc-car/spc-vision',
        caption:
          'The vision system measuring a bore, one of the two metrology paths, alongside handheld calipers.',
      },
      {
        kind: 'image',
        key: 'rc-car/spc-parameters',
        caption:
          'The four factors we varied: print speed, resolution, filament, and cooling airflow.',
      },
      {
        kind: 'image',
        key: 'rc-car/spc-xbar',
        caption:
          'X-bar chart of vision-system bore diameters across batches, the process against its own control limits.',
      },
      {
        kind: 'image',
        key: 'rc-car/spc-distribution',
        caption:
          'The measured diameter distribution against the design spec. Centered, but too wide.',
      },
      {
        kind: 'image',
        key: 'rc-car/spc-spec',
        caption:
          'The window we were aiming for: 12.65–12.69 mm, a press-fit on a 12.7 mm bearing.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'make',
        title: 'Same bore, a process we could vary',
        body: 'We printed the axle holder in batches so the bearing bore could be treated as a process output, not a one-off CAD dimension. The production holders stayed aluminum. This run was the experiment.',
        media: {
          kind: 'image',
          key: 'rc-car/spc-batch',
          caption: 'A plate of FDM-printed axle holders on the Bambu printer.',
        },
      },
      {
        code: '02',
        act: 'prove',
        title: 'Four knobs, not a dozen',
        body: 'I limited the experiment to the four settings we actually suspected: print speed, layer resolution, filament (PLA or PETG), and the cooling fan on or off. Everything else stayed put so a change in the bore could be traced.',
        media: {
          kind: 'image',
          key: 'rc-car/spc-parameters',
          caption: 'The four print parameters we varied, and the hypothesis attached to each.',
        },
      },
      {
        code: '03',
        act: 'automate',
        title: 'Calipers and a camera',
        body: 'We measured every bore twice. I used calipers by hand. The vision rig, the same class of system we built for the cars, detected the hole and returned a diameter, so the two methods could be compared instead of trusted blindly.',
        media: {
          kind: 'image',
          key: 'rc-car/spc-vision',
          caption: 'The vision-system front end during a bore measurement.',
        },
      },
      {
        code: '04',
        act: 'prove',
        title: 'In control is not the same as in spec',
        body: 'I plotted the vision measurements on an X-bar chart and against the design limits. The process was centered, but its control limits sat outside the 12.65–12.69 mm window, more than half the parts out of spec before any parameter change.',
        media: {
          kind: 'image',
          key: 'rc-car/spc-xbar',
          caption: 'X-bar chart of vision-system measurements across batches 2, 3 and 4.',
        },
      },
    ],

    docs: [
      {
        label: 'Statistical Process Control',
        kind: 'deck',
        slides: Array.from(
          { length: 32 },
          (_, i) => `/docs/rc-car-spc-presentation/${String(i + 2).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'FDM',
      'Design of experiments',
      'Statistical process control',
      'Machine vision',
      'Calipers',
    ],
    needsMetrics: true,
  },

  /* ================================================================== */
  /* GE VERNOVA, the most senior industry project                       */
  /* ================================================================== */
  {
    id: 'ge-vernova',
    slug: 'circuit-breaker-standardization',
    act: 'make',
    spans: ['design', 'make', 'automate', 'prove'],
    title: 'Standardizing a Circuit Breaker Platform',
    subtitle: 'Cutting product proliferation and lifting assembly throughput',
    org: 'MIT × GE Vernova',
    period: 'Mar 2026, Aug 2026',
    role: 'Manufacturing Engineer',
    team: 'MIT–GE Vernova partnership with Sebastian Podiono, on-site at the plant',

    oneLiner:
      'On the plant floor I owned the standardization initiative with fellow MIT student Sebastian Podiono: a modular circuit from 350+ drawings, an MES that explained missed takt, and a manufacturing strategy for $33.5M a year in early revenue recognition.',
    cardMedia: {
      kind: 'image',
      key: 'ge-vernova/team',
      caption: 'The GE Vernova standardization team',
    },
    tags: ['Standardization', 'MES', 'Digital twin', 'Throughput'],
    headlineMetrics: [
      { value: '3', unit: 'x', label: 'Engineering drawing throughput' },
      { value: '$500K', label: 'Annual engineering-team savings' },
      { value: '$33.5M', label: 'Early revenue recognition a year' },
    ],
    featured: true,

    problem:
      'Energy demand was driving large incoming orders, and the line could not take that volume if every breaker was still its own design. Standardization is how you manage throughput when the order book jumps, one base you can build over and over, with the variation sitting in add-ons rather than a new SKU each time.\n\nThe actual driver was the catalogue. Product variants pile up one reasonable decision at a time. Each new customer requirement gets its own design, and nobody owns the total until variety itself is the cost: more parts, more documentation, a longer learning curve on the assembly line. The question was whether we could collapse that catalogue without taking options away from the customer.',
    did: [
      'I owned the standardization initiative with fellow MIT student Sebastian Podiono, taking it from a leadership concept to a practical reality.',
      'I sat with 350+ drawings across 30+ customers and, with engineering, cut a standard circuit that stays modular: one base, add-ons for the rest. 274 orders could migrate immediately, drawing throughput tripled, and the engineering team saves about $500,000 a year.',
      'I built a production MES and ran time studies on 65+ orders, then mapped each one to its complexity. Shop floor, engineering, and leadership could see, order by order, why takt was being missed.',
      'That MES data fed an AnyLogic twin of the current line and of the standardized one. The future state makes 70 more circuit breakers a year, $33.5M the company can recognize earlier.',
    ],
    outcome: [],
    note: 'A paper from this work, in collaboration with MIT × GE Vernova, is currently under review. Stay tuned.',

    docs: [],
    stack: [
      'AnyLogic',
      'Discrete-event simulation',
      'MES architecture',
      'Design standardization',
      'Line balancing',
      'Throughput analysis',
    ],
  },

  /* ================================================================== */
  /* 3. TERRAPROBE, design flagship, real demo video                    */
  /* ================================================================== */
  {
    id: 'terraprobe',
    slug: 'terraprobe',
    act: 'design',
    spans: ['design', 'automate', 'prove'],
    title: 'TerraProbe Soil Sampling Device',
    subtitle: 'A portable soil sampling system for real-time field testing',
    org: 'Purdue ME Senior Design',
    period: '2024, 2025',
    role: 'Mechanism, electronics & web app',
    team: 'Senior design team',

    oneLiner:
      'A portable soil sampling system that takes a sample in the field and returns usable soil properties in real time, not weeks later from a lab.',
    cardMedia: {
      kind: 'video',
      key: 'terraprobe/sampling',
      caption: 'Sampling demonstration',
      loop: true,
    },
    tags: ['Creo', 'GD&T', 'Embedded', 'Streamlit'],
    headlineMetrics: [],
    featured: true,

    problem:
      'Soil testing still means digging, bagging, shipping, and waiting on a lab. By the time the numbers come back, the decision has already been made. We built a portable sampler one person can carry into a field and get a real-time reading from, the sample, the sensors, and the display in one handheld system.',
    did: [
      'Designed the rack-and-pinion drive that sets sampling depth and pulls a clean core, instead of leaving depth to hand feel.',
      'Integrated the motor-control electronics so the mechanism is commanded to depth, not guessed.',
      'Built the sensing and digital-display electronics that collect soil properties at the point of sample.',
      'Built the web app that turns those readings into something you can read in the field.',
    ],
    outcome: [
      'A working handheld prototype, sampled end to end in soil.',
      'Motor, display, sensors, and dashboard running as one portable system.',
      'Soil properties at the point of test, instead of a lab turnaround.',
    ],

    media: [
      {
        kind: 'video',
        key: 'terraprobe/sampling',
        caption: 'Taking a sample: auger-core mechanism under automated depth control.',
        loop: true,
        wide: true,
      },
      {
        kind: 'video',
        key: 'terraprobe/full-demo',
        caption: 'Full system demonstration, start to finish.',
      },
    ],

    docs: [
      {
        label: 'Critical Design Review',
        kind: 'deck',
        slides: Array.from(
          { length: 25 },
          (_, i) => `/docs/terraprobe-cdr/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
      {
        label: 'Final Design Review',
        kind: 'deck',
        slides: Array.from(
          { length: 33 },
          (_, i) => `/docs/terraprobe-fdr/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
      {
        label: 'Electronic schematic',
        kind: 'schematic',
        slides: Array.from(
          { length: 2 },
          (_, i) => `/docs/terraprobe-schematic/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'Creo',
      'Manufacturing (Milling, Lathe)',
      'GD&T',
      'Embedded / Arduino',
      'Python & Streamlit (WebApp)',
    ],
  },

  /* ================================================================== */
  /* 4. OFFSHORE DRONE, strong video evidence                           */
  /* ================================================================== */
  {
    id: 'offshore-drone',
    slug: 'offshore-drone-platform',
    act: 'design',
    spans: ['design', 'automate'],
    title: 'Offshore Drone Landing & Charging Platform',
    subtitle: 'Platform subsystem for autonomous offshore inspection',
    org: 'MIT 2.734, MIT Lincoln Laboratory',
    period: '2026',
    role: 'Platform Subsystem Owner',
    team: 'Platform, housing and stabilization subsystem teams',

    oneLiner:
      'A boat-mounted platform that lands, clamps, and contact-charges an inspection drone through heave and sway.',
    cardMedia: {
      kind: 'video',
      key: 'offshore-drone/platform-motion',
      caption: 'Platform mechanism in motion',
      loop: true,
    },
    tags: ['Mechanism design', 'Electromechanical', 'Contact charging', 'Integration'],
    headlineMetrics: [],

    problem:
      'Offshore inspection is still a manual survey of structures at sea, people on boats, climbing, working in weather and swell. It is slow, expensive, and hazardous. A drone only takes that job if it can finish the duty cycle without a person on deck: launch, recover, secure, and charge from a vessel that will not hold still.',
    problemMedia: {
      kind: 'image',
      key: 'offshore-drone/context',
      caption: 'The inspection task this replaces: manual survey of offshore structures.',
    },
    build:
      'I owned the platform subsystem, the landing surface, the clamp, and the contact-charging interface, designed in Fusion 360 and integrated against the housing and stabilization teams. The drone has to land softly, then remain in the same position so the charging contacts stay closed. At sea, heave and sway turn a small miss into a hard landing or a broken charge. Soft landing and a clamp that keeps the airframe registered to the pads are what make an unattended sortie possible.',
    did: [
      'Designed the landing surface and passive alignment so the drone can touch down in the space it can actually hit, then be guided to a fixed charging position.',
      'Built the clamp and magnet lock so the airframe stays put through boat motion while the contacts are live.',
      'Closed the cycle with contact charging, then release and relaunch, without a person handling the aircraft.',
      'Negotiated mechanical and electrical interfaces with the housing and stabilization subsystems for the Lincoln Laboratory sponsor review.',
    ],
    outcome: [
      'A demonstrated platform that receives, clamps, and charges the drone as one sequence.',
      'Contact charging with the airframe held in a fixed position, the piece that makes repeated unattended sorties possible.',
      'Design, mechanism, and duty cycle presented to MIT Lincoln Laboratory.',
    ],

    media: [
      {
        kind: 'video',
        key: 'offshore-drone/full-demo',
        caption: 'Full duty cycle: land, clamp, and charge.',
      },
      {
        kind: 'video',
        key: 'offshore-drone/platform-motion',
        caption: 'The platform mechanism actuating.',
        loop: true,
      },
      {
        kind: 'video',
        key: 'offshore-drone/clamp',
        caption: 'Clamping the airframe so it stays registered for charging.',
        loop: true,
      },
      { kind: 'video', key: 'offshore-drone/test-1', caption: 'Bench testing the mechanism.', loop: true },
      { kind: 'video', key: 'offshore-drone/test-2', caption: 'Repeat cycle test.', loop: true },
    ],

    docs: [
      {
        label: 'Platform Team Sponsor Slides',
        kind: 'deck',
        slides: Array.from(
          { length: 10 },
          (_, i) => `/docs/offshore-slides/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'Fusion 360',
      'Mechanism & Fixture Design',
      'Electromechanical Integration',
      'Contact Charging',
      'Subsystem Interfaces',
    ],
  },

  /* ================================================================== */
  /* 5. JOHN DEERE, leadership first                                    */
  /* ================================================================== */
  {
    id: 'john-deere',
    slug: 'john-deere-demand-forecasting',
    act: 'prove',
    spans: ['prove'],
    title: 'John Deere Parts Demand Forecasting',
    subtitle: 'I led the team. The models were how we delivered.',
    org: 'Purdue Data Mine × John Deere',
    period: '2024, 2025',
    role: 'Project Manager & Teaching Assistant',
    team: '12 Purdue graduate and undergraduate students',

    oneLiner:
      'As Project Manager and Teaching Assistant I ran a two-year John Deere partnership. Twelve Purdue graduate and undergraduate students built the models. My job was to get them to one forecast the sponsor would actually use.',
    cardMedia: {
      kind: 'image',
      key: 'projects/deere',
      caption: 'The program in one frame: the team I led, the buckets, the external factors.',
    },
    tags: ['Team leadership', 'Demand planning', 'Forecasting', 'ARIMA'],
    headlineMetrics: [
      { value: '12', unit: 'students', label: 'Purdue graduate and undergraduate students I led' },
      { value: '2', unit: 'years', label: 'Program I ran as PM and TA' },
    ],

    problem:
      'John Deere carries on the order of 1.6 million part-location combinations. Demand is seasonal, intermittent, and different by region, so a single model is a bad bet: miss high and you buy inventory that sits, miss low and the dealer is out. The twelve-month forecast had to be defensible on error and on bias.\n\nI was lucky to spend two years teaching, mentoring, and guiding twelve Purdue graduate and undergraduate students from engineering, business and data science. They did the hard work of building the models. As Project Manager and Teaching Assistant I helped them agree on what good looked like, kept the work pointed at one deliverable, and prepared them to stand in front of John Deere and explain what they had built.',
    did: [
      'Ran the two years as Project Manager and Teaching Assistant: scope, reviews, sponsor checkpoints, and the technical development of twelve Purdue graduate and undergraduate students I was responsible for teaching, not only managing.',
      'Set the definition of quality before anyone fitted a model. Twelve-month horizon, RMSE and bias both on the table, over-prediction treated as its own failure because that is excess inventory.',
      'Directed the method: classify series by demand behaviour, bake traditional and machine-learning models against the same holdout, then bring in weather and rate features only if they earned their place.',
      'The twelve students built the models, moving-average and seasonal naïve through exponential smoothing, regression, XGBoost, SARIMA and neural nets. I worked alongside them so I could defend the choice in the sponsor room, and so the credit for the fitting sits with the people who did it.',
    ],
    outcome: [
      'A two-year partnership that shipped: one forecast approach, one definition of quality, and twelve Purdue students who could explain the models they built to John Deere.',
      'Bias sat next to RMSE, so the business could see when a model systematically over-ordered instead of folding that into a single error number.',
      'A method that scales: bucket the demand, compare models on the same holdout, then test whether external factors actually move the error.',
      'Teaching the twelve of them was the best part of the two years. Watching graduate and undergraduate students go from a first time-series plot to standing in front of John Deere and defending their own models is the kind of work I would take again.',
    ],

    docs: [
      {
        label: '2024 Symposium poster',
        kind: 'poster',
        preview: '/docs/john-deere-poster-2024.webp',
      },
      {
        label: '2025 Symposium poster',
        kind: 'poster',
        preview: '/docs/john-deere-poster-2025.webp',
      },
    ],
    stack: [
      'Project management',
      'Teaching',
      'ARIMA / SARIMA',
      'Exponential smoothing',
      'XGBoost',
      'Time-series analysis',
      'Python / R',
      'Demand planning',
    ],
  },

  /* ================================================================== */
  /* 6. ROLL TO ROLL                                                     */
  /* ================================================================== */
  {
    id: 'roll-to-roll',
    slug: 'roll-to-roll-web-position',
    act: 'automate',
    spans: ['automate', 'prove'],
    title: 'Roll-to-Roll Industrial Manufacturing',
    subtitle: 'A physics model of the line, so the film can be held on center',
    org: 'MIT 2.C51',
    period: '2026',
    role: 'Process modeling & control',
    team: 'Team of 5',

    oneLiner:
      'A physics-based digital twin of a form-fill-seal line: as the film runs across the rollers it leaves center, and the model is how we planned to bring it back.',
    cardMedia: {
      kind: 'image',
      key: 'r2r/film-rollers',
      caption: 'The web running across the rollers, the line we modelled.',
    },
    tags: ['Web handling', 'Process control', 'Physics-informed models', 'VFFS'],
    headlineMetrics: [],

    problem:
      'The film is supposed to stay on center as it runs. It does not. A few millimetres of wander by the time it reaches the forming tube is a bad seal and scrap. The usual answer is to sit on the machine and tune the guide roller until it looks right, which is slow, personal, and has no model of what the rest of the line will do.',
    did: [
      'We treated the plant as the physical line it is, film entering at R0, a pivoted guide at R1, then R4, R5, R7 into the tube, and asked where the web actually was at each roller.',
      'We split the line into four spans (R0–R1, R1–R4, R4–R5, R5–R7) instead of one black box, because the same step at the actuator does not look the same downstream.',
      'We built physics-based transfer functions from the web-span equations and fitted them to the measured position, so the model still meant something on the floor.',
      'We used the transport delays, about five seconds by R7, to see what a controller would actually have to wait for, not just how well a curve fit the training set.',
    ],
    outcome: [],

    media: [
      {
        kind: 'image',
        key: 'r2r/process',
        caption: 'Side view of the line: film in, guide-roller control, tube out.',
        wide: true,
      },
      {
        kind: 'image',
        key: 'r2r/methodology',
        caption:
          'Four roller-to-roller models, five position sensors, the actuated guide at R1.',
      },
      {
        kind: 'image',
        key: 'r2r/web-position',
        caption:
          'Web position at each roller against the guide setpoint, the film does not stay with the command.',
      },
      {
        kind: 'image',
        key: 'r2r/delays',
        caption:
          'Transport lag from the setpoint: 0.3 s at R0, ~5 s by R7. A controller has to wait.',
      },
      {
        kind: 'image',
        key: 'r2r/model-fit',
        caption:
          'Physics plus a small DC offset recovered a high-fit model that stayed interpretable.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'automate',
        title: 'Four spans, one plant',
        body: 'We did not model the machine as one transfer function. Edge sensors at R0 and R1, cameras at R4, R5 and R7, and a pivoted guide at R1, four spans, each with its own dynamics, sharing one film.',
        media: {
          kind: 'image',
          key: 'r2r/methodology',
          caption: 'The instrumented line, four models, seven measurements.',
        },
      },
      {
        code: '02',
        act: 'prove',
        title: 'The film leaves center',
        body: 'Plot the web at every roller against the guide setpoint and the story is visible: R1 spikes, R4–R7 behave like low-pass filters, and the same command does not produce the same motion downstream. That is why we modelled roller-to-roller instead of one plant.',
        media: {
          kind: 'image',
          key: 'r2r/web-position',
          caption: 'Position at R0, R1, R4, R5, R7 versus the U1 setpoint.',
        },
      },
      {
        code: '03',
        act: 'prove',
        title: 'A controller has to wait',
        body: 'A step at the guide takes 0.3 s to show at R0 and almost five seconds to arrive at R7. If you tune as if the line is instantaneous, you chase a film that is not there yet. The delays went into the model before anyone talked about gains.',
        media: {
          kind: 'image',
          key: 'r2r/delays',
          caption: 'Lag from the setpoint to each roller, 4.94 s by R7.',
        },
      },
      {
        code: '04',
        act: 'prove',
        title: 'A model you can still interpret',
        body: 'A first-principles beam model captured the shape and missed the offset. Adding a tenth of a millimetre of DC bias closed the gap, 93–96% fit, without throwing the physics away. That is the model you would put in front of a controller, not a network that only works on the runs it trained on.',
        media: {
          kind: 'image',
          key: 'r2r/model-fit',
          caption: 'Physical model, offset-corrected, against the measured web at R5.',
        },
      },
    ],

    docs: [
      {
        label: 'Manufacturing analysis',
        kind: 'deck',
        slides: Array.from(
          { length: 41 },
          (_, i) => `/docs/roll-to-roll-mfg-analysis/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'Physics-informed models',
      'Transfer functions',
      'MATLAB',
      'Python',
      'Neural networks',
      'Process control',
      'Web handling',
    ],
  },

  /* ================================================================== */
  /* 7. FREIGHT                                                          */
  /* ================================================================== */
  {
    id: 'freight',
    slug: 'truck-freight-pricing',
    act: 'prove',
    spans: ['prove'],
    title: 'Truck Freight Analysis',
    subtitle: 'Can factors predict what a truck will cost?',
    org: 'MIT SCM.C51',
    period: '2026',
    role: 'Forecasting & modeling',
    team: 'Team of 4',

    oneLiner:
      'We asked whether route, time and market factors could predict and forecast truck price, first by reading the data, then by putting LightGBM against a transformer.',
    cardMedia: {
      kind: 'image',
      key: 'freight/market',
      caption: 'How freight price actually behaves, distance, time, geography.',
    },
    tags: ['LightGBM', 'Transformers', 'EDA', 'Forecasting'],
    headlineMetrics: [],

    problem:
      'A shipper wants to know what a load will cost before it quotes. Distance is the obvious factor, and it is not enough: the same mileage band still prices all over the map, and the market itself moves. The question was whether we could turn those factors into a forecast we would actually use.',
    did: [
      'We started with the data, not the model, how price sits against distance, how it clusters by geography, and how it shifts through the year and through the 2021 super-cycle.',
      'We turned quotes into a lane-week panel with lags, rolling stats, calendar encodings and exogenous market signals, so a model had factors to work with instead of a raw rate.',
      'We used LightGBM as the model that actually consumes those factors, with walk-forward validation so a fold never sees the future.',
      'We then ran a Temporal Fusion Transformer against that baseline, same lanes, same horizons, to see whether the extra complexity paid for itself.',
    ],
    outcome: [],

    media: [
      {
        kind: 'image',
        key: 'freight/seasonality',
        caption: 'A stable annual cycle, spring lows, October peaks, sitting on top of a 2020 shock.',
      },
      {
        kind: 'image',
        key: 'freight/lightgbm',
        caption: 'LightGBM on eight van lanes: where it tracks, and where it misses a spike.',
      },
      {
        kind: 'image',
        key: 'freight/comparison',
        caption: 'LightGBM vs the transformer, 66 wins to 30, on the same 96 evaluations.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'prove',
        title: 'Read the market first',
        body: 'The first deck was EDA. Price is right-skewed. Distance lifts the median but leaves a wide band inside every mileage bucket. Rates cluster by region and jump through 2021. If a factor cannot be seen here, it does not belong in the model.',
        media: {
          kind: 'image',
          key: 'freight/seasonality',
          caption: 'Seasonality is real, and it is not static, 2020 broke the trend underneath it.',
        },
      },
      {
        code: '02',
        act: 'prove',
        title: 'LightGBM on the factors',
        body: 'We forecast weekly median van-lane price at 1, 2, 4 and 8 weeks, with P10–P90 bands. LightGBM ate the engineered factors, lags did most of the work, calendar features alone made it worse. Across eight lanes you can see where it tracks and where a spike still gets away.',
        media: {
          kind: 'image',
          key: 'freight/lightgbm',
          caption: 'Eight-lane LightGBM forecasts against the actual load price.',
        },
      },
      {
        code: '03',
        act: 'prove',
        title: 'Then try the transformer',
        body: 'The Temporal Fusion Transformer was the test of whether attention would beat a tree model on the same problem. It did not, not as a standalone: LightGBM won 66 of 96 fold–lane–horizon evaluations. On this dataset the factors already in the table were enough, a finding, not a disappointment.',
        media: {
          kind: 'image',
          key: 'freight/comparison',
          caption: 'LightGBM vs TFT: MAE, quantile loss, and coverage on the same splits.',
        },
      },
    ],

    docs: [
      {
        label: 'Initial, EDA',
        kind: 'deck',
        slides: Array.from(
          { length: 25 },
          (_, i) => `/docs/truck-freight-initial/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
      {
        label: 'Final, LightGBM & transformer',
        kind: 'deck',
        slides: Array.from(
          { length: 30 },
          (_, i) => `/docs/truck-freight-final/${String(i + 1).padStart(2, '0')}.webp`,
        ),
      },
    ],
    stack: [
      'LightGBM',
      'Temporal Fusion Transformer',
      'Feature engineering',
      'Python',
      'Walk-forward validation',
    ],
  },

  /* ================================================================== */
  /* 8. PARKVUE, the pitch that won                                     */
  /* ================================================================== */
  {
    id: 'parkvue',
    slug: 'parkvue',
    act: 'prove',
    spans: ['prove'],
    title: 'ParkVue',
    subtitle: 'Won the pitch competition. Took home $10K.',
    org: 'Purdue University',
    period: '2022, 2023',
    role: 'Business plan & pitch',
    team: 'Team of 4',

    oneLiner:
      'Won $10K in a startup pitch competition for a business plan that lets drivers reserve a parking space before they leave.',
    cardMedia: {
      kind: 'image',
      key: 'parkvue/01',
      caption: 'The ParkVue pitch, the deck that won $10K.',
    },
    tags: ['Pitch competition', 'Go-to-market', 'Customer discovery'],
    headlineMetrics: [
      { value: '$10K', label: 'Pitch competition prize' },
      { value: 'Won', label: 'Startup pitch competition' },
    ],

    problem:
      'Drivers circle for parking a garage already knows is empty. Time, fuel, and a space sitting unused. At Purdue it was late-to-class and a C-pass that still could not find a spot.\n\nWe surveyed campus. Seventy-six percent of respondents had trouble finding an open space. Eighty percent said they would use a service that fixed it, and most would pay a dollar to three to do so.',
    did: [
      'With three classmates I wrote the ParkVue business plan: live availability, reserve before you leave, camera nodes at the garage so the lot reports itself.',
      'We validated the problem on campus, not just in a market report. Over 50,000 Purdue-affiliated people were contacted. More than 85 responded.',
      'We stood up and won the startup pitch competition. The prize was $10K.',
      'The go-to-market was a Purdue garage pilot, then other campuses, then high-traffic sites, airports, stadiums, event parking.',
    ],
    outcome: ['We won the competition and took home $10K.'],

    docs: [
      {
        label: 'Pitch deck',
        kind: 'deck',
        slides: Array.from(
          { length: 13 },
          (_, i) => `/media/parkvue/${String(i + 1).padStart(2, '0')}-large.webp`,
        ),
      },
    ],
    stack: ['Customer discovery', 'Go-to-market', 'Pitch', 'Two-sided marketplace'],
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
export const otherProjects = projects.filter((p) => !p.featured)
export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug)
export const projectsByAct = (act: ActId) => projects.filter((p) => p.act === act)

/** Display order on the Projects page, within each stage column. */
export const projectOrder = [
  'offshore-drone',
  'terraprobe',
  'rc-car',
  'rc-car-spc',
  'ge-vernova',
  'rc-car-line',
  'roll-to-roll',
  'parkvue',
  'freight',
  'john-deere',
] as const
