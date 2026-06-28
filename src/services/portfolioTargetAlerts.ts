export type PortfolioTargetSellAction = 'sell_100' | 'sell_50' | 'sell_custom'

export interface PortfolioTargetRule {
  action: PortfolioTargetSellAction
  customPercent?: number
}

export interface PortfolioBasketTargets {
  basketId: string
  takeProfit?: PortfolioTargetRule
  stopLoss?: PortfolioTargetRule
  updatedAt: number
}

const STORAGE_KEY = 'portx-portfolio-targets'

function loadAll(): Record<string, PortfolioBasketTargets> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, PortfolioBasketTargets>
  } catch {
    return {}
  }
}

function saveAll(targets: Record<string, PortfolioBasketTargets>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
}

export function getPortfolioBasketTargets(basketId: string): PortfolioBasketTargets | null {
  return loadAll()[basketId] ?? null
}

export function setPortfolioTakeProfit(
  basketId: string,
  rule: PortfolioTargetRule,
): PortfolioBasketTargets {
  const all = loadAll()
  const existing = all[basketId]
  const next: PortfolioBasketTargets = {
    ...existing,
    basketId,
    takeProfit: rule,
    updatedAt: Date.now(),
  }
  all[basketId] = next
  saveAll(all)
  return next
}

export function setPortfolioStopLoss(
  basketId: string,
  rule: PortfolioTargetRule,
): PortfolioBasketTargets {
  const all = loadAll()
  const existing = all[basketId]
  const next: PortfolioBasketTargets = {
    ...existing,
    basketId,
    stopLoss: rule,
    updatedAt: Date.now(),
  }
  all[basketId] = next
  saveAll(all)
  return next
}

export function clearPortfolioTargets(basketId: string): void {
  const all = loadAll()
  delete all[basketId]
  saveAll(all)
}

export function formatTargetRule(rule: PortfolioTargetRule): string {
  if (rule.action === 'sell_100') return 'Sell 100%'
  if (rule.action === 'sell_50') return 'Sell 50%'
  return `Sell ${rule.customPercent ?? 0}%`
}

export const PORTFOLIO_TARGET_AUTOMATION_NOTE =
  'Automation coming soon — target alerts are local only.'
