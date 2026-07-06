// 구글캘린더 API 클라이언트 (서비스 계정 방식, 외부 라이브러리 없이 node:crypto로 JWT 서명)
//
// 필요한 환경 변수:
// - GOOGLE_SERVICE_ACCOUNT_EMAIL: 서비스 계정 이메일 (xxx@yyy.iam.gserviceaccount.com)
// - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 서비스 계정 JSON 키의 private_key 값
//   (Vercel 등에서 한 줄로 넣을 때 \n 이스케이프 허용)
// - GOOGLE_CALENDAR_ID_SOUTH: 경기남부 캘린더 ID (예: sportsbox031@gmail.com)
// - GOOGLE_CALENDAR_ID_NORTH: 경기북부 캘린더 ID (추후 연동 시 설정)
//
// 사전 준비: 대상 구글 캘린더를 서비스 계정 이메일과 공유("일정 변경" 권한)해야 한다.

import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const REQUEST_TIMEOUT_MS = 10000

let cachedToken: { token: string; expiresAt: number } | null = null

function getServiceAccountEmail(): string | null {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null
}

function getServiceAccountPrivateKey(): string | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!raw) {
    return null
  }
  // 환경 변수에 \n 문자열로 저장된 경우 실제 줄바꿈으로 변환
  return raw.replace(/\\n/g, '\n')
}

// 지역별 캘린더 ID. 미설정 지역은 null (연동 안 됨)
export function getCalendarIdForRegion(regionCode: string): string | null {
  if (regionCode === 'south') {
    return process.env.GOOGLE_CALENDAR_ID_SOUTH || null
  }
  if (regionCode === 'north') {
    return process.env.GOOGLE_CALENDAR_ID_NORTH || null
  }
  return null
}

export function isCalendarSyncConfigured(regionCode: string): boolean {
  return Boolean(getServiceAccountEmail() && getServiceAccountPrivateKey() && getCalendarIdForRegion(regionCode))
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// 서비스 계정 JWT를 발급해 액세스 토큰으로 교환 (인스턴스 내 캐시)
async function getAccessToken(): Promise<string> {
  const email = getServiceAccountEmail()
  const privateKey = getServiceAccountPrivateKey()

  if (!email || !privateKey) {
    throw new Error('구글 서비스 계정 환경 변수가 설정되지 않았습니다.')
  }

  const now = Date.now()
  if (cachedToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const nowSeconds = Math.floor(now / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }))

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const signature = signer.sign(privateKey).toString('base64url')
  const assertion = `${header}.${claims}.${signature}`

  const response = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`구글 인증 실패 (${response.status}): ${body.slice(0, 200)}`)
  }

  const payload = await response.json() as { access_token: string; expires_in: number }
  cachedToken = {
    token: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  }

  return payload.access_token
}

export interface CalendarEventBody {
  summary: string
  description: string
  location: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

// 이벤트 생성 → 생성된 이벤트 ID 반환
export async function insertCalendarEvent(calendarId: string, event: CalendarEventBody): Promise<string> {
  const token = await getAccessToken()
  const response = await fetchWithTimeout(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`이벤트 생성 실패 (${response.status}): ${body.slice(0, 200)}`)
  }

  const payload = await response.json() as { id: string }
  return payload.id
}

// 이벤트 수정. 이벤트가 캘린더에서 이미 삭제된 경우 'not_found' 반환
export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  event: CalendarEventBody
): Promise<'updated' | 'not_found'> {
  const token = await getAccessToken()
  const response = await fetchWithTimeout(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (response.status === 404 || response.status === 410) {
    return 'not_found'
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`이벤트 수정 실패 (${response.status}): ${body.slice(0, 200)}`)
  }

  return 'updated'
}

// 이벤트 삭제. 이미 없으면 성공으로 간주
export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  const token = await getAccessToken()
  const response = await fetchWithTimeout(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const body = await response.text()
    throw new Error(`이벤트 삭제 실패 (${response.status}): ${body.slice(0, 200)}`)
  }
}
