import type { ActId } from './acts'

/**
 * Project narratives are written to answer "what did you own and what changed",
 * not "what tools did you use". Tools are listed separately and deliberately
 * demoted — they are evidence, not the headline.
 *
 * `spans` lists every act a project touches; `act` is the one it files under.
 */

export type InteractiveId =
  | 'line-sim'
  | 'proliferation'
  | 'spc-chart'
  | 'vision-overlay'
  | 'model-viewer'
  | 'forecast-chart'
  | 'r2r-chart'

export interface Chapter {
  code: string
  act: ActId
  title: string
  body: string
  interactive?: InteractiveId
}

export interface Project {
  id: string
  act: ActId
  spans: ActId[]
  title: string
  subtitle: string
  org: string
  period: string
  role: string
  /** One sentence, the "so what". Shown on the card. */
  hook: string
  summary: string
  /** Verb-led statements of ownership. */
  owned: string[]
  metrics?: { value: string; unit?: string; label: string }[]
  stack: string[]
  /** Keys into media.generated.json */
  hero?: string
  gallery?: { prefix: string; count: number }
  /** Featured projects get a full case-study treatment. */
  featured?: boolean
  /** Multi-act case studies break into chapters that walk the loop. */
  chapters?: Chapter[]
  interactive?: InteractiveId
  links?: { label: string; href: string }[]
  /** Flagged where Sankaran still needs to supply a hard number. */
  needsMetrics?: boolean
}

