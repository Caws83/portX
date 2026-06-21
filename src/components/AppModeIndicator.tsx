import { useNavigate } from 'react-router-dom'
import { APP_MODE_BADGE_LABEL, APP_MODE_BANNER_MESSAGE, IS_TESTNET_MODE } from '@/config/appMode'
import { SHOW_ALPHA_WARNINGS } from '@/config/features'
import { getActiveNetworkConfig } from '@/config/networks'
import { FloatingToast } from '@/components/ui/FloatingToast'

/** Small badge for navbar / settings — Production Preview or Testnet Mode */
export function AppModeBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono font-medium border rounded-full text-[10px] px-2 py-0.5 shrink-0 ${
        IS_TESTNET_MODE
          ? 'bg-portx-warning/10 text-portx-warning border-portx-warning/30'
          : 'bg-portx-blue/10 text-portx-blue border-portx-blue/30'
      } ${className}`}
      title={getActiveNetworkConfig().label}
    >
      {APP_MODE_BADGE_LABEL}
    </span>
  )
}

/** Global mode notice — floating toast in the top-right corner */
export function AppModeBanner() {
  const navigate = useNavigate()

  if (!SHOW_ALPHA_WARNINGS) return null

  return (
    <FloatingToast
      tone={IS_TESTNET_MODE ? 'warning' : 'info'}
      title={IS_TESTNET_MODE ? 'Testnet Mode' : 'Live Execution Disabled'}
      message={APP_MODE_BANNER_MESSAGE}
      onSettings={() => navigate('/settings')}
    />
  )
}
