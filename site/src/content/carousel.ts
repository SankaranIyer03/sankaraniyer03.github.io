/**
 * The landing carousel. Ordered as an argument rather than a photo album:
 * the floor first, then the factory-scale work at MIT, then where it started.
 *
 * Each slide states what the viewer is looking at, because an uncaptioned
 * photograph of a person in a hi-vis vest proves nothing.
 */

export interface Slide {
  /** Key into media.generated.json */
  media: string
  /** Two or three words, set as an overline. */
  kicker: string
  /** The claim this photograph supports. */
  caption: string
  place: string
}

export const slides: Slide[] = [
  {
    media: 'carousel/01-floor',
    kicker: 'On the floor',
    caption:
      'The circuit breaker line at GE Vernova, leading standardization of the platform.',
    place: 'GE Vernova',
  },
  {
    media: 'carousel/03-fred-poster',
    kicker: 'Factory economics',
    caption:
      'Presenting the operating and financial model for MIT\u2019s FrED Factory, a $1.57M annual cost structure for a working learning factory.',
    place: 'MIT · Tec de Monterrey',
  },
  {
    media: 'carousel/04-fred-summit',
    kicker: 'FrED Factory Summit',
    caption:
      'MIT\u2019s learning-factory program, run jointly with Tecnológico de Monterrey, manufacturing education as a production system.',
    place: 'FrED Factory Summit',
  },
  {
    media: 'carousel/05-capstone',
    kicker: 'Where it started',
    caption:
      'TerraProbe at the Purdue ME capstone showcase, a portable real-time soil sampling system, designed, built and tested by our team.',
    place: 'Purdue ME',
  },
  {
    media: 'carousel/06-rockwell',
    kicker: 'Automation architecture',
    caption:
      'Rockwell Automation, where I led $10MM of smart-connected-plant proposals across the full ISA-95 stack.',
    place: 'Rockwell Automation',
  },
]
