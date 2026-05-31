import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { Logo } from '@/components/Logo'

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-portx-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-portx-muted flex flex-col items-center gap-3">
          <Logo height="sm" linkToHome={false} className="mx-auto opacity-90" />
          <p className="mb-1">Trade portfolios like a single asset.</p>
          <p className="text-xs">Demo mode · No real trading · DEX routing placeholders</p>
        </div>
      </footer>
    </div>
  )
}
