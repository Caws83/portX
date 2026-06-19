import { NavLink } from 'react-router-dom'
import { AppModeBadge } from './AppModeIndicator'
import { Logo } from './Logo'
import { WalletButton } from './WalletButton'

type NavLinkItem = {
  to: string
  label: string
  badge?: string
}

const links: NavLinkItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/discover', label: 'Discover' },
  { to: '/baskets', label: 'Baskets' },
  // { to: '/lending', label: 'Lending', badge: '🚧' },
  // { to: '/create-basket', label: 'Create' },
  { to: '/mint', label: 'NFT' },
  // { to: '/sell-all', label: BUTTON_LABELS.sellAllNav },
  // { to: '/agents', label: 'Agents' },
  // { to: '/settings', label: 'Settings' },
]

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-2.5 pb-1.5 pointer-events-none">
      <div className="glass-nav max-w-7xl mx-auto rounded-xl pointer-events-auto">
        <div className="relative px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex items-center min-w-0">
              <Logo variant="header" height="sm" className="max-w-[min(36vw,120px)] sm:max-w-[130px]" />
            </div>

            <nav className="hidden lg:flex items-center gap-0.5">
              {links.map(({ to, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-portx-green bg-portx-green/10'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {label}
                  {badge && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-portx-blue/15 text-portx-blue border border-portx-blue/25">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <AppModeBadge className="hidden md:inline-flex" />
              <WalletButton />
            </div>
          </div>

          <nav className="lg:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {links.map(({ to, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-portx-green bg-portx-green/10' : 'text-white/70'
                  }`
                }
              >
                {label}
                {badge && (
                  <span className="text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded-full bg-portx-blue/15 text-portx-blue border border-portx-blue/25">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
