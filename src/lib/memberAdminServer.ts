import { createClient } from '@supabase/supabase-js'

import { Database } from '@/types/database'
import { hashPassword, verifyPassword } from '@/lib/passwordHash'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import {
  canManageRequestedRegion,
  resolveMemberRegionScope,
  resolveMemberStatusScope,
} from '@/lib/memberAdminHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const QUERY_TIMEOUT_MS = 8000
const LONG_QUERY_TIMEOUT_MS = 12000

function timeoutError(message: string) {
  return { message }
}

async function runQueryWithTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = QUERY_TIMEOUT_MS
): Promise<T> {
  return withTimeout(promise, timeoutMs, message)
}

export async function getMembersForAdmin(
  adminRole: string,
  requestedRegionCode: string | null,
  requestedStatus: string | null
) {
  const regionScope = resolveMemberRegionScope(adminRole, requestedRegionCode)
  const statusScope = resolveMemberStatusScope(requestedStatus)

  let query = supabaseAdmin
    .from('users')
    .select(`
      *,
      cities!inner(name, regions!inner(name, code))
    `)
    .order('created_at', { ascending: false })

  if (regionScope) {
    query = query.eq('cities.regions.code', regionScope)
  }

  if (statusScope) {
    query = query.eq('status', statusScope)
  }

  try {
    const { data, error } = await runQueryWithTimeout(
      query,
      '회원 정보를 불러오는 중 시간이 초과되었습니다.',
      LONG_QUERY_TIMEOUT_MS
    )

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '회원 정보를 불러오는 중 오류가 발생했습니다.')),
    }
  }
}

async function getMemberRegionCode(memberId: string): Promise<string | null> {
  const { data, error } = await runQueryWithTimeout(
    supabaseAdmin
      .from('users')
      .select('cities!inner(regions!inner(code))')
      .eq('id', memberId)
      .single(),
    '회원 지역 정보를 불러오는 중 시간이 초과되었습니다.'
  )

  if (error || !data) {
    return null
  }

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities
  const region = Array.isArray(city?.regions) ? city.regions[0] : city?.regions
  return region?.code || null
}

async function ensureAdminCanManageMember(adminRole: string, memberId: string) {
  const memberRegionCode = await getMemberRegionCode(memberId)
  if (!canManageRequestedRegion(adminRole, memberRegionCode)) {
    return { allowed: false, error: { message: '해당 지역 회원을 관리할 권한이 없습니다.' } }
  }

  return { allowed: true, error: null }
}

export async function updateMemberStatusOnServer(
  adminRole: string,
  memberId: string,
  status: 'approved' | 'rejected'
) {
  const access = await ensureAdminCanManageMember(adminRole, memberId)
  if (!access.allowed) {
    return { data: null, error: access.error }
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ status })
    .eq('id', memberId)
    .select()

  return { data, error }
}

export async function resetMemberPasswordOnServer(
  adminRole: string,
  memberId: string,
  newPassword: string
) {
  const access = await ensureAdminCanManageMember(adminRole, memberId)
  if (!access.allowed) {
    return { data: null, error: access.error }
  }

  const passwordHash = await hashPassword(newPassword)
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', memberId)
    .select()

  return { data, error }
}

export async function updateMemberTierOnServer(
  adminRole: string,
  memberId: string,
  tier: 'Priority' | 'Standard'
) {
  const access = await ensureAdminCanManageMember(adminRole, memberId)
  if (!access.allowed) {
    return { data: null, error: access.error }
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ tier })
    .eq('id', memberId)
    .select()

  return { data, error }
}

export async function deleteMemberOnServer(adminRole: string, memberId: string) {
  const access = await ensureAdminCanManageMember(adminRole, memberId)
  if (!access.allowed) {
    return { data: null, error: access.error }
  }

  try {
    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('user_id', memberId)

    const reservationIds = reservations?.map((reservation) => reservation.id) || []

    if (reservationIds.length > 0) {
      await supabaseAdmin
        .from('reservation_slots')
        .delete()
        .in('reservation_id', reservationIds)

      await supabaseAdmin
        .from('reservation_logs')
        .delete()
        .in('reservation_id', reservationIds)
    }

    await supabaseAdmin
      .from('reservations')
      .delete()
      .eq('user_id', memberId)

    await supabaseAdmin
      .from('reservation_transactions')
      .delete()
      .eq('user_id', memberId)

    await supabaseAdmin
      .from('announcement_views')
      .delete()
      .eq('user_id', memberId)

    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', memberId)

    const { data, error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', memberId)

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: timeoutError(getErrorMessage(error, '회원 삭제 중 오류가 발생했습니다.')),
    }
  }
}

export async function updateUserProfileOnServer(
  userId: string,
  updateData: {
    manager_name?: string
    phone?: string
    email?: string
    student_count?: number
    class_count?: number
  }
) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()

  return { data, error }
}

export async function changeUserPasswordOnServer(userId: string, currentPassword: string, newPassword: string) {
  const { data: user, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single()

  if (fetchError || !user) {
    return { data: null, error: { message: '사용자 정보를 찾을 수 없습니다.' } }
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.password_hash)
  if (!isPasswordValid) {
    return { data: null, error: { message: '현재 비밀번호가 일치하지 않습니다.' } }
  }

  const newPasswordHash = await hashPassword(newPassword)
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', userId)
    .select()

  return { data, error }
}

export async function updateAdminProfileOnServer(
  adminId: string,
  updates: { phone?: string; email?: string }
) {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .update(updates)
    .eq('id', adminId)
    .select()

  return { data, error }
}

export async function changeAdminPasswordOnServer(
  adminId: string,
  currentPassword: string,
  newPassword: string
) {
  const { data: admin, error: fetchError } = await supabaseAdmin
    .from('admins')
    .select('password_hash')
    .eq('id', adminId)
    .single()

  if (fetchError || !admin) {
    return { data: null, error: { message: '관리자 정보를 찾을 수 없습니다.' } }
  }

  const isPasswordValid = await verifyPassword(currentPassword, admin.password_hash)
  if (!isPasswordValid) {
    return { data: null, error: { message: '현재 비밀번호가 일치하지 않습니다.' } }
  }

  const newPasswordHash = await hashPassword(newPassword)
  const { data, error } = await supabaseAdmin
    .from('admins')
    .update({ password_hash: newPasswordHash })
    .eq('id', adminId)
    .select()

  return { data, error }
}
