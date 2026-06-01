import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { WalletButton } from './WalletButton'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/discover', label: 'Discover' },
  { to: '/baskets', label: 'Baskets' },
  { to: '/create-basket', label: 'Create' },
  { to: '/sell-all', label: 'Sell All' },
  { to: '/agents', label: 'Agents' },
  { to: '/settings', label: 'Settings' },
]

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-2.5 pb-1.5 pointer-events-none">
      <div className="glass-nav max-w-7xl mx-auto rounded-xl pointer-events-auto">
        <div className="relative px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <Logo variant="header" height="sm" className="max-w-[min(36vw,120px)] sm:max-w-[130px]" />

            <nav className="hidden lg:flex items-center gap-0.5">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-portx-green bg-portx-green/10'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <NavLink to="/dashboard" className="btn-primary text-sm py-1.5 px-3.5 hidden sm:inline-flex">
                Launch App
              </NavLink>
              <WalletButton />
            </div>
          </div>

          <nav className="lg:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-portx-green bg-portx-green/10' : 'text-white/70'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
