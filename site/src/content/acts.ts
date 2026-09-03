/**
 * The four acts of the loop. These are the site's chapter spine, the legend for
 * the interactive loop diagram, and the filter axis on the projects page , 
 * index order is the direction of travel.
 *
 * Each act carries two registers of copy:
 *   verb/title/question , terse, for rails, chips and chapter headers.
 *   name/claim/tools, the "How I work" pillar, where the argument is made.
 */

export type ActId = 'design' | 'make' | 'automate' | 'prove'

export interface Act {
  id: ActId
  index: number
  /** Two-character code used on the process rail and node markers. */
  code: string
  verb: string
  title: string
  question: string
  body: string
  /** Angle on the loop diagram, degrees, 0 = right, counter-clockwise. */
  angle: number

  /* ---- pillar register ---- */
  /** Short label for the loop diagram and pillar switcher. */
  name: string
  /** The one-line argument for this stage, written in first person. */
  claim: string
  /** Photograph shown when the pillar is open. */
  photo: { media: string; alt: string }
  /** Named, checkable capability, tools first, methods second. */
  tools: string[]
  /** What this stage hands to the next one. */
  handoff: string
}

export const acts: Act[] = [
  {
    id: 'design',
    index: 0,
    code: '01',
    verb: 'Design it',
    title: 'Design & Product Development',
    question: 'Can it be built at all, and can it be built at volume?',
    body: 'Concept through validated hardware. Mechanisms, tolerance stack-ups, and the DFM calls made early enough to still be cheap. Every constraint I accept here becomes someone else\u2019s process problem downstream, so I try to accept the right ones.',
    angle: 90,

    name: 'Design',
    claim: 'Ideas and innovation, taken from concept to working hardware.',
    photo: {
      media: 'carousel/05-capstone',
      alt: 'TerraProbe at the Purdue Mechanical Engineering capstone showcase.',
    },
    tools: [
      'Siemens NX',
      'Fusion 360',
      'SolidWorks',
      'Design for Manufacturing',
      'Arduino',
      'Python',
      'MATLAB',
      'C/C++',
    ],
    handoff: 'Hands manufacturing a geometry and a tolerance budget.',
  },
  {
    id: 'make',
    index: 1,
    code: '02',
    verb: 'Make it',
    title: 'Industrialization & Process Engineering',
    question: 'Where does the variation come from, and what does it cost?',
    body: 'Taking a design that works once and making it work forty times, or forty thousand. Process characterization, capability studies, line balancing, and the standardization work that stops a product family from quietly multiplying into an unmanageable catalogue.',
    angle: 0,

    name: 'Manufacture',
    claim: 'I build systems to scale manufacturing, not just to make things.',
    photo: {
      media: 'carousel/01-floor',
      alt: 'The circuit breaker line at GE Vernova.',
    },
    tools: [
      'Statistical Process Control (SPC)',
      'Design of Experiments',
      'ANOVA',
      'Process Capability (Cp, Cpk)',
      'Line Balancing & Takt',
      'LEAN',
      'CNC Machining',
      '3D Printing (FDM)',
    ],
    handoff: 'Hands automation a process and its known failure modes.',
  },
  {
    id: 'automate',
    index: 2,
    code: '03',
    verb: 'Automate it',
    title: 'Automation, Controls & Digital Systems',
    question: 'How do we catch the defect without a human watching?',
    body: 'Machine vision inspection, shop-floor MES, and digital twins of real production lines. The goal is a floor that reports on itself: variation detected as it happens, not discovered at final assembly.',
    angle: 270,

    name: 'Digital Thread',
    claim: 'The station, the line and the enterprise, wired into one system.',
    photo: {
      media: 'ge-vernova/mes-ipad',
      alt: 'A live production-log MES running at an assembly station.',
    },
    tools: [
      'MES Design & Deployment',
      'Quality Vision Systems',
      'AnyLogic (Digital Twin Simulations)',
      'ISA-95 Architecture',
      'Python',
      'SQL',
      'Microcontroller Programming',
      'Discrete Event/Time Simulations',
      'Time Series Models (ARIMA, Exponential Smoothing)',
    ],
    handoff: 'Hands operations a floor that reports on itself.',
  },
  {
    id: 'prove',
    index: 3,
    code: '04',
    verb: 'Prove it',
    title: 'Operations Intelligence',
    question: 'Did it work, and what should the next revision change?',
    body: 'Forecasting, throughput modelling, and process analytics, used as evidence for engineering decisions rather than as an end in itself. This is the return path of the loop: what the floor and the supply chain learned, handed back to design.',
    angle: 180,

    name: 'Business Value',
    claim: 'Engineering decisions defended with operating numbers.',
    photo: {
      media: 'carousel/03-fred-poster',
      alt: 'Presenting the operating and financial model for MIT’s FrED Factory.',
    },
    tools: [
      'Cost, Staffing & Operating Models',
      'Business Case & Proposal Development',
      'Throughput & Bottleneck Analysis',
      'Demand Forecasting (ARIMA, LightGBM)',
      'KPI Definition & Reporting',
      'PowerBI / Spotfire, Python, R, SQL',
    ],
    handoff: 'Hands design the evidence for the next revision.',
  },
]

export const actById = Object.fromEntries(acts.map((a) => [a.id, a])) as Record<ActId, Act>

/** Arc on the loop diagram that this act owns, in degrees. */
export const actArc = (act: Act) => [act.angle - 45, act.angle + 45] as const
