export type ReservationRegionCode = 'south' | 'north'
export type ReservationScope = 'all' | 'pending' | 'approved' | 'cancel_requested' | 'active'

export function resolveReservationRegionScope(
  adminRole: string,
  requestedRegionCode: string | null
): { regionCode: ReservationRegionCode | null; error: { message: string } | null } {
  if (adminRole === 'super') {
    return {
      regionCode: requestedRegionCode === 'south' || requestedRegionCode === 'north'
        ? requestedRegionCode
        : null,
      error: null,
    }
  }

  if (adminRole === 'south' || adminRole === 'north') {
    if (requestedRegionCode && requestedRegionCode !== adminRole) {
      return {
        regionCode: null,
        error: { message: '해당 지역 데이터에 접근할 권한이 없습니다.' },
      }
    }

    return { regionCode: adminRole, error: null }
  }

  return {
    regionCode: null,
    error: { message: '관리자 권한이 없습니다.' },
  }
}

export function getReservationStatusesForScope(scope: ReservationScope): string[] | null {
  switch (scope) {
    case 'pending':
      return ['pending']
    case 'approved':
      return ['approved']
    case 'cancel_requested':
      return ['cancel_requested']
    case 'active':
      return ['pending', 'approved', 'cancel_requested']
    case 'all':
    default:
      return null
  }
}
