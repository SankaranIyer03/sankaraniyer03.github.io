/**
 * GE Aerospace OMLP is the current role. GE Vernova was the full-time
 * manufacturing role, then contractor. Every other plant and consulting
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
  /** Site or rotation line under the company name. */
  detail?: string
  /** External program or company page. */
  href?: string
  /** The single most positioning-relevant line. */
  headline: string
  bullets: string[]
  /** Roles that carry the most weight for the manufacturing/automation story. */
  highlight?: boolean
}

export const roles: Role[] = [
  {
    id: 'ge-omlp',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Operations Management Leadership Program (OMLP)',
    period: 'Nov 2026, Present',
    start: '2026-11',
    detail: 'Quality Engineer, Huntsville, AL',
    href: 'https://careers.geaerospace.com/global/en/operations-management-leadership-program',
    headline:
      "OMLP is GE Aerospace's highly selective, leadership-oriented program: three rotations that build technical and business strength in manufacturing, supply chain, and people leadership. My first rotation is Quality Engineer in Huntsville, on GE's proprietary Ceramic Matrix Composites (CMC) unit.",
    bullets: [
      'Three eight-month rotations across GE Aerospace sites and product lines. People-leadership is built in, including leading hourly teams as a team coach or supervisor.',
      'As Quality Engineer I sit in the downstream process with the quality technician team. We work material variation, cut non-conformances, and tighten the quality-check process using Measurement System Analysis, statistical process control, and APQP tools like PFMEA.',
    ],
    highlight: true,
  },
  {
    id: 'ge-vernova',
    company: 'GE Vernova',
    logo: 'logos/ge-vernova',
    title: 'Manufacturing Engineer',
    period: 'Mar 2026, Oct 2026',
    start: '2026-03',
    headline:
      'As part of my MIT thesis I worked with GE Vernova, standing up design and part standardization from scratch. We led it: a structured catalog commercial could sell from, and a manufacturing strategy for $33.5M a year in early revenue recognition.',
    bullets: [
      'With fellow MIT student Sebastian Podiono, I led the standardization initiative from a leadership concept to a working program. GE extended me and rehired me as an individual contractor to carry it through the commercial workshop.',
      'I analyzed 350+ drawings across 30+ customers, broke down the patterns, and worked with engineering to define a modular standard circuit: one base, with add-ons for the rest. 274 orders could migrate immediately, drawing throughput tripled, and engineering saves about $500K a year.',
      'I drove design and part standardization across commercial, engineering, sourcing, and manufacturing, and built a new structured catalog for commercial to sell. Commercial now has a standard offering to quote from instead of a new design for every order.',
      'I built a production MES and ran time studies on 65+ orders, mapping each one to its complexity. Shop floor, engineering, and leadership could see, order by order, why takt was being missed.',
      'I fed that MES data into an AnyLogic digital twin (simulation) of the current and standardized lines. The future state builds 70 more circuit breakers a year, $33.5M in revenue GE can recognize earlier.',
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
      'Oracle RMS for a Fortune 100 grocer, and automation that took more than 20 hours of coordination off the week.',
    bullets: [
      'I worked with supplier and item data teams on an Oracle Retail Merchandising System (RMS) implementation for a Fortune 100 grocer, removing redundant data and streamlining how supplier and item work moved through the system.',
      'I built a Python tool that extracts and cleans weekly item assortment data across 20+ warehouses, accounting for seasonal shifts. It saves the team 5+ hours of manual work every week.',
      'I designed and deployed a Power Automate workflow for supplier inquiries, from intake through resolution. It cut 15+ hours of manual coordination a week and improved response time by 50%.',
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
      'Digitized material tracking on the floor at Lafayette, 200+ parts across three engine lines that were still being followed by hand.',
    bullets: [
      'I built and deployed a 2-Bin Material Tracking app in SQL, Python, and Streamlit for the Lafayette Engine Facility, replacing manual tracking for 200+ parts across three engine lines. Production gained clear visibility into part status and on-time delivery.',
      'I led operations for migrating site users from the GE domain to the new GE Aerospace domain, building a phased strategy that moved users in waves as their applications became migration-ready. The migration-readiness analysis framework I created in Power BI was implemented at 15+ Assembly, Test, and MRO sites and later extended to 139 sites across GE Aerospace.',
      'I led the end-to-end device migration at Lafayette using application usage data, reaching 85%+ completion. Lafayette became the first site to migrate to the new domain.',
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
      'I led $10MM of smart-connected-plant proposals, sensors and logic through data acquisition, MES, and ERP.',
    bullets: [
      'I consulted with 5 clients on smart connected plant designs using Rockwell solutions, connecting data from the factory floor to the enterprise to improve operational efficiency.',
      'I led $10MM of proposals for CPG and pharmaceutical clients, scoping end-to-end solutions across the ISA-95 stack: sensors, logic controls, data acquisition, MES, and ERP.',
      'I built an internal Python workflow that extracts data from vendor quote PDFs into a database, saving the team 3+ hours of manual work each week.',
    ],
    highlight: true,
  },
  {
    id: 'ge-supply-chain',
    company: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    title: 'Quality Engineer',
    period: 'May 2023, Aug 2023',
    start: '2023-05',
    internship: true,
    headline:
      'Cut non-conforming line items by 75% by changing the drawings and tolerances, root cause, not reporting.',
    bullets: [
      'I built an automated Python script analyzing 10,000+ defective parts and line items across 60+ suppliers. Its monthly KPIs and reports showed which suppliers and parts were driving quality issues.',
      'I worked with suppliers and engineering to fix the root cause in the drawings and process: adjusting tolerances, processing drawing revisions, and updating supplier work instructions. MRB and non-conforming line items on the part dropped 75%.',
      'I partnered with Supplier Quality Engineers on producibility projects, using PFMEA to trace and resolve the part-marking issues behind 50% of non-conformances.',
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
      'I owned improvements to four external customer portals, including piping live engine analytics through APIs.',
    bullets: [
      'I analyzed 5,000+ lines of customer feedback and portal traffic to pinpoint user pain points, then improved navigation across GE\u2019s four external customer portals.',
      'I built and operationalized behavior, inquiry, and feedback analytics in Spotfire, Salesforce, and Adobe Analytics, improving portal response efficacy by more than 50%.',
      'I wrote and delivered portal user stories, including a new-user onboarding walkthrough and API connections that surface engine analytics such as turnaround time and status.',
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
      'I evaluated engine vibration data with classification models, comparing predictions against actual outcomes and bucketing the results. Model confidence rose above 90%.',
      'I built the analysis and visualization layer in Python (Pandas, Matplotlib, NumPy) to assess model performance and vibration classifications.',
      'I developed an internal website and campaign for the Analytical Controller and Analytical Processor tools, increasing their visibility and use on the shop floor.',
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
      'I ran a two-year John Deere partnership with 12 Purdue graduate and undergraduate students. They built the 12-month forecast. I was PM and TA. The models had to be something the sponsor would actually use.',
      'I taught them to bucket the series and judge models on RMSE and bias, not just a pretty plot.',
      'Before that, a six-month Inotiv project with 10 undergrads on HR and supply chain dashboards.',
    ],
  },
  {
    id: 'research-assistant',
    title: 'Research Assistant, Machine Learning for Engineering',
    org: 'Purdue University, Prof. Carlos Corvalan',
    period: 'Jan 2024, May 2025',
    logo: 'logos/purdue',
    bullets: [
      'I co-authored a peer-reviewed paper that kept the classical reaction equations and let a small network learn the missing antioxidant interaction.',
      'I used Dynamic Mode Decomposition on esophagus imaging to reconstruct swallowing pressure and tell normal from abnormal.',
      'I looked at blood-stain fluid dynamics, velocity, impact angle, stain length, for forensic pattern work.',
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
