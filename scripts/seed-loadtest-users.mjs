import crypto from 'node:crypto'

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
const userCount = Number(process.env.LOADTEST_USER_COUNT || '500')
const cityId = Number(process.env.LOADTEST_CITY_ID || '1')
const defaultPassword = process.env.LOADTEST_USER_PASSWORD || 'Loadtest1234!'

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

function makeUser(index) {
  const padded = String(index).padStart(3, '0')
  return {
    id: crypto.randomUUID(),
    organization_type: 'school',
    organization_name: `${userPrefix}${padded}`,
    password_hash: defaultPassword,
    manager_name: `부하테스트${padded}`,
    city_id: cityId,
    phone: `010${String(10000000 + index).slice(-8)}`,
    email: `${userPrefix}${padded}@example.com`,
    student_count: 100,
    class_count: 4,
    privacy_consent: true,
    status: 'approved',
    tier: 'Standard',
  }
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

async function listExistingUsers() {
  const response = await supabaseRest(`/rest/v1/users?select=id,organization_name&organization_name=like.${encodeURIComponent(userPrefix)}*&order=organization_name.asc&limit=${userCount}`)
  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function createUsers(users) {
  const response = await supabaseRest('/rest/v1/users', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(users),
  })

  if (!response.ok) {
    throw new Error(`Failed to create users: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

async function main() {
  const existingUsers = await listExistingUsers()
  if (existingUsers.length >= userCount) {
    console.log(`Already have ${existingUsers.length} approved users with prefix ${userPrefix}`)
    return
  }

  const existingNames = new Set(existingUsers.map(user => user.organization_name))
  const usersToCreate = []
  for (let index = 1; index <= userCount; index += 1) {
    const user = makeUser(index)
    if (!existingNames.has(user.organization_name)) {
      usersToCreate.push(user)
    }
  }

  if (usersToCreate.length === 0) {
    console.log('No users need to be created.')
    return
  }

  const createdUsers = await createUsers(usersToCreate)
  console.log(`Created ${createdUsers.length} load-test users with prefix ${userPrefix}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
