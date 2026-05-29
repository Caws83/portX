import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Home } from '@/pages/Home'
import { Dashboard } from '@/pages/Dashboard'
import { Baskets } from '@/pages/Baskets'
import { CreateBasket } from '@/pages/CreateBasket'
import { SellAll } from '@/pages/SellAll'
import { Agents } from '@/pages/Agents'
import { Settings } from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/baskets" element={<Baskets />} />
        <Route path="/create-basket" element={<CreateBasket />} />
        <Route path="/sell-all" element={<SellAll />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
