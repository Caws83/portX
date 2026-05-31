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
    <header className="sticky top-0 z-50 border-b border-portx-border/80 bg-portx-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo height="md" />

          <nav className="hidden lg:flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-portx-green bg-portx-green/10'
                      : 'text-portx-muted hover:text-white hover:bg-portx-surface'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <NavLink to="/dashboard" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
              Launch App
            </NavLink>
            <WalletButton />
          </div>
        </div>

        <nav className="lg:hidden flex gap-1 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-portx-green bg-portx-green/10' : 'text-portx-muted'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
