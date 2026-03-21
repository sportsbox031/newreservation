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

export function resolveMemberStatusScope(
  requestedStatus: string | null
): 'pending' | 'approved' | null {
  if (requestedStatus === 'pending' || requestedStatus === 'approved') {
    return requestedStatus
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

type MemberSummaryLike = {
  organization_name: string
  manager_name: string
  email: string
  phone: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | null
  cities?: {
    regions?: {
      name?: string | null
    } | null
  } | null
  region?: string
}

export function filterMembersForDisplay<T extends MemberSummaryLike>(
  members: T[],
  options: {
    searchTerm: string
    statusFilter: 'all' | 'pending' | 'approved'
    regionFilter: 'all' | '경기남부' | '경기북부'
  }
): T[] {
  const normalizedSearchTerm = options.searchTerm.trim().toLowerCase()

  return members.filter((member) => {
    const memberRegion = member.cities?.regions?.name || member.region || ''

    if (normalizedSearchTerm) {
      const matchesSearch =
        member.organization_name.toLowerCase().includes(normalizedSearchTerm) ||
        member.manager_name.toLowerCase().includes(normalizedSearchTerm) ||
        member.email.toLowerCase().includes(normalizedSearchTerm) ||
        member.phone.includes(options.searchTerm)

      if (!matchesSearch) {
        return false
      }
    }

    if (options.regionFilter !== 'all' && memberRegion !== options.regionFilter) {
      return false
    }

    if (options.statusFilter !== 'all' && member.status !== options.statusFilter) {
      return false
    }

    return true
  })
}

export function getMemberSummaryCounts<T extends MemberSummaryLike>(
  members: T[],
  options: {
    searchTerm: string
    regionFilter: 'all' | '경기남부' | '경기북부'
  }
) {
  const baseMembers = filterMembersForDisplay(members, {
    searchTerm: options.searchTerm,
    regionFilter: options.regionFilter,
    statusFilter: 'all',
  })

  return {
    total: baseMembers.length,
    pending: baseMembers.filter((member) => member.status === 'pending').length,
    approved: baseMembers.filter((member) => member.status === 'approved').length,
  }
}
