export interface Publication {
  id: string
  title: string
  venue: string
  status: 'published' | 'in-review'
  year: string
  authorship: string
  abstract: string
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
      'Antioxidants keep food oils from going stale, but mixing them is not simple addition. Two compounds can protect each other or get in each other\'s way, and a standard kinetics model does not know which. We kept the classical reaction equations and let a small neural network learn only the missing interaction. On vitamin E (α-tocopherol) mixed with myricetin, the model found a hidden protective effect from a small dataset. We then wrote that interaction as a readable equation. It fit the data we had, and it still held on new mixes at five times the myricetin we trained on.',
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