export const projects: Project[] = [
  /* ==================================================================== */
  /* FLAGSHIP — spans the entire loop, and the most senior role he's held. */
  /* ==================================================================== */
  {
    id: 'ge-vernova',
    act: 'make',
    spans: ['design', 'make', 'automate', 'prove'],
    title: 'Standardizing a Low-Voltage Circuit Breaker Platform',
    subtitle: 'Cutting product proliferation and lifting assembly throughput',
    org: 'MIT × GE Vernova',
    period: '2025 — 2026',
    role: 'Lead Engineer',
    hook: 'A product family had multiplied into an unmanageable catalogue. I rebuilt it as a standard base plus add-ons, digitized the line that builds it, and simulated the whole thing before touching the floor.',
    summary:
      'A six-month industry partnership between MIT Mechanical Engineering and GE Vernova, which I led as sole author of the resulting paper. Low-voltage circuit breaker designs had proliferated to the point where variety itself was the cost driver — every variant carrying its own components, documentation, and assembly learning curve. The work attacked that from all four directions at once: a standardization strategy to collapse the catalogue, an MES to make the floor legible, and a digital twin to test changes before committing to them.',
    owned: [
      'Led a six-month MIT–GE Vernova partnership as the lead engineer and sole author of the resulting paper, currently in review.',
      'Developed an algorithmic standardization approach — a common standard base plus configurable custom add-ons — to collapse product proliferation without losing catalogue coverage.',
      'Designed and deployed a shop-floor MES that digitized production tracking, giving supervisors real-time visibility and putting accountability on the operation rather than the paperwork.',
      'Built an AnyLogic digital twin of a nine-station assembly line modelling material flow, labour utilization, bottlenecks, and lead-time variability.',
      'Validated twin predictions against live shop-floor production data, then used the calibrated model to locate high-impact process improvements and cost-reduction opportunities.',
      'Worked cross-functionally with design, manufacturing, and operations teams to land the changes as continuous-improvement initiatives rather than a report.',
    ],
    metrics: [
      { value: '9', unit: 'stations', label: 'Assembly line modelled' },
      { value: '6', unit: 'months', label: 'Industry partnership' },
      { value: '1', unit: 'paper', label: 'Sole author, in review' },
    ],
    needsMetrics: true,
    stack: [
      'AnyLogic',
      'Discrete-event simulation',
      'MES architecture',
      'Design standardization',
      'Line balancing',
      'Throughput analysis',
    ],
    featured: true,
    chapters: [
      {
        code: '01',
        act: 'design',
        title: 'The proliferation problem',
        body: 'Variants accumulate one reasonable decision at a time. Each new customer requirement justifies its own design, and nobody is accountable for the aggregate. The fix is not fewer options for the customer — it is a standard base that carries the shared load, with add-ons that absorb the variation. I built the logic that decides which features belong to the base and which stay optional.',
        interactive: 'proliferation',
      },
      {
        code: '02',
        act: 'make',
        title: 'Making the floor legible',
        body: 'You cannot balance a line you cannot see. Before the MES, production tracking lived on paper and in people\u2019s heads, which meant throughput questions took days to answer and the answers were estimates. The system I deployed captured production events as they happened, at the station, from the operator.',
      },
      {
        code: '03',
        act: 'automate',
        title: 'A twin of the real line',
        body: 'The nine-station model let me test changes at zero cost. Move labour to the bottleneck, change the station sequence, alter the mix of variants — and watch throughput and lead time respond. Because the model was calibrated against real production data, the numbers were arguments rather than guesses.',
        interactive: 'line-sim',
      },
      {
        code: '04',
        act: 'prove',
        title: 'Closing the loop',
        body: 'The twin\u2019s findings pointed back at the catalogue. Bottleneck behaviour was driven by variant mix, which is a design decision, not a manufacturing one. That is the loop closing: a simulation of the floor changing what the product should be.',
      },
    ],
  },

  /* ==================================================================== */
  /* FLAGSHIP — the loop in miniature, one project, all four acts.        */
  /* ==================================================================== */
  {
    id: 'rc-car',
    act: 'make',
    spans: ['design', 'make', 'automate', 'prove'],
    title: 'Forty Drivetrains',
    subtitle: 'Design → mass manufacture → machine-vision QC → process control',
    org: 'Purdue Mechanical Engineering',
    period: '2024',
    role: 'Drivetrain design & quality engineering',
    hook: 'The whole loop in one project: I designed a rear-wheel drivetrain, manufactured forty of them, built a vision system to reject bad parts, then ran a DOE to find out why the bad parts existed at all.',
    summary:
      'A class of engineers was tasked with manufacturing forty complete RC cars, split into subsystem teams that had to converge on a single integrated design capable of running an obstacle course. I worked in a team of four on the drivetrain. What makes this the clearest demonstration of how I work is that it did not stop at parts delivered — I built the inspection system that caught defective axle holders, and then the designed experiment that explained where the defects came from.',
    owned: [
      'Designed a rear-wheel-drive drivetrain for controllability in a four-person subsystem team, negotiating interfaces with the other subsystem teams to converge on one integrated vehicle design.',
      'Manufactured forty production drivetrains, moving from a design that worked once to a process that worked repeatably.',
      'Designed and built a machine-vision quality control system that automatically rejects scrap axle holders by measuring bore diameter — replacing subjective manual inspection with a measured pass/fail.',
      'Ran a designed experiment on FDM-printed axle holders to identify which print parameters drive bearing-hole diameter variation, using ANOVA and regression-based modelling.',
      'Established statistical process control on the resulting bore dimension so the process was monitored rather than merely inspected.',
      'Fed the significant parameters back into how the part is printed — the correction belongs upstream of inspection, not downstream of it.',
    ],
    metrics: [
      { value: '40', unit: 'units', label: 'Drivetrains manufactured' },
      { value: '100', unit: '%', label: 'Bores inspected, automatically' },
      { value: '4', unit: 'acts', label: 'Design → make → automate → prove' },
    ],
    needsMetrics: true,
    stack: [
      'SolidWorks',
      'FDM / additive manufacturing',
      'Machine vision',
      'Design of experiments',
      'ANOVA',
      'Statistical process control',
      'Regression modelling',
    ],
    featured: true,
    chapters: [
      {
        code: '01',
        act: 'design',
        title: 'Design for the forty, not the one',
        body: 'A rear-wheel-drive layout was chosen for controllability on the obstacle course. The harder constraint was not performance — it was that every dimension we specified had to be producible forty times by classmates, on shared equipment, to a tolerance the bearings would actually accept. Interfaces with the chassis and steering teams had to be agreed before any of us could commit geometry.',
        interactive: 'model-viewer',
      },
      {
        code: '02',
        act: 'make',
        title: 'Where the variation showed up',
        body: 'The bearing bore in the axle holder was the tight feature: too small and the bearing will not seat, too large and the axle runs out. Printed parts do not honour a nominal diameter for free. Across forty sets, the bore was the dimension that decided whether an assembly worked.',
      },
      {
        code: '03',
        act: 'automate',
        title: 'Inspection that does not depend on a human',
        body: 'Rather than gauge every bore by hand, I built a vision system that detects the bore, measures its diameter, and rejects parts outside tolerance. Consistent criteria, applied to every part, at a speed that does not gate production.',
        interactive: 'vision-overlay',
      },
      {
        code: '04',
        act: 'prove',
        title: 'Why the scrap existed',
        body: 'Catching scrap is containment, not a fix. A designed experiment on the print parameters, analysed with ANOVA and regression, identified which factors actually drive bore variation — separating the significant from the merely suspected. Those findings go back to the print process and the nominal dimension, which is the only place the problem can genuinely be solved.',
        interactive: 'spc-chart',
      },
    ],
  },

  /* ==================================================================== */
  /* DESIGN                                                               */
  /* ==================================================================== */
  {
    id: 'terraprobe',
    act: 'design',
    spans: ['design', 'automate', 'prove'],
    title: 'TerraProbe',
    subtitle: 'A portable, real-time soil sampling system for precision agriculture',
    org: 'Purdue ME Senior Design',
    period: '2024 — 2025',
    role: 'Design, manufacturing & test',
    hook: 'Soil testing means digging, bagging, shipping, and waiting. We built a handheld system that samples multiple depths and returns usable soil properties on the spot.',
    summary:
      'Our senior design capstone: design, manufacture, and test a working product. TerraProbe is a portable real-time soil testing solution built around a hybrid auger-core mechanism with automated depth control and sealed sample chambers, so a single operator can take clean multi-depth samples without cross-contamination. Sampled properties are processed and visualized to support crop management decisions in the field rather than weeks later. The design priorities were the unglamorous ones that decide adoption: ease of use, affordability, and behaviour in soft soils.',
    owned: [
      'Designed a hybrid auger-core sampling mechanism — combining the penetration of an auger with the intact-sample quality of a core — with automated depth control.',
      'Developed sealed sample chambers enabling efficient multi-depth sampling without cross-contamination between strata.',
      'Manufactured and tested the full system through an iterative build-and-validate cycle, taking it from concept to working hardware.',
      'Built the data path that turns raw sensed soil properties into visualizations a grower can act on.',
      'Held affordability and soft-soil compatibility as hard design constraints, not aspirations — they determine whether the product is adoptable at all.',
    ],
    metrics: [
      { value: 'Multi', unit: 'depth', label: 'Sealed sampling chambers' },
      { value: 'Real', unit: 'time', label: 'Field-side soil properties' },
    ],
    stack: [
      'SolidWorks',
      'Mechanism design',
      'Automated depth control',
      'Embedded sensing',
      'Prototyping & DVT',
      'Data visualization',
    ],
    hero: 'terraprobe/00',
    gallery: { prefix: 'terraprobe', count: 30 },
    featured: true,
    interactive: 'model-viewer',
  },

  {
    id: 'offshore-drone',
    act: 'design',
    spans: ['design', 'automate'],
    title: 'Offshore Drone Landing & Charging Platform',
    subtitle: 'Boat-mounted autonomous launch, recovery, and contact charging',
    org: 'Purdue Mechanical Engineering',
    period: '2024',
    role: 'Platform subsystem owner',
    hook: 'Inspecting offshore infrastructure puts people in dangerous places. I designed the platform that lets a drone leave, land, lock down, and recharge itself at sea.',
    summary:
      'Offshore infrastructure inspection is labour-intensive and hazardous, which makes remote autonomous inspection a real market opportunity rather than a novelty. Our team developed a cohesive boat-mounted support system that semi-autonomously manages a drone offshore across its whole duty cycle: transportation, launch, recovery, securing, and charging. I owned the platform subsystem, integrating with the housing and stabilization subsystems the other teams built.',
    owned: [
      'Designed and built the platform subsystem end to end — the landing surface, the clamping mechanism, and the contact charging interface.',
      'Created a landing environment that tolerates the approach accuracy a drone can actually achieve on a moving vessel.',
      'Developed a clamping mechanism that secures the airframe against sea state once it is down.',
      'Achieved reliable contact charging, closing the loop so the drone can redeploy without human handling.',
      'Integrated the subsystem against the housing and stabilization subsystems, negotiating the mechanical and functional interfaces between three teams.',
    ],
    stack: [
      'SolidWorks',
      'Mechanism & fixture design',
      'Electromechanical integration',
      'Subsystem interface management',
      'Prototyping',
    ],
  },

  /* ==================================================================== */
  /* AUTOMATE                                                             */
  /* ==================================================================== */
  {
    id: 'roll-to-roll',
    act: 'automate',
    spans: ['automate', 'make'],
    title: 'Physics-Informed Model of Web Position',
    subtitle: 'Roll-to-roll film variation, modelled with the physics kept in',
    org: 'Large packaging manufacturer (industry data)',
    period: '2025 — 2026',
    role: 'Modelling & process analysis',
    hook: 'Pure machine learning will happily predict a film position that violates conservation of momentum. Embedding the process physics gives you a model that behaves when the data runs out.',
    summary:
      'Using production data from a large packaging manufacturer, I built a physics-informed model of lateral film position variation in a roll-to-roll line. Web handling is a continuous process where small position errors compound downstream into scrap, and it is an area where a purely data-driven model is a liability: it extrapolates badly and offers no mechanism to reason about. Constraining the learned model with the governing process physics produces something that both fits the observed variation and stays credible outside the training envelope — the prerequisite for using it in control.',
    owned: [
      'Built a physics-informed model of lateral web position variation from real production roll-to-roll data.',
      'Embedded the governing process relationships directly into the model structure so predictions remain physically admissible rather than merely well-fit.',
      'Characterized the sources of film position variation as a basis for process control rather than post-hoc reporting.',
      'Framed the result for use in closed-loop web guidance, where extrapolation behaviour matters more than in-sample accuracy.',
    ],
    stack: [
      'Physics-informed neural networks',
      'Universal differential equations',
      'Process control',
      'Python',
      'Time-series analysis',
    ],
    interactive: 'r2r-chart',
    needsMetrics: true,
  },

  /* ==================================================================== */
  /* PROVE                                                                */
  /* ==================================================================== */
  {
    id: 'john-deere',
    act: 'prove',
    spans: ['prove'],
    title: 'Parts Demand Forecasting for John Deere',
    subtitle: 'A year-long program, a twelve-person cross-functional team',
    org: 'Purdue Data Mine × John Deere',
    period: 'Jun 2021 — May 2025',
    role: 'Project Manager & Teaching Assistant',
    hook: 'I led a twelve-person team of engineering, business, and data science students through a full-year forecasting program for John Deere — and the hard part was never the statistics.',
    summary:
      'After coming up through The Data Mine as a student, I was given a year-long parts demand forecasting project for John Deere to lead. The modelling used statistical time-series methods — ARIMA and exponential smoothing — against complex, intermittent parts demand. The genuinely difficult work was managerial: getting engineering, business, and data science students to agree on what a good forecast even means, when each discipline arrives with a different definition and each definition is defensible.',
    owned: [
      'Led a year-long parts demand forecasting program for John Deere as Project Manager, spanning a full academic cycle.',
      'Managed and mentored a twelve-person team drawn from engineering, business, and data science, and built models alongside them rather than only reviewing.',
      'Directed the modelling approach across ARIMA and exponential smoothing methods on complex parts demand time series.',
      'Translated between disciplines — reconciling how an engineer, an analyst, and a business student each judge forecast quality — to keep one team pointed at one deliverable.',
      'Served as Teaching Assistant, responsible for the technical development of students on the program.',
    ],
    metrics: [
      { value: '12', unit: 'students', label: 'Cross-functional team led' },
      { value: '1', unit: 'year', label: 'Program duration' },
    ],
    stack: [
      'ARIMA',
      'Exponential smoothing',
      'Time-series analysis',
      'Python / R',
      'Project management',
      'Technical mentorship',
    ],
    hero: 'projects/deere',
    interactive: 'forecast-chart',
  },

  {
    id: 'freight',
    act: 'prove',
    spans: ['prove'],
    title: 'What Actually Sets a Truck Freight Price',
    subtitle: 'Real freight data, exogenous market signals, and a fair model bake-off',
    org: 'Independent',
    period: '2025',
    role: 'Analysis & modelling',
    hook: 'Distance explains less of a freight rate than you would expect. I added market signals to real freight data and tested whether a transformer actually beats a well-tuned baseline.',
    summary:
      'An analysis of real truck freight data, extended with exogenous market signal data, to understand how price relates to distance and to the wider market conditions a shipper does not control. The modelling half was deliberately structured as an honest comparison: a strong gradient-boosting baseline in LightGBM against a transformer-based time-series model, to test whether the additional complexity buys real accuracy. Reporting a negative result where one exists is part of the point — an unbeaten baseline is a finding, not a failure.',
    owned: [
      'Analysed real truck freight data to characterize how price responds to distance and other route factors.',
      'Engineered exogenous market signal features to capture conditions outside the individual shipment.',
      'Established a LightGBM baseline as the benchmark to beat, rather than as a foil.',
      'Evaluated a transformer-based time-series model against that baseline to quantify whether the added complexity was justified.',
    ],
    stack: [
      'LightGBM',
      'Transformer time-series models',
      'Feature engineering',
      'Python',
      'Freight & logistics data',
    ],
    interactive: 'forecast-chart',
    needsMetrics: true,
  },

  {
    id: 'ups',
    act: 'prove',
    spans: ['prove'],
    title: 'Partnership Opportunity Modelling for UPS',
    subtitle: 'Predicting which companies are worth pursuing',
    org: 'Purdue Data Mine × UPS',
    period: '2022 — 2023',
    role: 'Undergraduate Data Science Researcher',
    hook: 'Given a history of partnerships that worked, which companies look like the next ones?',
    summary:
      'A Data Mine collaboration with UPS, working in a mixed graduate and undergraduate team to build a predictive model identifying high-potential companies for future partnerships based on the characteristics of past successful ones. Alongside the model we built a web application so the results were explorable by the people who would act on them rather than delivered as a static deck — my first lesson in the fact that an unused model has no value.',
    owned: [
      'Built a predictive model identifying high-potential partnership targets from the signature of historically successful partnerships.',
      'Applied both supervised and unsupervised methods, and owned the model validation and testing.',
      'Developed a web application presenting the model results as something a stakeholder could interrogate directly.',
    ],
    stack: ['Supervised & unsupervised learning', 'Python', 'Model validation', 'Web application'],
    hero: 'projects/ups',
  },

  /* ==================================================================== */
  /* ENTREPRENEURSHIP                                                     */
  /* ==================================================================== */
  {
    id: 'parkvue',
    act: 'design',
    spans: ['design', 'automate'],
    title: 'ParkVue',
    subtitle: 'Smart parking availability and reservation — and a $10K pitch win',
    org: 'Purdue JMEC — Silicon Valley Boilermaker Innovation Group',
    period: '2023',
    role: 'Co-founder',
    hook: 'We built ESP-32-based occupancy sensing into a parking reservation product, pitched it against Purdue\u2019s startup cohort, and walked out with $10,000 in funding.',
    summary:
      'A parking management system that optimizes utilization in lots and garages through real-time availability tracking and smart reservation, built on ESP-32 hardware. We took it through the John Martinson Entrepreneurial Center\u2019s Silicon Valley Boilermaker Innovation Group competition, which funds startups originating at Purdue, and won $10,000 in kickstarter funding on the strength of the pitch. Worth including less for the technology than for what it required: sizing a market, costing hardware at volume, and defending both to investors.',
    owned: [
      'Co-developed a parking management system providing real-time space availability and smart reservation.',
      'Built the sensing and reservation stack on ESP-32 hardware — occupancy detection through to user-facing availability.',
      'Pitched to the JMEC Silicon Valley Boilermaker Innovation Group competition and secured $10,000 in startup funding.',
      'Made the commercial case as well as the technical one: market sizing, unit economics, and hardware cost at volume.',
    ],
    metrics: [
      { value: '$10K', label: 'Funding won, SVBIG pitch' },
      { value: 'ESP-32', label: 'Occupancy sensing hardware' },
    ],
    stack: ['ESP-32 / embedded', 'IoT sensing', 'Product & market strategy', 'Venture pitching'],
    hero: 'parkvue/01',
    gallery: { prefix: 'parkvue', count: 13 },
  },
]

export const featuredProjects = projects.filter((p) => p.featured)

export const projectsByAct = (act: ActId) => projects.filter((p) => p.act === act)

export const projectById = (id: string) => projects.find((p) => p.id === id)
