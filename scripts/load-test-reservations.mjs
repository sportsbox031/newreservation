import crypto from 'node:crypto'

const requiredEnv = [
  'LOADTEST_APP_BASE_URL',
  'LOADTEST_SUPABASE_URL',
  'LOADTEST_SUPABASE_SERVICE_ROLE_KEY',
  'LOADTEST_USER_PREFIX',
  'LOADTEST_TARGET_DATE',
]

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`)
    process.exit(1)
  }
}

const appBaseUrl = process.env.LOADTEST_APP_BASE_URL.replace(/\/$/, '')
const supabaseUrl = process.env.LOADTEST_SUPABASE_URL.replace(/\/$/, '')
const serviceRoleKey = process.env.LOADTEST_SUPABASE_SERVICE_ROLE_KEY
const protectionBypass = process.env.LOADTEST_VERCEL_PROTECTION_BYPASS || ''
const userPrefix = process.env.LOADTEST_USER_PREFIX
const targetDate = process.env.LOADTEST_TARGET_DATE
const regionId = Number(process.env.LOADTEST_REGION_ID || '1')
const regionCode = process.env.LOADTEST_REGION_CODE || (regionId === 2 ? 'north' : 'south')
const tierId = Number(process.env.LOADTEST_TIER_ID || '2')
const tierCreatedBy = process.env.LOADTEST_TIER_CREATED_BY || 'loadtest-runner'
const requestTimeoutMs = Number(process.env.LOADTEST_REQUEST_TIMEOUT_MS || '15000')
const sessionSetupConcurrency = Number(process.env.LOADTEST_SESSION_SETUP_CONCURRENCY || '25')
const concurrentUsers = Number(process.env.LOADTEST_CONCURRENT_USERS || '400')
const closedDurationMs = Number(process.env.LOADTEST_CLOSED_DURATION_MS || '120000')
const closedRefreshIntervalMs = Number(process.env.LOADTEST_CLOSED_REFRESH_INTERVAL_MS || '3000')
const closedLoopJitterMs = Number(process.env.LOADTEST_CLOSED_LOOP_JITTER_MS || '600')
const openRefreshUsers = Number(process.env.LOADTEST_OPEN_REFRESH_USERS || String(Math.ceil(concurrentUsers / 2)))
const openRefreshIterations = Number(process.env.LOADTEST_OPEN_REFRESH_ITERATIONS || '3')
const openRefreshIntervalMs = Number(process.env.LOADTEST_OPEN_REFRESH_INTERVAL_MS || '1500')
const reservationAttemptUsers = Number(process.env.LOADTEST_RESERVATION_ATTEMPT_USERS || String(concurrentUsers))
const reservationAttemptSpreadMs = Number(process.env.LOADTEST_RESERVATION_ATTEMPT_SPREAD_MS || '5000')
const pageProbeCount = Number(process.env.LOADTEST_PAGE_PROBE_COUNT || '30')
const slotStart = process.env.LOADTEST_SLOT_START || '09:00'
const slotEnd = process.env.LOADTEST_SLOT_END || '09:40'
const dashboardTimeoutMs = Number(process.env.LOADTEST_DASHBOARD_TIMEOUT_MS || '8000')
const pageProbeTimeoutMs = Number(process.env.LOADTEST_PAGE_PROBE_TIMEOUT_MS || '5000')
const restoreTierSetting = process.env.LOADTEST_RESTORE_TIER_SETTING !== 'false'

const yearMonth = targetDate.slice(0, 7)
const [targetYear, targetMonth] = yearMonth.split('-').map(value => Number(value))

if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) {
  console.error(`Invalid LOADTEST_TARGET_DATE: ${targetDate}`)
  process.exit(1)
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

function getAppHeaders(extraHeaders = {}) {
  return {
    ...(protectionBypass && { 'x-vercel-protection-bypass': protectionBypass }),
    ...extraHeaders,
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let currentIndex = 0

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex
      currentIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

async function fetchWithTimeout(url, options = {}, timeoutMs = requestTimeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const startedAt = Date.now()
    const response = await fetch(url, { ...options, signal: controller.signal })
    return {
      response,
      durationMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timer)
  }
}

function percentile(values, ratio) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return sorted[index]
}

function average(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

async function supabaseRest(path, options = {}) {
  return fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  })
}

function initMetric(name) {
  return {
    name,
    total: 0,
    ok: 0,
    failed: 0,
    timeouts: 0,
    byStatus: {},
    durations: [],
    samples: [],
  }
}

function recordMetric(metric, result) {
  metric.total += 1
  if (typeof result.durationMs === 'number') {
    metric.durations.push(result.durationMs)
  }

  const statusKey = String(result.status ?? 0)
  metric.byStatus[statusKey] = (metric.byStatus[statusKey] || 0) + 1

  if (result.ok) {
    metric.ok += 1
  } else {
    metric.failed += 1
    if (result.error === 'timeout') {
      metric.timeouts += 1
    }
    if (metric.samples.length < 10) {
      metric.samples.push({
        status: result.status ?? 0,
        error: result.error || null,
        body: result.body || null,
        path: result.path || null,
      })
    }
  }
}

function summarizeMetric(metric) {
  return {
    name: metric.name,
    total: metric.total,
    ok: metric.ok,
    failed: metric.failed,
    timeouts: metric.timeouts,
    avgMs: average(metric.durations),
    p95Ms: percentile(metric.durations, 0.95),
    p99Ms: percentile(metric.durations, 0.99),
    byStatus: metric.byStatus,
    samples: metric.samples,
  }
}

function initScenarioMetrics() {
  return {
    validateSession: initMetric('validateSession'),
    gateCheck: initMetric('gateCheck'),
    calendar: initMetric('calendar'),
    me: initMetric('me'),
    reservation: initMetric('reservation'),
    pageProbe: initMetric('pageProbe'),
  }
}

function printScenarioMetrics(title, metrics) {
  console.log(`\n=== ${title} ===`)
  for (const metric of Object.values(metrics)) {
    console.log(JSON.stringify(summarizeMetric(metric), null, 2))
  }
}

async function getLoadtestUsers(limit) {
  const query = `/rest/v1/users?select=id,organization_name,status&status=eq.approved&organization_name=like.${encodeURIComponent(userPrefix)}*&order=organization_name.asc&limit=${limit}`
  const response = await supabaseRest(query)
  if (!response.ok) {
    throw new Error(`Failed to load users: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function createUserSession(userId) {
  const sessionToken = `${crypto.randomUUID()}_${Date.now()}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const response = await supabaseRest('/rest/v1/user_sessions', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{
      user_id: userId,
      session_token: sessionToken,
      user_agent: 'load-test-runner',
      ip_address: '127.0.0.1',
      is_active: true,
      expires_at: expiresAt,
    }]),
  })

  if (!response.ok) {
    throw new Error(`Failed to create session for ${userId}: ${response.status} ${await response.text()}`)
  }

  return sessionToken
}

async function deleteUserSessions(sessionTokens) {
  if (sessionTokens.length === 0) return
  const inList = sessionTokens.map(token => `"${token}"`).join(',')
  await supabaseRest(`/rest/v1/user_sessions?session_token=in.(${encodeURIComponent(inList)})`, {
    method: 'DELETE',
  })
}

async function deleteReservationsForUsers(userIds) {
  if (userIds.length === 0) return
  const inList = userIds.map(id => `"${id}"`).join(',')
  await supabaseRest(`/rest/v1/reservations?user_id=in.(${encodeURIComponent(inList)})&date=eq.${targetDate}`, {
    method: 'DELETE',
  })
}

async function getExistingTierSetting() {
  const response = await supabaseRest(
    `/rest/v1/tier_reservation_settings?select=*&region_code=eq.${regionCode}&year_month=eq.${yearMonth}&tier_id=eq.${tierId}&limit=1`
  )

  if (!response.ok) {
    throw new Error(`Failed to read tier setting: ${response.status} ${await response.text()}`)
  }

  const rows = await response.json()
  return rows[0] || null
}

async function upsertTierSetting(isOpen) {
  const response = await supabaseRest('/rest/v1/tier_reservation_settings?on_conflict=region_code,year_month,tier_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([{
      region_code: regionCode,
      year_month: yearMonth,
      tier_id: tierId,
      is_open: isOpen,
      reservation_start_date: targetDate,
      created_by: tierCreatedBy,
    }]),
  })

  if (!response.ok) {
    throw new Error(`Failed to upsert tier setting: ${response.status} ${await response.text()}`)
  }

  const rows = await response.json()
  return rows[0] || null
}

async function deleteTierSetting() {
  const response = await supabaseRest(
    `/rest/v1/tier_reservation_settings?region_code=eq.${regionCode}&year_month=eq.${yearMonth}&tier_id=eq.${tierId}`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    throw new Error(`Failed to delete tier setting: ${response.status} ${await response.text()}`)
  }
}

async function restorePreviousTierSetting(previous) {
  if (!restoreTierSetting) {
    return
  }

  if (!previous) {
    await deleteTierSetting()
    return
  }

  const response = await supabaseRest(
    `/rest/v1/tier_reservation_settings?region_code=eq.${regionCode}&year_month=eq.${yearMonth}&tier_id=eq.${tierId}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        is_open: previous.is_open,
        reservation_start_date: previous.reservation_start_date,
        created_by: previous.created_by,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to restore tier setting: ${response.status} ${await response.text()}`)
  }
}

async function validateSession(sessionToken) {
  const now = encodeURIComponent(new Date().toISOString())
  const select = encodeURIComponent(
    'id,user_id,expires_at,is_active,users!inner(id,organization_name,city_id,status)'
  )

  try {
    const { response, durationMs } = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/user_sessions?select=${select}&session_token=eq.${encodeURIComponent(sessionToken)}&is_active=eq.true&expires_at=gte.${now}&limit=1`,
      {
        method: 'GET',
        headers,
      }
    )

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        durationMs,
        error: 'validate_failed',
        body: await response.text(),
      }
    }

    const rows = await response.json()
    return {
      ok: rows.length > 0,
      status: rows.length > 0 ? 200 : 404,
      durationMs,
      body: rows[0] || null,
      error: rows.length > 0 ? null : 'session_not_found',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: requestTimeoutMs,
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function checkGateLikeClient(sessionToken) {
  try {
    const { response, durationMs } = await fetchWithTimeout(
      `${appBaseUrl}/api/dashboard/gate?year=${targetYear}&month=${targetMonth}`,
      {
        method: 'GET',
        headers: getAppHeaders({
          authorization: `Bearer ${sessionToken}`,
        }),
      }
    )

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        durationMs,
        error: 'gate_failed',
        body: await response.text(),
      }
    }

    const body = await response.json().catch(() => null)
    return {
      ok: true,
      status: 200,
      durationMs,
      body: {
        isOpen: body?.data?.is_open === true,
        tier: body?.data?.tier ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: requestTimeoutMs,
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function fetchDashboardCalendar(sessionToken) {
  try {
    const { response, durationMs } = await fetchWithTimeout(
      `${appBaseUrl}/api/dashboard/calendar?year=${targetYear}&month=${targetMonth}`,
      {
        method: 'GET',
        headers: getAppHeaders({
          authorization: `Bearer ${sessionToken}`,
        }),
      },
      dashboardTimeoutMs
    )

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      path: '/api/dashboard/calendar',
      body: await response.json().catch(() => null),
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: dashboardTimeoutMs,
      path: '/api/dashboard/calendar',
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function submitReservation(sessionToken) {
  const body = {
    regionId,
    date: targetDate,
    slots: [
      {
        start_time: slotStart,
        end_time: slotEnd,
        grade: '기타',
        participant_count: 10,
        location: '부하테스트',
        slot_order: 1,
      },
    ],
  }

  try {
    const { response, durationMs } = await fetchWithTimeout(`${appBaseUrl}/api/reservations`, {
      method: 'POST',
      headers: getAppHeaders({
        'content-type': 'application/json',
        authorization: `Bearer ${sessionToken}`,
      }),
      body: JSON.stringify(body),
    })

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      body: await response.json().catch(() => ({})),
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: requestTimeoutMs,
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function probePage(path) {
  try {
    const { response, durationMs } = await fetchWithTimeout(`${appBaseUrl}${path}`, {
      method: 'GET',
      headers: getAppHeaders(),
    }, pageProbeTimeoutMs)

    return { ok: response.ok, status: response.status, durationMs, path }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: pageProbeTimeoutMs,
      path,
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function simulateClosedRefresh(entry, metrics, stopAt) {
  while (Date.now() < stopAt) {
    const sessionResult = await validateSession(entry.sessionToken)
    recordMetric(metrics.validateSession, sessionResult)

    if (sessionResult.ok) {
      const gateResult = await checkGateLikeClient(entry.sessionToken)
      recordMetric(metrics.gateCheck, gateResult)
    }

    const waitMs = closedRefreshIntervalMs + randomInt(Math.max(1, closedLoopJitterMs))
    await sleep(waitMs)
  }
}

async function simulateOpenRefresh(entry, metrics) {
  for (let iteration = 0; iteration < openRefreshIterations; iteration += 1) {
    const sessionResult = await validateSession(entry.sessionToken)
    recordMetric(metrics.validateSession, sessionResult)

    if (!sessionResult.ok) {
      await sleep(openRefreshIntervalMs)
      continue
    }

    const gateResult = await checkGateLikeClient(entry.sessionToken)
    recordMetric(metrics.gateCheck, gateResult)

    if (gateResult.ok && gateResult.body?.isOpen) {
      const calendarResult = await fetchDashboardCalendar(entry.sessionToken)
      recordMetric(metrics.calendar, calendarResult)
    }

    await sleep(openRefreshIntervalMs)
  }
}

async function simulateReservationAttempt(entry, metrics) {
  if (reservationAttemptSpreadMs > 0) {
    await sleep(randomInt(reservationAttemptSpreadMs))
  }

  const calendarResult = await fetchDashboardCalendar(entry.sessionToken)
  recordMetric(metrics.calendar, calendarResult)

  const reservationResult = await submitReservation(entry.sessionToken)
  recordMetric(metrics.reservation, reservationResult)
}

async function runScenario(sessionEntries) {
  const metrics = initScenarioMetrics()
  const selectedEntries = sessionEntries.slice(0, concurrentUsers)
  const pageProbePaths = ['/', '/announcements', '/auth/login']

  console.log(`Running open-switch scenario with ${selectedEntries.length} users`)
  console.log(`Closed phase: ${Math.round(closedDurationMs / 1000)}s, refresh every ~${closedRefreshIntervalMs}ms`)
  console.log(`Open phase: ${Math.min(openRefreshUsers, selectedEntries.length)} users keep refreshing, ${Math.min(reservationAttemptUsers, selectedEntries.length)} users attempt reservations`)

  await upsertTierSetting(false)
  const closedStopAt = Date.now() + closedDurationMs

  await Promise.all([
    ...selectedEntries.map(entry => simulateClosedRefresh(entry, metrics, closedStopAt)),
    ...Array.from({ length: pageProbeCount }, (_, index) => probePage(pageProbePaths[index % pageProbePaths.length]).then(result => {
      recordMetric(metrics.pageProbe, result)
    })),
  ])

  printScenarioMetrics('Closed Phase Metrics', metrics)

  console.log('\nOpening reservation gate now...')
  await upsertTierSetting(true)

  const refreshEntries = selectedEntries.slice(0, Math.min(openRefreshUsers, selectedEntries.length))
  const reservationEntries = selectedEntries.slice(0, Math.min(reservationAttemptUsers, selectedEntries.length))

  await Promise.all([
    ...refreshEntries.map(entry => simulateOpenRefresh(entry, metrics)),
    ...reservationEntries.map(entry => simulateReservationAttempt(entry, metrics)),
    ...Array.from({ length: pageProbeCount }, (_, index) => probePage(pageProbePaths[index % pageProbePaths.length]).then(result => {
      recordMetric(metrics.pageProbe, result)
    })),
  ])

  printScenarioMetrics('Full Scenario Metrics', metrics)

  const reservationSummary = summarizeMetric(metrics.reservation)
  const calendarSummary = summarizeMetric(metrics.calendar)
  const meSummary = summarizeMetric(metrics.me)
  const gateSummary = summarizeMetric(metrics.gateCheck)
  const sessionSummary = summarizeMetric(metrics.validateSession)
  const pageSummary = summarizeMetric(metrics.pageProbe)

  console.log('\n=== Scenario Summary Table ===')
  console.table([{
    users: selectedEntries.length,
    closedSeconds: Math.round(closedDurationMs / 1000),
    reservationOk: reservationSummary.ok,
    reservationFail: reservationSummary.failed,
    reservation409: reservationSummary.byStatus['409'] || 0,
    reservation500: reservationSummary.byStatus['500'] || 0,
    reservationTimeout: reservationSummary.timeouts,
    reservationP95: reservationSummary.p95Ms,
    calendarFail: calendarSummary.failed,
    meFail: meSummary.failed,
    gateFail: gateSummary.failed,
    sessionFail: sessionSummary.failed,
    pageFail: pageSummary.failed,
  }])
}

async function main() {
  const users = await getLoadtestUsers(concurrentUsers)

  if (users.length < concurrentUsers) {
    throw new Error(`Not enough approved load-test users. Required ${concurrentUsers}, found ${users.length}. Prefix: ${userPrefix}`)
  }

  const previousTierSetting = await getExistingTierSetting()

  console.log(`Preparing ${concurrentUsers} user sessions with concurrency ${sessionSetupConcurrency}...`)
  const sessionEntries = await mapWithConcurrency(
    users.slice(0, concurrentUsers),
    sessionSetupConcurrency,
    async (user) => ({
      userId: user.id,
      sessionToken: await createUserSession(user.id),
    })
  )

  try {
    await deleteReservationsForUsers(sessionEntries.map(entry => entry.userId))
    await runScenario(sessionEntries)
  } finally {
    await deleteReservationsForUsers(sessionEntries.map(entry => entry.userId))
    await deleteUserSessions(sessionEntries.map(entry => entry.sessionToken))
    await restorePreviousTierSetting(previousTierSetting)
  }
}

main().catch(error => {
  console.error('\nLoad test failed:')
  console.error(error)
  process.exit(1)
})
