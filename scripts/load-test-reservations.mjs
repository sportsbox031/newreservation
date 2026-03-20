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
const userPrefix = process.env.LOADTEST_USER_PREFIX
const targetDate = process.env.LOADTEST_TARGET_DATE
const regionId = Number(process.env.LOADTEST_REGION_ID || '1')
const stages = (process.env.LOADTEST_STAGES || '100,300,500')
  .split(',')
  .map(value => Number(value.trim()))
  .filter(value => Number.isFinite(value) && value > 0)
const stageCooldownMs = Number(process.env.LOADTEST_STAGE_COOLDOWN_MS || '5000')
const requestTimeoutMs = Number(process.env.LOADTEST_REQUEST_TIMEOUT_MS || '15000')
const pageProbeCount = Number(process.env.LOADTEST_PAGE_PROBE_COUNT || '20')
const slotStart = process.env.LOADTEST_SLOT_START || '09:00'
const slotEnd = process.env.LOADTEST_SLOT_END || '09:40'
const dashboardRefreshesPerUser = Number(process.env.LOADTEST_DASHBOARD_REFRESHES_PER_USER || '1')
const sessionSetupConcurrency = Number(process.env.LOADTEST_SESSION_SETUP_CONCURRENCY || '25')

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
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

async function fetchDashboardBootstrap(sessionToken) {
  try {
    const { response, durationMs } = await fetchWithTimeout(
      `${appBaseUrl}/api/dashboard/bootstrap?year=2026&month=3`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
      8000
    )

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      path: '/api/dashboard/bootstrap',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: 8000,
      path: '/api/dashboard/bootstrap',
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

async function probePage(path) {
  try {
    const { response, durationMs } = await fetchWithTimeout(`${appBaseUrl}${path}`, {
      method: 'GET',
    }, 5000)

    return { ok: response.ok, status: response.status, durationMs, path }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: 5000,
      path,
      error: error?.name === 'AbortError' ? 'timeout' : String(error),
    }
  }
}

function summarizeResults(stageSize, reservationResults, pageResults, dashboardResults) {
  const reservationDurations = reservationResults
    .filter(result => typeof result.durationMs === 'number')
    .map(result => result.durationMs)
  const successCount = reservationResults.filter(result => result.ok).length
  const timeoutCount = reservationResults.filter(result => result.error === 'timeout').length
  const conflictCount = reservationResults.filter(result => result.status === 409).length
  const failureCount = reservationResults.length - successCount

  const pageFailures = pageResults.filter(result => !result.ok)
  const dashboardFailures = dashboardResults.filter(result => !result.ok)

  return {
    stageSize,
    successCount,
    failureCount,
    conflictCount,
    timeoutCount,
    avgMs: average(reservationDurations),
    p95Ms: percentile(reservationDurations, 0.95),
    p99Ms: percentile(reservationDurations, 0.99),
    pageFailureCount: pageFailures.length,
    dashboardFailureCount: dashboardFailures.length,
    pageFailures: pageFailures.slice(0, 10),
    dashboardFailures: dashboardFailures.slice(0, 10),
  }
}

async function runStage(sessionEntries, stageSize) {
  const selectedEntries = sessionEntries.slice(0, stageSize)
  const userIds = selectedEntries.map(entry => entry.userId)
  const sessionTokens = selectedEntries.map(entry => entry.sessionToken)

  console.log(`\n[Stage ${stageSize}] Starting reservation burst for ${selectedEntries.length} users`)

  const pageProbePaths = ['/', '/announcements', '/admin/reservations']
  const pageProbeTasks = Array.from({ length: pageProbeCount }).map((_, index) => {
    const path = pageProbePaths[index % pageProbePaths.length]
    return probePage(path)
  })
  const dashboardTasks = sessionTokens.flatMap(token =>
    Array.from({ length: dashboardRefreshesPerUser }, () => fetchDashboardBootstrap(token))
  )

  const reservationResults = await Promise.all(sessionTokens.map(token => submitReservation(token)))
  const [pageResults, dashboardResults] = await Promise.all([
    Promise.all(pageProbeTasks),
    Promise.all(dashboardTasks)
  ])
  const summary = summarizeResults(stageSize, reservationResults, pageResults, dashboardResults)

  console.log(JSON.stringify(summary, null, 2))

  await deleteReservationsForUsers(userIds)
  await sleep(stageCooldownMs)

  return summary
}

async function main() {
  const maxStage = Math.max(...stages)
  const users = await getLoadtestUsers(maxStage)

  if (users.length < maxStage) {
    throw new Error(`Not enough approved load-test users. Required ${maxStage}, found ${users.length}. Prefix: ${userPrefix}`)
  }

  console.log(`Preparing ${maxStage} user sessions with concurrency ${sessionSetupConcurrency}...`)
  const sessionEntries = await mapWithConcurrency(
    users.slice(0, maxStage),
    sessionSetupConcurrency,
    async (user) => ({
      userId: user.id,
      sessionToken: await createUserSession(user.id),
    })
  )

  const summaries = []
  try {
    for (const stageSize of stages) {
      summaries.push(await runStage(sessionEntries, stageSize))
    }

    console.log('\n=== Load Test Summary ===')
    console.table(summaries.map(summary => ({
      stage: summary.stageSize,
      success: summary.successCount,
      fail: summary.failureCount,
      conflict: summary.conflictCount,
      timeout: summary.timeoutCount,
      avgMs: summary.avgMs,
      p95Ms: summary.p95Ms,
      p99Ms: summary.p99Ms,
      pageFail: summary.pageFailureCount,
      dashboardFail: summary.dashboardFailureCount,
    })))
  } finally {
    await deleteUserSessions(sessionEntries.map(entry => entry.sessionToken))
  }
}

main().catch(error => {
  console.error('\nLoad test failed:')
  console.error(error)
  process.exit(1)
})
