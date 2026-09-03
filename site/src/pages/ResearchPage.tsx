import { useEffect } from 'react'
import { publications } from '../content/publications'
import { PageHead } from '../components/primitives/PageHead'
import { Research } from '../components/Research'
import { Footer } from '../components/Footer'

export default function ResearchPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <PageHead
        index="06"
        kicker="Research & publications"
        title={
          <>
            Industry & academic{' '}
            <span className="text-signal">research.</span>
          </>
        }
        lede="A published paper on hybrid reaction kinetics and a manufacturing paper in review."
        meta={`${publications.length} papers`}
      />
      <Research variant="page" />
      <Footer />
    </>
  )
}
