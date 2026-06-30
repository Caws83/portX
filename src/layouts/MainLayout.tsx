import { Outlet } from 'react-router-dom'
import { AppModeBanner } from '@/components/AppModeIndicator'
import { Navbar } from '@/components/Navbar'
import { Logo } from '@/components/Logo'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { PortfolioTradeProvider } from '@/context/PortfolioTradeProvider'

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[7.25rem] lg:pt-[5.25rem]">
        <AppModeBanner />
        <PortfolioTradeProvider>
          <Outlet />
        </PortfolioTradeProvider>
      </main>
      <footer className="border-t border-portx-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-portx-muted flex flex-col items-center gap-3">
          <Logo
            variant="header"
            height="md"
            linkToHome={false}
            className="mx-auto object-center max-w-[min(70vw,200px)]"
          />
          <p className="mb-1">Trade portfolios like a single asset.</p>
          <p className="text-xs">
            {ENABLE_TESTNET_MODE
              ? 'Sepolia testnet · Test ETH only · Portfolio trading beta'
              : 'Demo mode · No real trading · DEX routing placeholders'}
          </p>
        </div>
      </footer>
    </div>
  )
}
