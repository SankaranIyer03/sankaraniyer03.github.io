/**
 * Positioning copy. Every headline on the site resolves back to the thesis here:
 * the four stages of a product's life are one job, and the handoffs are where
 * cost, quality and schedule are actually won or lost.
 */

export const profile = {
  name: 'Sankaran Iyer',
  role: 'Manufacturing Systems & Operations Engineer',
  tagline: 'I take products from CAD to shop floor to closed loop.',

  headline: {
    lead: 'Design it.',
    beats: ['Make it.', 'Automate it.', 'Prove it.'],
  },

  /** The one sentence to read if you read nothing else. */
  standfirst:
    'I work on manufacturing systems, processes and operations — and build the digital tools that connect the shop floor to the supply chain and the business case.',

  /**
   * Four facts that establish scale and seniority before anyone scrolls.
   * Every one is verifiable from the experience section below.
   */
  proof: [
    { value: '$10MM', label: 'Smart-plant proposals led', context: 'Rockwell Automation' },
    { value: '75%', label: 'Fewer non-conforming line items', context: 'GE Aerospace' },
    { value: '139', label: 'Sites scaled to', context: 'Deloitte' },
    { value: '12', label: 'Engineers led', context: 'John Deere program' },
  ],

  /** Used for the portrait; shot on a real factory floor, not a studio. */
  portrait: 'profile/headshot',
  floorPhoto: 'profile/factory-floor',

  thesis: {
    kicker: 'The thesis',
    heading: 'Most engineers own one stage. I own the handoffs.',
    body: [
      'A product passes through four hands on its way to a customer. Design hands a model to manufacturing. Manufacturing hands a process to controls. Controls generates data that someone else eventually reads. Every one of those handoffs is a wall, and walls are where cost, quality, and schedule quietly go to die.',
      'I work on both sides of all three. Design decisions determine what is manufacturable. Manufacturing creates variation. Automation contains that variation. Data explains it — and the explanation belongs back in the design.',
      'It is not a pipeline. It is a loop, and the whole point is to close it.',
    ],
    loopStatement:
      'Design decisions determine what is manufacturable. Manufacturing creates variation. Automation controls variation. Data explains it — and feeds it back into design.',
  },

  education: [
    {
      school: 'Massachusetts Institute of Technology',
      abbr: 'MIT',
      degree: 'M.Eng., Mechanical Engineering',
      focus: 'Advanced Manufacturing & Design',
      period: 'Aug 2025 — Jul 2026',
    },
    {
      school: 'Purdue University',
      abbr: 'Purdue',
      degree: 'B.S., Mechanical Engineering',
      focus: 'Applications of Data Science certificate',
      period: 'Aug 2021 — May 2025',
    },
  ],

  /**
   * Capabilities grouped by where they sit in the loop — deliberately replaces
   * the old "MATLAB 90%" progress bars, which read junior and described
   * languages rather than engineering capability.
   */
  toolbox: [
    {
      act: 'design',
      label: 'Design & Product Development',
      items: [
        'SolidWorks / CAD',
        'GD&T and tolerance stack-up',
        'DFM / DFA',
        'FEA',
        'Mechanism & drivetrain design',
        'Prototyping and design validation testing',
      ],
    },
    {
      act: 'make',
      label: 'Manufacturing & Process Engineering',
      items: [
        'Statistical process control',
        'Design of experiments / ANOVA',
        'Process capability (Cp, Cpk)',
        'CNC, casting, injection moulding, FDM',
        'Assembly line balancing',
        'Lean / continuous improvement',
      ],
    },
    {
      act: 'automate',
      label: 'Automation, Controls & Digital Systems',
      items: [
        'Machine vision inspection',
        'MES design and deployment',
        'Digital twin simulation (AnyLogic)',
        'Discrete-event & agent-based modelling',
        'Physics-informed modelling',
        'ESP-32 / embedded sensing',
      ],
    },
    {
      act: 'prove',
      label: 'Operations Intelligence',
      items: [
        'Demand forecasting (ARIMA, exponential smoothing)',
        'Gradient boosting (LightGBM, XGBoost)',
        'Transformer time-series models',
        'Python, R, MATLAB, C/C++, SQL',
        'Throughput & bottleneck analysis',
        'KPI definition and reporting',
      ],
    },
  ],

  links: {
    email: 'sankaran.iyer2003@gmail.com',
    linkedin: 'https://www.linkedin.com/in/siyer03/',
    github: 'https://github.com/SankaranIyer03',
    scholarPaper:
      'https://ift.onlinelibrary.wiley.com/doi/epdf/10.1111/1750-3841.71291',
  },
} as const
