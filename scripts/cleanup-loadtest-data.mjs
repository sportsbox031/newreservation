const requiredEnv = [
  'LOADTEST_SUPABASE_URL',
  'LOADTEST_SUPABASE_SERVICE_ROLE_KEY',
  'LOADTEST_USER_PREFIX',
]

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`)
    process.exit(1)
  }
}

const supabaseUrl = process.env.LOADTEST_SUPABASE_URL.replace(/\/$/, '')
const serviceRoleKey = process.env.LOADTEST_SUPABASE_SERVICE_ROLE_KEY
const userPrefix = process.env.LOADTEST_USER_PREFIX
const targetDate = process.env.LOADTEST_TARGET_DATE || ''
const deleteUsers = process.env.LOADTEST_DELETE_USERS === 'true'

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
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

async function listUsers() {
  const response = await supabaseRest(`/rest/v1/users?select=id,organization_name&organization_name=like.${encodeURIComponent(userPrefix)}*&order=organization_name.asc&limit=1000`)
  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function deleteByIn(table, column, values, extraFilter = '') {
  if (values.length === 0) return
  const inList = values.map(value => `"${value}"`).join(',')
  const path = `/rest/v1/${table}?${column}=in.(${encodeURIComponent(inList)})${extraFilter}`
  const response = await supabaseRest(path, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Failed to delete from ${table}: ${response.status} ${await response.text()}`)
  }
}

async function main() {
  const users = await listUsers()
  const userIds = users.map(user => user.id)

  if (userIds.length === 0) {
    console.log(`No users found with prefix ${userPrefix}`)
    return
  }

  const dateFilter = targetDate ? `&date=eq.${targetDate}` : ''

  await deleteByIn('reservation_slots', 'reservation_id', [], '')
  await deleteByIn('reservations', 'user_id', userIds, dateFilter)
  await deleteByIn('user_sessions', 'user_id', userIds)

  if (deleteUsers) {
    await deleteByIn('users', 'id', userIds)
  }

  console.log(`Cleaned load-test data for prefix ${userPrefix}${targetDate ? ` on ${targetDate}` : ''}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
