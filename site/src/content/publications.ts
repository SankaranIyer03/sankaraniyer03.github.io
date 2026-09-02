export interface Publication {
  id: string
  title: string
  venue: string
  status: 'published' | 'in-review'
  year: string
  authorship: string
  abstract: string
  /** Results worth stating as numbers. */
  results?: { value: string; label: string }[]
  href?: string
  doi?: string
  tags: string[]
}

export const publications: Publication[] = [
  {
    id: 'circuit-breaker',
    title:
      'Standardization of Low-Voltage Circuit Breaker Components and Designs to Reduce Product Proliferation and Improve Manufacturing Throughput',
    venue: 'MIT Mechanical Engineering × GE Vernova',
    status: 'in-review',
    year: '2026',
    authorship: 'Sole author',
    abstract:
      'A six-month industry partnership examining how product proliferation in a low-voltage circuit breaker family drives manufacturing cost, and how an algorithmic standard-base-plus-add-on architecture can collapse that variety without reducing catalogue coverage. The work pairs the design standardization strategy with a deployed shop-floor MES and an AnyLogic digital twin of a nine-station assembly line, validated against live production data, to quantify the throughput and lead-time consequences.',
    results: [
      { value: '9 stations', label: 'Assembly line digital twin' },
      { value: 'Validated', label: 'Against live production data' },
    ],
    tags: [
      'Design standardization',
      'Digital twin',
      'MES',
      'Throughput analysis',
      'Discrete-event simulation',
    ],
  },
  {
    id: 'tocopherol-ude',
    title:
      'A Hybrid Machine Learning Framework for Interpretable Kinetics of α-Tocopherol and Myricetin Synergism',
    venue: 'Journal of Food Science (Wiley / IFT)',
    status: 'published',
    year: '2025',
    authorship: 'Co-author',
    abstract:
      'Predicting the stabilizing efficacy of antioxidant mixtures in food oil emulsions is difficult because individual antioxidants interact synergistically or antagonistically. We present a hybrid machine learning framework based on universal differential equations (UDEs), embedding compact neural networks directly inside a system of ordinary differential equations so that the model retains the mechanistic boundaries of classical kinetics while learning the interactions the mechanism does not specify. Applied to the coupled degradation dynamics of α-tocopherol in the presence of myricetin, the model recovered hidden mutualistic protection from a small dataset. We then translated the machine-learned interaction into a fully analytical, interpretable model based on Hill-type saturation kinetics — which reproduced the training data and, critically, extrapolated to unseen formulations at fivefold higher myricetin concentration.',
    results: [
      { value: 'R² = 0.998', label: 'Training data reproduction' },
      { value: 'R² = 0.978', label: 'Extrapolation, unseen formulations' },
      { value: '5×', label: 'Concentration beyond training range' },
    ],
    href: 'https://ift.onlinelibrary.wiley.com/doi/epdf/10.1111/1750-3841.71291',
    doi: '10.1111/1750-3841.71291',
    tags: [
      'Universal differential equations',
      'Physics-informed ML',
      'Interpretable models',
      'Kinetic modelling',
    ],
  },
]

/** Research that didn't become a paper but shows analytical range. */
export const otherResearch = [
  {
    title: 'Dynamic Mode Decomposition of esophageal imaging',
    detail:
      'Reconstructed pressure changes over time during swallowing from image sequences, identifying normal versus abnormal pressure deviations.',
  },
  {
    title: 'Forensic fluid dynamics of blood stain patterns',
    detail:
      'Related impact velocity and angle to stain length to support splatter pattern reconstruction.',
  },
]
