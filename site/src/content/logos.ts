/**
 * The 2x3 credential wall. Education on the top row, industry beneath, each
 * with the one line that says what was actually done there, a logo grid with
 * no text is decoration, not evidence.
 */

export interface LogoCard {
  id: string
  name: string
  /** Key into media.generated.json */
  logo: string
  kind: 'education' | 'industry'
  role: string
  period: string
  note: string
}

export const logoCards: LogoCard[] = [
  {
    id: 'mit',
    name: 'MIT',
    logo: 'logos/mit',
    kind: 'education',
    role: 'M.Eng., Advanced Manufacturing & Design',
    period: '2025, 2026',
    note: 'FrED Factory operating & financial model.',
  },
  {
    id: 'purdue',
    name: 'Purdue',
    logo: 'logos/purdue',
    kind: 'education',
    role: 'B.S., Mechanical Engineering',
    period: '2021, 2025',
    note: 'Applications of Data Science certificate.',
  },
  {
    id: 'ge-vernova',
    name: 'GE Vernova',
    logo: 'logos/ge-vernova',
    kind: 'industry',
    role: 'Circuit breaker platform standardization',
    period: '2025',
    note: '3x drawing throughput. $33.5M early revenue a year.',
  },
  {
    id: 'rockwell',
    name: 'Rockwell Automation',
    logo: 'logos/rockwell',
    kind: 'industry',
    role: 'Technology Consulting',
    period: '2024',
    note: '$10MM of smart-plant proposals, ISA-95.',
  },
  {
    id: 'ge-aerospace',
    name: 'GE Aerospace',
    logo: 'logos/ge-aerospace',
    kind: 'industry',
    role: 'Manufacturing, supply chain & data, four terms',
    period: '2021, 2025',
    note: '75% fewer non-conformances. Scaled to 139 sites.',
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    logo: 'logos/deloitte',
    kind: 'industry',
    role: 'Business Technology Solutions',
    period: '2025',
    note: 'Oracle RMS, Fortune 100 grocery client.',
  },
]
