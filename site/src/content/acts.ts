/**
 * The four acts of the loop. These are the site's chapter spine and also the
 * legend for the hero's 3D loop — index order is the direction of travel.
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
  /** Angle on the hero loop, degrees, 0 = right, counter-clockwise. */
  angle: number
}

export const acts: Act[] = [
  {
    id: 'design',
    index: 0,
    code: '01',
    verb: 'Design it',
    title: 'Design & Product Development',
    question: 'Can it be built at all — and can it be built at volume?',
    body: 'Concept through validated hardware. Mechanisms, tolerance stack-ups, and the DFM calls made early enough to still be cheap. Every constraint I accept here becomes someone else\u2019s process problem downstream, so I try to accept the right ones.',
    angle: 90,
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
  },
  {
    id: 'prove',
    index: 3,
    code: '04',
    verb: 'Prove it',
    title: 'Operations Intelligence',
    question: 'Did it work, and what should the next revision change?',
    body: 'Forecasting, throughput modelling, and process analytics — used as evidence for engineering decisions rather than as an end in itself. This is the return path of the loop: what the floor and the supply chain learned, handed back to design.',
    angle: 180,
  },
]

export const actById = Object.fromEntries(acts.map((a) => [a.id, a])) as Record<
  ActId,
  Act
>
