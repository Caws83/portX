import { Link } from 'react-router-dom'
import type { NotablePortfolio } from '@/types/whale'
import { NOTABLE_PORTFOLIOS } from '@/data/notablePortfolios'
import { WhalePortfolioCard } from './WhalePortfolioCard'

interface NotablePortfoliosProps {
  portfolios?: NotablePortfolio[]
  limit?: number
  horizontal?: boolean
  title?: string
  showViewAll?: boolean
}

export function NotablePortfolios({
  portfolios = NOTABLE_PORTFOLIOS,
  limit,
  horizontal = false,
  title = 'Notable Portfolios',
  showViewAll = false,
}: NotablePortfoliosProps) {
  const items = limit ? portfolios.slice(0, limit) : portfolios

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-portx-muted">Copy famous allocations as PortX basket templates</p>
        </div>
        {showViewAll && (
          <Link to="/discover" className="text-sm text-portx-green hover:underline shrink-0">
            View all →
          </Link>
        )}
      </div>

      {horizontal ? (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {items.map((p) => (
            <div key={p.id} className="shrink-0 w-[300px] snap-start">
              <WhalePortfolioCard portfolio={p} compact />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((p) => (
            <WhalePortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </section>
  )
}
