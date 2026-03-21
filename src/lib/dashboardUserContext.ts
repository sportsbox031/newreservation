import type { AuthResult } from '@/lib/auth'
import type { DashboardBootstrapUser } from '@/lib/dashboardBootstrap'

export type DashboardUserMetaContext = {
  userMeta: DashboardBootstrapUser
  regionId: number
  userTierId: number
  yearMonth: string
}

export function buildDashboardUserMetaContextFromAuthUser(
  user: AuthResult['user'],
  year: number,
  month: number
): DashboardUserMetaContext | null {
  if (!user?.region_id || !user.region_code || !user.region_name) {
    return null
  }

  const tierName = user.tier || 'Standard'

  return {
    userMeta: {
      organization_name: user.organization_name,
      tier: tierName,
      region_code: user.region_code,
      region_name: user.region_name,
    },
    regionId: user.region_id,
    userTierId: tierName === 'Priority' ? 1 : 2,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`
  }
}
