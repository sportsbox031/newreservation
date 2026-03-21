export function resolveMemberRegionScope(
  adminRole: string,
  requestedRegionCode: string | null
): 'south' | 'north' | null {
  if (adminRole === 'south' || adminRole === 'north') {
    return adminRole
  }

  if (requestedRegionCode === 'south' || requestedRegionCode === 'north') {
    return requestedRegionCode
  }

  return null
}

export function canManageRequestedRegion(
  adminRole: string,
  targetRegionCode: string | null
): boolean {
  if (adminRole === 'super') {
    return true
  }

  if (!targetRegionCode) {
    return false
  }

  return adminRole === targetRegionCode
}
