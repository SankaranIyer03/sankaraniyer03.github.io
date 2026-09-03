/**
 * GE Vernova is the full-time role. Every other plant and consulting
 * role on this page is an internship and is labeled as one.
 */

export interface Role {
  id: string
  company: string
  /** Key into media.generated.json for the company mark. */
  logo?: string
  title: string
  period: string
  start: string
  internship?: boolean
  /** The single most positioning-relevant line. */
  headline: string
  bullets: string[]
  /** Roles that carry the most weight for the manufacturing/automation story. */
  highlight?: boolean
}

export const roles: Role[] = [
  {
    id: 'ge-vernova',
    company: 'GE Vernova',
    logo: 'logos/ge-vernova',
    title: 'Manufacturing Engineer',
    period: 'Mar 2026, Aug 2026',
    start: '2026-03',
    headline:
      'Six months on-site, I turned a leadership standardization brief into a modular circuit, 3x drawing throughput, and a manufacturing strategy for $33.5M a year in early revenue recognition.',
    bullets: [
      'I owned the standardization initiative with fellow MIT student Sebastian Podiono, taking it from a leadership concept to a practical reality.',
      'I sat with 350+ drawings across 30+ customers and, with engineering, cut a standard circuit that stays modular: one base, add-ons for the rest. 274 orders could migrate immediately, drawing throughput tripled, and the engineering team saves about $500,000 a year.',
      'I built a production MES and ran time studies on 65+ orders, then mapped each one to its complexity. Shop floor, engineering, and leadership could see, order by order, why takt was being missed.',
      'That MES data fed an AnyLogic twin of the current line and of the standardized one. The future state makes 70 more circuit breakers a year, $33.5M the company can recognize earlier.',
    ],
    highlight: true,
  },
  {
    id: 'deloitte',
    company: 'Deloitte Consulting',
    logo: 'logos/deloitte',
    title: 'Engineering Consultant',
    period: 'Jun 2025, Jul 2025',
    start: '2025-06',
    internship: true,
    headline:
      'Oracle RMS implementation for a Fortune 100 grocery client, plus automation that removed 20+ hours of manual coordination a week.',
    bullets: [
      'Collaborated with supplier and item data teams on an Oracle Retail Merchandising System (RMS) implementation for a Fortune 100 grocery client, streamlining workflows and eliminating data redundancies.',
      'Developed a scalable Python automation tool to extract and clean weekly item assortment data across 20+ warehouses, accounting for seasonal trends and shifts, saving 5+ hours per week of manual effort.',
      'Designed and deployed a Power Automate workflow managing supplier inquiry intake, tracking, and resolution, reducing manual coordination by over 15 hours per week and improving response time efficiency by 50%.',
    ],
  },
  {
    id: 'ge-digital',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Systems Engineer',
    period: 'Jan 2025, May 2025',
    start: '2025-01',
    internship: true,
    headline:
      'Digitized manual material tracking on the floor at the Lafayette Engine Facility, 200+ parts across three engine lines.',
    bullets: [
      'Deployed a SQL, Python, and Streamlit 2-Bin Material Tracking application for the Lafayette Engine Facility, digitalizing manual tracking for 200+ parts across three engine lines and improving production part visibility and on-time tracking.',
      'Developed a PowerBI Vanilla User Analysis dashboard identifying migration-ready users; piloted at 15+ ATMRO sites and scaled to 139 sites across GE Aerospace.',
      'Led an end-to-end device migration project at Lafayette, using application usage data to reach 85%+ site migration completion, making Lafayette the first site to successfully migrate under the new domain.',
    ],
    highlight: true,
  },
  {
    id: 'rockwell',
    company: 'Rockwell Automation',
    logo: 'logos/rockwell',
    title: 'Engineering Consultant',
    period: 'May 2024, Aug 2024',
    start: '2024-05',
    internship: true,
    headline:
      'Led $10MM of smart-connected-plant proposals spanning the full ISA-95 stack, sensors and logic control through data acquisition, MES, and ERP.',
    bullets: [
      'Consulted with 5 clients to design smart connected plants using Rockwell solutions to streamline data flow from factory to enterprise, improving operational efficiency and digitalization.',
      'Led $10MM of proposals for CPG and pharmaceutical clients, delivering end-to-end solutions across the ISA-95 stack, connecting sensors, logic controls, data acquisition systems, MES, and ERP.',
      'Developed an internal Python workflow extracting data from third-party vendor quote PDFs into a database, removing 3+ hours of weekly manual work across the team.',
    ],
    highlight: true,
  },
  {
    id: 'ge-supply-chain',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Operations Engineer',
    period: 'May 2023, Aug 2023',
    start: '2023-05',
    internship: true,
    headline:
      'Cut non-conforming line items by 75% by changing the drawings and tolerances, root cause, not reporting.',
    bullets: [
      'Implemented an automated Python script analysing 10,000+ defective parts and line items across 60+ suppliers, producing monthly KPIs and reports on supplier and part quality trends.',
      'Collaborated with suppliers and engineering teams to optimize the manufacturing process and engineering drawings, adjusting part and drawing tolerances, processing drawing revisions, and modifying supplier work instructions, reducing MRB and non-conforming line items by 75% for the part.',
      'Partnered with Supplier Quality Engineers on producibility projects, using Process Failure Mode Effects Analysis (PFMEA) to trace and resolve the root causes of part marking quality issues responsible for 50% of non-conformances.',
    ],
    highlight: true,
  },
  {
    id: 'ge-tpm',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Systems Engineer',
    period: 'May 2022, Aug 2022',
    start: '2022-05',
    internship: true,
    headline:
      'Owned improvements to four external customer portals, including piping live engine analytics through APIs.',
    bullets: [
      'Analysed 5,000+ lines of customer feedback and portal traffic data to identify user pain points, improving navigation across GE\u2019s four external-facing customer portals.',
      'Developed and operationalized user behaviour, inquiry, and feedback analytics through Spotfire, Salesforce, and Adobe Analytics dashboards, improving portal response efficacy by more than 50%.',
      'Devised and executed portal improvement user stories, including a new-user onboarding walkthrough and API connections surfacing engine analytics such as turnaround time and status.',
    ],
  },
  {
    id: 'ge-ds',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Systems Engineer',
    period: 'May 2021, Aug 2021',
    start: '2021-05',
    internship: true,
    headline:
      'Classified engine vibration signatures to flag misalignment and wear, reaching 90%+ model confidence.',
    bullets: [
      'Evaluated engine vibration data using classification machine learning algorithms, comparing predictions against actual outcomes and bucketing results to raise model confidence above 90%.',
      'Built the analysis and visualization layer in Python (Pandas, Matplotlib, NumPy) to assess algorithm performance and vibration classifications.',
      'Developed an internal website and campaign promoting internal manufacturing analytics tools, Analytical Controller and Analytical Processor, to increase visibility and engagement on the shop floor.',
    ],
  },
]

