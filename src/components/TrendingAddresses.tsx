import { Link } from 'react-router-dom'
import { TRENDING_ADDRESSES } from '@/data/trendingAddresses'
import { formatUsd, formatPercent } from '@/utils/format'

interface TrendingAddressesProps {
  limit?: number
  showViewAll?: boolean
}

export function TrendingAddresses({ limit, showViewAll = false }: TrendingAddressesProps) {
  const addresses = limit ? TRENDING_ADDRESSES.slice(0, limit) : TRENDING_ADDRESSES

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Trending Addresses</h2>
          <p className="text-sm text-portx-muted">Demo wallet watchlist — not verified on-chain</p>
        </div>
        {showViewAll && (
          <Link to="/discover" className="text-sm text-portx-green hover:underline shrink-0">
            View all →
          </Link>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {addresses.map((addr) => {
          const trend = addr.change24h >= 0 ? 'text-portx-green' : 'text-portx-danger'
          return (
            <div
              key={addr.id}
              className="card-glow shrink-0 w-[260px] snap-start hover:border-portx-green/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-portx-black"
                  style={{ backgroundColor: addr.avatarColor }}
                >
                  {addr.label.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{addr.label}</p>
                  <p className="text-xs font-mono text-portx-muted">{addr.shortAddress}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-portx-muted">{addr.chain}</span>
                <span className={`font-mono font-medium ${trend}`}>
                  {formatPercent(addr.change24h)}
                </span>
              </div>
              <p className="font-mono font-bold text-portx-green">
                {formatUsd(addr.estimatedValueUsd, true)}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {addr.tags.map((tag) => (
                  <span key={tag} className="badge text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
              {/* Future: Arkham / Nansen / DeBank API wallet detail link */}
            </div>
          )
        })}
      </div>
    </section>
  )
}
