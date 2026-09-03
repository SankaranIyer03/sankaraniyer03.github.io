/**
 * Positioning copy. Every headline on the site resolves back to the thesis here:
 * the four stages of a product's life are one job, and the handoffs are where
 * cost, quality and schedule are actually won or lost.
 */

export const profile = {
  name: 'Sankaran Iyer',
  role: 'Manufacturing Systems & Operations Engineer',
  tagline: 'I take products from CAD to shop floor to closed loop.',

  /**
   * The four beats are the loop, not the headline. On their own they read as
   * four separate skills; the headline has to say that the job is building the
   * system that contains all four, and that the point of it is growth, not
   * just a working plant.
   *
   * Set as three short lines because the column is too narrow to hold this
   * at display size in two.
   */
  headline: {
    lines: ['I build the systems', 'that build the factory,'],
    accent: 'and the business.',
  },

  /** The one sentence to read if you read nothing else. */
  standfirst:
    'A hands-on manufacturing engineer who scales production systems, the part, the process, and the digital thread that ties the shop floor to the business.',

  /**
   * The qualifier that stops the above being read as a software pitch. Shown
   * with the loop rather than the headline, where there is room for it.
   */
  standfirstCoda:
    'The digital tools are the enabler, not the point. The point is a plant that measures itself, shows you where quality and margin are leaking, and closes the loop back into the next design.',

  /** Used for the portrait; shot on a real factory floor, not a studio. */
  portrait: 'profile/headshot',
  floorPhoto: 'profile/factory-floor',

  thesis: {
    kicker: 'The thesis',
    heading: 'Most engineers own one stage. I own the handoffs.',
    body: [
      'A product passes through four hands on its way to a customer. Design hands a model to manufacturing. Manufacturing hands a process to controls. Controls generates data that someone else eventually reads. Every one of those handoffs is a wall, and walls are where cost, quality, and schedule quietly go to die.',
      'I work on both sides of all three. Design decisions determine what is manufacturable. Manufacturing creates variation. Automation contains that variation. Data explains it, and the explanation belongs back in the design.',
      'It is not a pipeline. It is a loop, and the whole point is to close it.',
    ],
    loopStatement:
      'Design decisions determine what is manufacturable. Manufacturing creates variation. Automation controls variation. Data explains it, and feeds it back into design.',
  },

  education: [
    {
      school: 'Massachusetts Institute of Technology',
      abbr: 'MIT',
      logo: 'logos/mit',
      degree: 'M.Eng., Mechanical Engineering',
      focus: 'Advanced Manufacturing & Design',
      period: 'Aug 2025, Jul 2026',
    },
    {
      school: 'Purdue University',
      abbr: 'Purdue',
      logo: 'logos/purdue',
      degree: 'B.S., Mechanical Engineering',
      focus: 'Applications of Data Science certificate',
      period: 'Aug 2021, May 2025',
    },
  ],

  links: {
    email: 'sankaran.iyer2003@gmail.com',
    linkedin: 'https://www.linkedin.com/in/siyer03/',
    scholarPaper: 'https://ift.onlinelibrary.wiley.com/doi/epdf/10.1111/1750-3841.71291',
  },
} as const
