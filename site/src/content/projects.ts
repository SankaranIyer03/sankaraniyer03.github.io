import type { ActId } from './acts'

/**
 * Content model is deliberately split by audience:
 *
 *   Card fields  (oneLiner, cardMedia, tags, headlineMetrics) are what a
 *                recruiter sees in their first 20 seconds on the home page.
 *   Page fields  (problem, did, outcome, media, docs) are the payoff for
 *                someone who clicked through.
 *
 * Full decks and papers are linked, never inlined — the page shows the
 * overview and the ownership, and the PDF is there if they want the rest.
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
}

export interface Doc {
  label: string
  href: string
  kind: 'paper' | 'deck' | 'schematic' | 'code'
  /** Rough size, so a click on mobile data isn't a surprise. */
  size?: string
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
  did: string[]
  outcome: string[]
  media?: MediaItem[]
  models?: ModelItem[]
  chapters?: Chapter[]
  interactive?: InteractiveId
  docs?: Doc[]
  stack: string[]

  /** Real figures Sankaran still needs to supply. */
  needsMetrics?: boolean
}

export const projects: Project[] = [
  /* ================================================================== */
  /* 1. RC CAR — the whole loop, with real hardware and real artefacts   */
  /* ================================================================== */
  {
    id: 'rc-car',
    slug: 'rc-car-drivetrain',
    act: 'make',
    spans: ['design', 'make', 'automate', 'prove'],
    title: 'Forty Drivetrains',
    subtitle: 'Design → mass manufacture → machine-vision QC → digital twin → process control',
    org: 'Purdue Mechanical Engineering',
    period: '2024',
    role: 'Drivetrain design, quality & simulation',
    team: 'Drivetrain team of 4, within a class of ~40',

    oneLiner:
      'Designed a rear-wheel drivetrain, manufactured forty of them, built a machine-vision rig to reject bad axle holders, modelled the line in AnyLogic to find the bottleneck, then ran a DOE to explain the defects at source.',
    cardMedia: { kind: 'image', key: 'rc-car/drivetrain', caption: 'Manufactured drivetrain assembly' },
    tags: ['CAD', 'Machine vision', 'AnyLogic', 'SPC / DOE'],
    headlineMetrics: [
      { value: '40', unit: 'units', label: 'Drivetrains manufactured' },
      { value: '100', unit: '%', label: 'Bores inspected automatically' },
      { value: '4', unit: 'stages', label: 'Design to process control' },
    ],
    featured: true,

    problem:
      'A class of engineers had to deliver forty complete, working RC cars — not one prototype, forty units off a shared, improvised production line. My team of four owned the drivetrain. The moment you commit to forty, the interesting problems stop being "does it work" and start being "does it work every time, and how do we know before final assembly".',
    did: [
      'Designed a rear-wheel-drive drivetrain for controllability, negotiating interfaces with the chassis and steering teams so forty units could actually be assembled.',
      'Manufactured the production run — waterjet-cut plate parts and FDM-printed axle holders — and hit the reality that printed bores do not honour a nominal diameter for free.',
      'Built a machine-vision inspection rig on a Raspberry Pi and camera that detects the bearing bore, measures its diameter, and rejects scrap automatically, with a web app front end for the operator.',
      'Modelled the assembly line in AnyLogic as a digital twin to locate the bottleneck station and test how to raise throughput before changing anything physically.',
      'Ran a designed experiment on the FDM print parameters, analysed with ANOVA and regression, to identify which factors actually drive bore diameter variation.',
      'Put the resulting dimension under statistical process control so the process was monitored rather than merely inspected.',
    ],
    outcome: [
      'Forty drivetrains delivered, with every bearing bore measured against tolerance instead of eyeballed.',
      'Inspection criteria became consistent and fast enough not to gate production — the scrap decision stopped depending on who was holding the calipers.',
      'The DOE separated the significant print parameters from the merely suspected ones, moving the fix upstream to the print process rather than leaving it at the inspection step.',
      'The AnyLogic twin identified where throughput was actually constrained, which is a different answer than where the line felt slowest.',
    ],

    media: [
      {
        kind: 'image',
        key: 'rc-car/nonconformance',
        caption:
          'The defect that started it: an axle holder bore measured out of tolerance, flagged as non-conforming.',
      },
      {
        kind: 'image',
        key: 'rc-car/vision-webapp',
        caption:
          'The quality web app — bore detected, diameter measured, pass/fail returned to the operator.',
      },
      {
        kind: 'image',
        key: 'rc-car/vision-rig',
        caption: 'The inspection rig: Raspberry Pi and camera in a fixed-geometry mount.',
      },
      {
        kind: 'image',
        key: 'rc-car/anylogic-model',
        caption: 'The AnyLogic model of the assembly line used to locate the bottleneck.',
      },
      {
        kind: 'image',
        key: 'rc-car/anylogic-3d',
        caption: 'The 3D floor view of the simulated line.',
      },
      { kind: 'image', key: 'rc-car/waterjet', caption: 'Waterjet cutting the plate components.' },
      { kind: 'image', key: 'rc-car/axle-holder', caption: 'The FDM-printed axle holder.' },
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
      {
        src: '/models/rc-car-axle-holder.glb',
        label: 'Axle holder',
        caption: 'The FDM part whose bore diameter drove the whole quality investigation.',
      },
    ],

    chapters: [
      {
        code: '01',
        act: 'design',
        title: 'Design for the forty, not the one',
        body: 'Rear-wheel drive was chosen for controllability on the obstacle course. The harder constraint was never performance — it was that every dimension had to be producible forty times, on shared equipment, to a tolerance the bearings would accept.',
        model: {
          src: '/models/rc-car-drivetrain.glb',
          label: 'Drivetrain assembly',
          caption: 'The as-designed drivetrain. Orbit, explode, or switch to wireframe.',
        },
      },
      {
        code: '02',
        act: 'make',
        title: 'Where the variation showed up',
        body: 'The bearing bore in the axle holder was the tight feature: too small and the bearing will not seat, too large and the axle runs out. Across forty sets it was the dimension that decided whether an assembly worked at all.',
        media: {
          kind: 'image',
          key: 'rc-car/nonconformance',
          caption: 'A bore measured out of tolerance.',
        },
      },
      {
        code: '03',
        act: 'automate',
        title: 'Inspection that does not depend on a human',
        body: 'Rather than gauge every bore by hand, I built a vision system that detects the bore, measures its diameter, and rejects parts outside tolerance — consistent criteria applied to every part. Below is the operator-facing web app, and under it an interactive model of the inspection logic.',
        media: {
          kind: 'image',
          key: 'rc-car/vision-webapp',
          caption: 'The quality web app as the operator sees it — bore detected, diameter measured, verdict returned.',
        },
        interactive: 'vision-overlay',
      },
      {
        code: '04',
        act: 'automate',
        title: 'A digital twin of the line',
        body: 'Inspecting parts tells you nothing about whether the line can deliver forty cars on schedule. I built an AnyLogic model of the assembly line to see where work actually piled up, and to test throughput improvements without disturbing production.',
        media: {
          kind: 'image',
          key: 'rc-car/anylogic-model',
          caption: 'The AnyLogic discrete-event model of the assembly line, used to locate the bottleneck station.',
        },
      },
      {
        code: '05',
        act: 'prove',
        title: 'Why the scrap existed',
        body: 'Catching scrap is containment, not a fix. A designed experiment on the print parameters, analysed with ANOVA and regression, identified which factors genuinely drive bore variation — and those findings belong back in the print process and the nominal dimension.',
        interactive: 'spc-chart',
      },
    ],

    docs: [
      {
        label: 'Simulation modelling paper',
        href: '/docs/rc-car-simulation-paper.pdf',
        kind: 'paper',
        size: '2.2 MB',
      },
    ],
    stack: [
      'SolidWorks',
      'FDM / additive',
      'Waterjet',
      'Machine vision',
      'Raspberry Pi',
      'AnyLogic',
      'Design of experiments',
      'ANOVA',
      'Statistical process control',
    ],
    needsMetrics: true,
  },

  /* ================================================================== */
  /* 2. GE VERNOVA — the most senior role                                */
  /* ================================================================== */
  {
    id: 'ge-vernova',
    slug: 'circuit-breaker-standardization',
    act: 'make',
    spans: ['design', 'make', 'automate', 'prove'],
    title: 'Standardizing a Circuit Breaker Platform',
    subtitle: 'Cutting product proliferation and lifting assembly throughput',
    org: 'MIT × GE Vernova',
    period: '2025 — 2026',
    role: 'Lead Engineer',
    team: 'MIT–GE Vernova partnership, cross-functional',

    oneLiner:
      'A low-voltage breaker family had multiplied into an unmanageable catalogue. I rebuilt it as a standard base plus add-ons, digitized the line that assembles it, and simulated the whole thing against real production data before touching the floor.',
    cardMedia: {
      kind: 'image',
      key: 'ge-vernova/team',
      caption: 'The GE Vernova standardization team',
    },
    tags: ['Standardization', 'MES', 'Digital twin', 'Throughput'],
    headlineMetrics: [
      { value: '9', unit: 'stations', label: 'Assembly line digital twin' },
      { value: '6', unit: 'months', label: 'Industry partnership, as lead' },
      { value: '1', unit: 'paper', label: 'Sole author, in review' },
    ],
    featured: true,

    problem:
      'Product variants accumulate one reasonable decision at a time. Every new customer requirement justifies its own design, and nobody is accountable for the aggregate — until variety itself is the dominant cost driver, carrying its own components, documentation, and assembly learning curve. The question was whether the catalogue could be collapsed without reducing what a customer can actually buy.',
    did: [
      'Led the six-month MIT–GE Vernova partnership as lead engineer, and wrote the resulting paper as sole author.',
      'Developed an algorithmic standardization approach — a common standard base plus configurable add-ons — to collapse proliferation while preserving catalogue coverage.',
      'Designed and deployed a shop-floor MES that digitized production tracking, giving supervisors real-time visibility instead of end-of-week paperwork.',
      'Built an AnyLogic digital twin of a nine-station assembly line modelling material flow, labour utilisation, bottlenecks, and lead-time variability.',
      'Validated the twin against live shop-floor production data, then used the calibrated model to find high-impact process improvements.',
      'Worked across design, manufacturing, and operations to land the changes as continuous-improvement initiatives rather than a report nobody actions.',
    ],
    outcome: [
      'A standardization architecture that separates what every breaker shares from what only some need — turning variant count from an accident into a decision.',
      'A shop floor that reports on itself, with production events captured at the station by the operator as they happen.',
      'A validated simulation that turns "what if we move labour to station 6" from an argument into a number.',
      'The twin traced bottleneck behaviour back to variant mix — a design decision, not a manufacturing one. That is the loop closing.',
    ],

    chapters: [
      {
        code: '01',
        act: 'design',
        title: 'The proliferation problem',
        body: 'The fix is not fewer options for the customer — it is a standard base that carries the shared load, with add-ons that absorb the variation. I built the logic deciding which features belong to the base and which stay optional.',
        interactive: 'proliferation',
      },
      {
        code: '02',
        act: 'automate',
        title: 'Making the floor legible',
        body: 'You cannot balance a line you cannot see. Before the MES, production tracking lived on paper and in people\u2019s heads, so throughput questions took days to answer and the answers were estimates.',
      },
      {
        code: '03',
        act: 'automate',
        title: 'A twin of the real line',
        body: 'The nine-station model let me test changes at zero cost — move labour to the bottleneck, change station sequence, alter variant mix, and watch throughput and lead time respond. Calibrated against real production data, the numbers were arguments rather than guesses.',
        interactive: 'line-sim',
      },
    ],

    docs: [],
    stack: [
      'AnyLogic',
      'Discrete-event simulation',
      'MES architecture',
      'Design standardization',
      'Line balancing',
      'Throughput analysis',
    ],
    needsMetrics: true,
  },

  /* ================================================================== */
  /* 3. TERRAPROBE — design flagship, real demo video                    */
  /* ================================================================== */
  {
    id: 'terraprobe',
    slug: 'terraprobe',
    act: 'design',
    spans: ['design', 'automate', 'prove'],
    title: 'TerraProbe',
    subtitle: 'A portable, real-time soil sampling system for precision agriculture',
    org: 'Purdue ME Senior Design',
    period: '2024 — 2025',
    role: 'Design, manufacturing & test',
    team: 'Senior design team',

    oneLiner:
      'Soil testing normally means digging, bagging, shipping and waiting weeks. We designed and built a handheld system that takes clean samples at multiple depths and returns usable soil properties in the field.',
    cardMedia: {
      kind: 'video',
      key: 'terraprobe/sampling',
      caption: 'Sampling demonstration',
      loop: true,
    },
    tags: ['Mechanism design', 'Embedded', 'Prototyping', 'Dashboard'],
    headlineMetrics: [
      { value: 'Multi', unit: 'depth', label: 'Sealed sampling chambers' },
      { value: 'Real', unit: 'time', label: 'Field-side soil properties' },
    ],
    featured: true,

    problem:
      'Precision agriculture depends on knowing what the soil is doing at depth, but the standard workflow — dig, bag, ship, wait for a lab — is slow enough that the answer arrives after the decision had to be made. Any replacement has to survive being used by one person in a field, in soft soil, at a price a grower will actually pay.',
    did: [
      'Designed a hybrid auger-core sampling mechanism, combining an auger\u2019s penetration with a core sampler\u2019s intact-sample quality, under automated depth control.',
      'Developed sealed sample chambers so multi-depth samples do not cross-contaminate between strata.',
      'Built and instrumented the motor control system, including the electronics and firmware for depth actuation.',
      'Manufactured and tested the full system through an iterative build-and-validate cycle, from concept to working hardware.',
      'Built the dashboard that turns raw sensed soil properties into a crop recommendation a grower can act on.',
      'Held affordability and soft-soil compatibility as hard requirements rather than aspirations, because they decide whether the product is adoptable at all.',
    ],
    outcome: [
      'A working handheld prototype that samples multiple depths without cross-contamination, demonstrated end to end in soil.',
      'Soil properties surfaced in the field rather than weeks later in a lab report.',
      'A design deliberately constrained to soft soils and a low build cost — the conditions where the tool has a real market.',
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
        label: 'Electronic schematic',
        href: '/docs/terraprobe-schematic.pdf',
        kind: 'schematic',
        size: '1.1 MB',
      },
    ],
    stack: [
      'SolidWorks',
      'Mechanism design',
      'Automated depth control',
      'Embedded / Arduino',
      'Prototyping & DVT',
      'Python dashboard',
    ],
  },

  /* ================================================================== */
  /* 4. OFFSHORE DRONE — strong video evidence                           */
  /* ================================================================== */
  {
    id: 'offshore-drone',
    slug: 'offshore-drone-platform',
    act: 'design',
    spans: ['design', 'automate'],
    title: 'Offshore Drone Landing & Charging Platform',
    subtitle: 'Boat-mounted autonomous launch, recovery, securing and charging',
    org: 'MIT 2.014 — Industry sponsored',
    period: '2026',
    role: 'Platform subsystem owner',
    team: 'Platform, housing and stabilization subsystem teams',

    oneLiner:
      'Inspecting offshore infrastructure puts people in dangerous places. I designed and built the platform that lets an inspection drone land on a moving vessel, lock itself down, and recharge without a human touching it.',
    cardMedia: {
      kind: 'video',
      key: 'offshore-drone/platform-motion',
      caption: 'Platform mechanism in motion',
      loop: true,
    },
    tags: ['Mechanism design', 'Electromechanical', 'Contact charging', 'Integration'],
    headlineMetrics: [
      { value: '3', unit: 'subsystems', label: 'Integrated against' },
      { value: '1', unit: 'of 5', label: 'Duty-cycle stages owned' },
    ],

    problem:
      'Offshore inspection is labour-intensive and hazardous, which makes remote autonomous inspection a genuine market opportunity rather than a novelty. But a drone is only autonomous if it can complete its whole duty cycle unattended — transport, launch, recovery, securing, and charging — from a boat that will not hold still.',
    did: [
      'Designed and built the platform subsystem end to end: the landing surface, the clamping mechanism, and the contact charging interface.',
      'Created a landing environment that tolerates the approach accuracy a drone can realistically achieve on a moving vessel.',
      'Developed a clamping mechanism that secures the airframe against sea state once it is down.',
      'Achieved reliable contact charging, closing the cycle so the drone can redeploy without human handling.',
      'Integrated against the housing and stabilization subsystems, negotiating mechanical and functional interfaces across three teams.',
    ],
    outcome: [
      'A demonstrated platform that receives, clamps, and charges the drone as one sequence.',
      'Contact charging proven, which is the piece that makes repeated unattended sorties possible.',
      'A subsystem that integrated cleanly into the wider boat-mounted system at the sponsor review.',
    ],

    media: [
      {
        kind: 'video',
        key: 'offshore-drone/full-demo',
        caption: 'Full platform demonstration: landing, clamping, and charging.',
        wide: true,
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
        caption: 'Clamping the airframe into a secure position.',
        loop: true,
      },
      { kind: 'video', key: 'offshore-drone/test-1', caption: 'Bench testing the mechanism.', loop: true },
      { kind: 'video', key: 'offshore-drone/test-2', caption: 'Repeat cycle test.', loop: true },
      {
        kind: 'image',
        key: 'offshore-drone/context',
        caption: 'The inspection task this replaces: manual survey of offshore structures.',
      },
    ],

    stack: [
      'SolidWorks',
      'Mechanism & fixture design',
      'Electromechanical integration',
      'Contact charging',
      'Subsystem interfaces',
    ],
  },

  /* ================================================================== */
  /* 5. JOHN DEERE — leadership first                                    */
  /* ================================================================== */
  {
    id: 'john-deere',
    slug: 'john-deere-demand-forecasting',
    act: 'prove',
    spans: ['prove'],
    title: 'Parts Demand Forecasting for John Deere',
    subtitle: 'A year-long program and a twelve-person cross-functional team',
    org: 'Purdue Data Mine × John Deere',
    period: '2024 — 2025',
    role: 'Project Manager & Teaching Assistant',
    team: '12 students across engineering, business and data science',

    oneLiner:
      'I led a twelve-person team through a full-year parts demand forecasting program for John Deere — and the hard part was never the statistics, it was getting three disciplines to agree what a good forecast means.',
    cardMedia: { kind: 'image', key: 'projects/deere', caption: 'John Deere forecasting program' },
    tags: ['Forecasting', 'ARIMA', 'Team leadership', 'Demand planning'],
    headlineMetrics: [
      { value: '12', unit: 'students', label: 'Cross-functional team led' },
      { value: '12', unit: 'month', label: 'Forecast horizon delivered' },
      { value: '4', unit: 'models', label: 'Evaluated on RMSE and bias' },
    ],

    problem:
      'Service parts demand is intermittent, seasonal, and spread across a huge catalogue, which makes a single forecasting approach a bad bet. The program had to produce a defensible twelve-month forecast across many parts — and do it with a student team whose members each arrived with a different, individually defensible idea of what "accurate" means.',
    did: [
      'Led a year-long consulting project with 12 students to improve demand planning for John Deere, delivering 12-month forecasts and the decision support around them.',
      'Classified time-series data into behaviour buckets so each part group could be matched to an appropriate model rather than forced through one.',
      'Evaluated four forecasting models against RMSE and bias, treating over-prediction as a distinct failure mode rather than folding it into a single error number.',
      'Directed the modelling approach across ARIMA and exponential smoothing methods, and built models alongside the team rather than only reviewing theirs.',
      'Served as Teaching Assistant, responsible for the technical development of the students on the program.',
      'Previously directed a 6-month project with Inotiv and 10 undergraduates building operational dashboards across HR and supply chain data.',
    ],
    outcome: [
      'A twelve-month forecast across multiple part families, with model selection justified per demand pattern.',
      'Bias made explicit alongside RMSE, so the business could see when a model systematically over-ordered.',
      'A team that shipped: engineering, business, and data science students converged on one deliverable and one definition of quality.',
    ],

    interactive: 'forecast-chart',
    docs: [
      {
        label: 'Final presentation',
        href: '/docs/john-deere-final-presentation.pdf',
        kind: 'deck',
        size: '3.5 MB',
      },
      {
        label: 'Point forecasting analysis',
        href: '/docs/john-deere-point-forecasting.pdf',
        kind: 'deck',
        size: '2.1 MB',
      },
    ],
    stack: [
      'ARIMA',
      'Exponential smoothing',
      'Time-series analysis',
      'Python / R',
      'Project management',
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
    spans: ['automate', 'make'],
    title: 'Physics-Informed Model of Web Position',
    subtitle: 'Roll-to-roll film variation, modelled with the physics kept in',
    org: 'Large packaging manufacturer — industry data',
    period: '2025 — 2026',
    role: 'Modelling & process analysis',

    oneLiner:
      'Pure machine learning will happily predict a film position that violates conservation of momentum. Embedding the process physics gives you a model that still behaves once it leaves the training data — the prerequisite for using it in control.',
    cardMedia: {
      kind: 'image',
      key: 'profile/factory-floor',
      caption: 'Process engineering on the floor',
    },
    tags: ['Physics-informed ML', 'Process control', 'Web handling', 'Python'],
    headlineMetrics: [
      { value: 'Real', unit: 'production', label: 'Roll-to-roll line data' },
    ],

    problem:
      'Web handling is a continuous process where small lateral position errors compound downstream into scrap. It is also an area where a purely data-driven model is a liability: it extrapolates badly and gives you no mechanism to reason about, so you cannot safely put it in a control loop.',
    did: [
      'Built a physics-informed model of lateral web position variation from real production roll-to-roll data.',
      'Embedded the governing process relationships into the model structure so predictions stay physically admissible rather than merely well-fit.',
      'Characterized the sources of film position variation as a basis for control rather than after-the-fact reporting.',
      'Framed the result for closed-loop web guidance, where extrapolation behaviour matters more than in-sample accuracy.',
    ],
    outcome: [
      'A model that tracks observed variation and stays credible outside the training envelope.',
      'Recovered physical parameters that an unconstrained model cannot give you at all.',
    ],

    interactive: 'r2r-chart',
    stack: [
      'Physics-informed neural networks',
      'Universal differential equations',
      'Process control',
      'Python',
      'Time-series analysis',
    ],
    needsMetrics: true,
  },

  /* ================================================================== */
  /* 7. FREIGHT                                                          */
  /* ================================================================== */
  {
    id: 'freight',
    slug: 'truck-freight-pricing',
    act: 'prove',
    spans: ['prove'],
    title: 'What Actually Sets a Truck Freight Price',
    subtitle: 'Real freight data, exogenous market signals, and an honest model bake-off',
    org: 'Independent',
    period: '2025',
    role: 'Analysis & modelling',

    oneLiner:
      'Distance explains less of a freight rate than you would expect. I added market signals to real freight data and tested whether a transformer actually beats a well-tuned gradient-boosting baseline.',
    cardMedia: { kind: 'image', key: 'projects/ups', caption: 'Freight and logistics analysis' },
    tags: ['LightGBM', 'Transformers', 'Feature engineering', 'Logistics'],
    headlineMetrics: [{ value: '2', unit: 'models', label: 'Baseline vs transformer' }],

    problem:
      'Freight rate is only partly a function of the route. Market conditions a shipper does not control move price too, and separating the two matters for anyone planning logistics spend. The modelling question was whether a heavyweight sequence model earns its complexity against a strong classical baseline.',
    did: [
      'Analysed real truck freight data to characterize how price responds to distance and other route factors.',
      'Engineered exogenous market signal features to capture conditions outside the individual shipment.',
      'Established a LightGBM baseline as the benchmark to beat rather than as a foil.',
      'Evaluated a transformer-based time-series model against that baseline to quantify whether the added complexity paid for itself.',
    ],
    outcome: [
      'A quantified view of how much of freight price distance actually explains, and how much comes from market context.',
      'An honest baseline comparison — reporting that a simpler model held its own is a finding, not a failure.',
    ],

    interactive: 'forecast-chart',
    stack: [
      'LightGBM',
      'Transformer time-series models',
      'Feature engineering',
      'Python',
      'Freight data',
    ],
    needsMetrics: true,
  },

  /* ================================================================== */
  /* 8. PARKVUE                                                          */
  /* ================================================================== */
  {
    id: 'parkvue',
    slug: 'parkvue',
    act: 'design',
    spans: ['design', 'automate'],
    title: 'ParkVue',
    subtitle: 'Smart parking availability and reservation — and a $10K pitch win',
    org: 'Purdue JMEC — Silicon Valley Boilermaker Innovation Group',
    period: '2023',
    role: 'Co-founder',

    oneLiner:
      'We built ESP-32 occupancy sensing into a parking reservation product, pitched it against Purdue\u2019s startup cohort, and walked out with $10,000 in funding.',
    cardMedia: { kind: 'image', key: 'parkvue/01', caption: 'ParkVue system' },
    tags: ['ESP-32', 'IoT', 'Product strategy', 'Venture pitch'],
    headlineMetrics: [
      { value: '$10K', label: 'Funding won, SVBIG pitch' },
      { value: 'ESP-32', label: 'Occupancy sensing hardware' },
    ],

    problem:
      'Lots and garages are simultaneously full and underused — capacity exists but nobody can see it, so drivers circle and operators cannot price or allocate properly. Fixing that needs cheap sensing at every space, which is a hardware cost problem before it is a software one.',
    did: [
      'Co-developed a parking management system providing real-time space availability and smart reservation.',
      'Built the sensing and reservation stack on ESP-32 hardware, from occupancy detection through to user-facing availability.',
      'Made the commercial case as well as the technical one: market sizing, unit economics, and hardware cost at volume.',
      'Pitched to the JMEC Silicon Valley Boilermaker Innovation Group competition, which funds Purdue-originated startups.',
    ],
    outcome: [
      '$10,000 in kickstarter funding won on the strength of the pitch.',
      'A working prototype demonstrating real-time availability on low-cost hardware.',
    ],

    docs: [
      { label: 'Pitch deck', href: '/docs/parkvue-pitch-deck.pdf', kind: 'deck', size: '1.5 MB' },
    ],
    stack: ['ESP-32 / embedded', 'IoT sensing', 'Product & market strategy', 'Venture pitching'],
  },

  /* ================================================================== */
  /* 9. UPS                                                              */
  /* ================================================================== */
  {
    id: 'ups',
    slug: 'ups-partnership-modelling',
    act: 'prove',
    spans: ['prove'],
    title: 'Partnership Opportunity Modelling for UPS',
    subtitle: 'Predicting which companies are worth pursuing',
    org: 'Purdue Data Mine × UPS',
    period: '2022 — 2023',
    role: 'Undergraduate Data Science Researcher',

    oneLiner:
      'Given a history of partnerships that worked, which companies look like the next ones? We built the model and, more usefully, the web app that let stakeholders interrogate it.',
    cardMedia: { kind: 'image', key: 'projects/ups-poster', caption: 'UPS partnership modelling' },
    tags: ['Supervised learning', 'Web app', 'Model validation'],
    headlineMetrics: [],

    problem:
      'Business development teams pick partnership targets largely on judgement. The question was whether the characteristics of historically successful partnerships carry enough signal to rank new candidates.',
    did: [
      'Built a predictive model identifying high-potential partnership targets from the signature of past successful partnerships.',
      'Applied both supervised and unsupervised methods, and owned model validation and testing.',
      'Developed a web application presenting results as something a stakeholder could interrogate directly rather than a static deck.',
    ],
    outcome: [
      'A ranked view of partnership candidates grounded in historical outcomes.',
      'An early lesson that has stuck: a model nobody uses has no value, so the interface is part of the deliverable.',
    ],

    stack: ['Supervised & unsupervised learning', 'Python', 'Model validation', 'Web application'],
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
export const otherProjects = projects.filter((p) => !p.featured)
export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug)
export const projectsByAct = (act: ActId) => projects.filter((p) => p.act === act)