export interface Leadership {
  id: string
  title: string
  org: string
  period: string
  logo?: string
  bullets: string[]
}

export const leadership: Leadership[] = [
  {
    id: 'data-mine',
    title: 'Project Manager & Undergraduate Teaching Assistant',
    org: 'The Data Mine, Purdue University',
    period: 'Jun 2021, May 2025',
    logo: 'logos/datamine',
    bullets: [
      'Led a two-year consulting partnership with 12 Purdue graduate and undergraduate students to improve demand planning for John Deere, delivering 12-month demand forecasting and the decision support around it.',
      'Taught and mentored the team through classifying time-series data into buckets and evaluating forecasting models against RMSE and bias.',
      'Previously directed a 6-month project with Inotiv and 10 undergraduate students building dashboards for operational data spanning HR and supply chain.',
    ],
  },
  {
    id: 'research-assistant',
    title: 'Research Assistant, Machine Learning for Engineering',
    org: 'Purdue University, Prof. Carlos Corvalan',
    period: 'Jan 2024, May 2025',
    logo: 'logos/purdue',
    bullets: [
      'Co-authored a peer-reviewed paper integrating neural networks with traditional dynamical systems to identify antioxidant interactions in food systems.',
      'Performed Dynamic Mode Decomposition (DMD) on esophagus imaging to reconstruct pressure changes during swallowing, distinguishing normal from abnormal pressure deviations.',
      'Performed fluid dynamics analysis of blood stains relating velocity, impact angle, and stain length for forensic splatter pattern analysis.',
    ],
  },
]

/** Logos for the "worked with" strip. */
export const companyLogos = [
  { name: 'GE Vernova', logo: 'logos/ge-vernova' },
  { name: 'GE Aerospace', logo: 'logos/ge-aerospace' },
  { name: 'Rockwell Automation', logo: 'logos/rockwell' },
  { name: 'Deloitte Consulting', logo: 'logos/deloitte' },
]
