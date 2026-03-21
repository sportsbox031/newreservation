import { getErrorMessage, withTimeout } from '@/lib/requestUtils'

const AUTH_API_TIMEOUT_MS = 8000

interface UserLoginApiResult {
  session_token?: string
  session_expires?: string
  status?: string
  [key: string]: unknown
}

interface AdminLoginApiResult {
  id: string
  username: string
  role: string
  region_id: number | null
  phone: string | null
  email: string | null
  isAuthenticated: boolean
  session_token: string
  session_expires: string
}

interface SessionValidationApiResult {
  users: unknown
  [key: string]: unknown
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestAuthApi<T>(input: RequestInfo, init?: RequestInit) {
  try {
    const response = await withTimeout(
      fetch(input, {
        credentials: 'include',
        ...init,
      }),
      AUTH_API_TIMEOUT_MS,
      '인증 요청 응답이 지연되고 있습니다.'
    )

    const json = await readJsonSafely(response)
    if (!response.ok) {
      return {
        data: null,
        error: json?.error || { message: '인증 요청에 실패했습니다.' },
      }
    }

    return {
      data: (json?.data ?? null) as T | null,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: { message: getErrorMessage(error, '인증 요청 중 오류가 발생했습니다.') },
    }
  }
}

function getBearerHeaders(sessionToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  }
}

function getOptionalBearerHeaders(sessionToken?: string): HeadersInit {
  if (!sessionToken) {
    return {
      'Content-Type': 'application/json',
    }
  }

  return getBearerHeaders(sessionToken)
}

export const authApiClient = {
  register(userData: {
    organization_type: 'school' | 'welfare'
    organization_name: string
    password: string
    manager_name: string
    city_name: string
    phone: string
    email: string
    student_count: number
    class_count: number
    privacy_consent: boolean
  }) {
    return requestAuthApi<unknown[]>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
  },

  loginUser(organizationName: string, password: string) {
    return requestAuthApi<UserLoginApiResult>('/api/auth/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_name: organizationName,
        password,
      }),
    })
  },

  loginAdmin(username: string, password: string) {
    return requestAuthApi<AdminLoginApiResult>('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
    })
  },

  validateUserSession(sessionToken?: string) {
    return requestAuthApi<SessionValidationApiResult>('/api/auth/session', {
      method: 'GET',
      headers: getOptionalBearerHeaders(sessionToken),
    })
  },

  refreshUserSession(sessionToken?: string) {
    return requestAuthApi<unknown>('/api/auth/session', {
      method: 'PATCH',
      headers: getOptionalBearerHeaders(sessionToken),
    })
  },

  logoutSession(sessionToken?: string) {
    return requestAuthApi<unknown>('/api/auth/logout', {
      method: 'POST',
      headers: getOptionalBearerHeaders(sessionToken),
    })
  },
}
