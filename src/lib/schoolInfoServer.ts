// 학교알리미(schoolinfo.go.kr) OpenAPI 연동 서버 유틸
// apiType=62(학교현황)에서 초등학교의 학급수계/학생수계를 조회해 티어 자동 계산에 사용한다.
// 인증키는 SCHOOLINFO_API_KEY 환경변수로만 관리하고 클라이언트에 노출하지 않는다.

const SCHOOLINFO_API_BASE = 'https://www.schoolinfo.go.kr/openApi.do'
const GYEONGGI_SIDO_CODE = '41'
const ELEMENTARY_SCHOOL_KND_CODE = '02'
const REQUEST_TIMEOUT_MS = 12000
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const MAX_CONCURRENT_REQUESTS = 4

// 경기도 31개 시/군 → 학교알리미 시군구 코드 매핑
// 학교알리미는 일부 시를 구 단위로 나누므로(수원/성남/안양/부천/안산/고양/용인/화성)
// 앱의 시/군 이름 하나가 여러 sggCode에 대응한다.
// 2026-07 기준 실제 API 호출로 전 코드 유효성 검증 완료 (총 1,374개 초등학교).
export const GYEONGGI_SGG_CODES: Record<string, string[]> = {
  수원시: ['41111', '41113', '41115', '41117'],
  성남시: ['41131', '41133', '41135'],
  의정부시: ['41150'],
  안양시: ['41171', '41173'],
  부천시: ['41192', '41194', '41196'],
  광명시: ['41210'],
  평택시: ['41220'],
  동두천시: ['41250'],
  안산시: ['41271', '41273'],
  고양시: ['41281', '41285', '41287'],
  과천시: ['41290'],
  구리시: ['41310'],
  남양주시: ['41360'],
  오산시: ['41370'],
  시흥시: ['41390'],
  군포시: ['41410'],
  의왕시: ['41430'],
  하남시: ['41450'],
  용인시: ['41461', '41463', '41465'],
  파주시: ['41480'],
  이천시: ['41500'],
  안성시: ['41550'],
  김포시: ['41570'],
  화성시: ['41591', '41593', '41595', '41597'],
  광주시: ['41610'],
  양주시: ['41630'],
  포천시: ['41650'],
  여주시: ['41670'],
  연천군: ['41800'],
  가평군: ['41820'],
  양평군: ['41830'],
}

interface SchoolInfoRawRow {
  SCHUL_NM?: string
  COL_SUM?: string | number
  COL_FGR_SUM?: string | number
  PBAN_EXCP_YN?: string
}

interface SchoolInfoApiResponse {
  resultCode?: string
  resultMsg?: string
  list?: SchoolInfoRawRow[]
}

export interface SchoolRecord {
  schoolName: string
  normalizedName: string
  cityName: string
  // 특수학급/특수학급 학생을 제외한 일반학급 기준 학급수/학생수
  classCount: number
  studentCount: number
}

// 학교알리미 수치는 "18(2)"처럼 괄호 안에 특수학급 수가 붙는다.
// 티어 기준은 일반학급/일반학생만 집계하므로 괄호 안 특수학급 수치는 제외한다.
export function parseCountExcludingSpecial(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const match = value.replace(/,/g, '').trim().match(/^(\d+)(?:\((\d+)\))?$/)
  if (!match) {
    return null
  }
  return parseInt(match[1], 10)
}

// "가림초"(축약형), "가림초교", "가림초등확교"(오타) 같은 변형을 모두
// "가림초등학교" 형태로 통일해 매칭되도록 정규화한다.
export function normalizeSchoolName(name: string): string {
  const compact = name.replace(/\s+/g, '')
  const stem = compact.replace(/초(등[가-힣]교|교)$/, '초')
  if (stem.endsWith('초')) {
    return `${stem}등학교`
  }
  return compact
}

export function calculateTierFromCounts(
  studentCount: number,
  classCount: number
): 'Priority' | 'Standard' {
  return studentCount <= 240 || classCount <= 11 ? 'Priority' : 'Standard'
}

function getApiKey(): string {
  const apiKey = process.env.SCHOOLINFO_API_KEY
  if (!apiKey) {
    throw new Error('SCHOOLINFO_API_KEY 환경변수가 설정되지 않았습니다.')
  }
  return apiKey
}

function currentKstYear(): number {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear()
}

async function fetchSggRows(sggCode: string, pbanYr: number): Promise<SchoolInfoRawRow[]> {
  const params = new URLSearchParams({
    apiKey: getApiKey(),
    apiType: '62',
    pbanYr: String(pbanYr),
    schulKndCode: ELEMENTARY_SCHOOL_KND_CODE,
    sidoCode: GYEONGGI_SIDO_CODE,
    sggCode,
  })

  const response = await fetch(`${SCHOOLINFO_API_BASE}?${params.toString()}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`학교알리미 API 응답 오류 (HTTP ${response.status})`)
  }

  const json = (await response.json()) as SchoolInfoApiResponse
  if (json.resultCode !== 'success') {
    throw new Error(json.resultMsg || '학교알리미 API 호출에 실패했습니다.')
  }
  return json.list ?? []
}

// 공시연도는 연초에 아직 공시 전일 수 있으므로 당해년도 → 전년도 순으로 시도한다.
async function fetchSggRowsWithYearFallback(sggCode: string): Promise<SchoolInfoRawRow[]> {
  const year = currentKstYear()
  try {
    const rows = await fetchSggRows(sggCode, year)
    if (rows.length > 0) {
      return rows
    }
  } catch {
    // 당해년도 실패 시 전년도로 재시도
  }
  return fetchSggRows(sggCode, year - 1)
}

function toSchoolRecords(rows: SchoolInfoRawRow[], cityName: string): SchoolRecord[] {
  const records: SchoolRecord[] = []
  for (const row of rows) {
    if (!row.SCHUL_NM || row.PBAN_EXCP_YN === 'Y') {
      continue
    }
    const classCount = parseCountExcludingSpecial(row.COL_SUM)
    const studentCount = parseCountExcludingSpecial(row.COL_FGR_SUM)
    if (classCount === null || studentCount === null) {
      continue
    }
    records.push({
      schoolName: row.SCHUL_NM,
      normalizedName: normalizeSchoolName(row.SCHUL_NM),
      cityName,
      classCount,
      studentCount,
    })
  }
  return records
}

const cityCache = new Map<string, { expires: number; schools: SchoolRecord[] }>()

export async function getSchoolsForCity(cityName: string): Promise<SchoolRecord[]> {
  const sggCodes = GYEONGGI_SGG_CODES[cityName]
  if (!sggCodes) {
    throw new Error(`지원하지 않는 시/군입니다: ${cityName}`)
  }

  const cached = cityCache.get(cityName)
  if (cached && cached.expires > Date.now()) {
    return cached.schools
  }

  const rowGroups = await Promise.all(sggCodes.map((code) => fetchSggRowsWithYearFallback(code)))
  const schools = toSchoolRecords(rowGroups.flat(), cityName)
  cityCache.set(cityName, { expires: Date.now() + CACHE_TTL_MS, schools })
  return schools
}

export type SchoolLookupResult =
  | { status: 'found'; school: SchoolRecord }
  | { status: 'not_found' }
  | { status: 'multiple'; candidates: string[] }

// "여주능서초등학교"처럼 학교명 앞에 지역명을 붙여 가입한 경우를 보정하기 위해
// 시/군 이름 접두사를 떼어낸 이름 후보들을 돌려준다.
// - "시흥시화초등학교"처럼 "시흥시"를 떼면 "화초등학교", "시흥"을 떼면 "시화초등학교"로
//   갈리는 경우가 있어 두 가지를 모두 후보로 만들어 실제 학교 목록과 대조한다.
// - "경기분당초등학교", "경기광주벌원초등학교"처럼 "경기"/"경기도"가 앞에 붙은 형태도
//   지역 접두사를 뗀 뒤 같은 방식으로 시도한다.
export function stripCityPrefixCandidates(normalizedName: string, cityName: string): string[] {
  const base = cityName.replace(/(시|군)$/, '')
  const candidates: string[] = []

  const addCandidate = (value: string) => {
    if (value.endsWith('초등학교') && value.length >= 5 && !candidates.includes(value)) {
      candidates.push(value)
    }
  }

  // "경기도"/"경기" 접두사가 있으면 뗀 형태도 기준 이름으로 함께 사용한다.
  const baseNames: string[] = [normalizedName]
  for (const provincePrefix of ['경기도', '경기']) {
    if (normalizedName.startsWith(provincePrefix)) {
      baseNames.push(normalizedName.slice(provincePrefix.length))
      break
    }
  }

  for (const baseName of baseNames) {
    for (const prefix of [cityName, base]) {
      if (prefix && baseName.startsWith(prefix)) {
        addCandidate(normalizeSchoolName(baseName.slice(prefix.length)))
      }
    }
    // "경기분당초등학교"처럼 시/군 없이 "경기"만 붙은 경우
    if (baseName !== normalizedName) {
      addCandidate(baseName)
    }
  }

  return candidates
}

export function matchSchoolByName(
  schools: SchoolRecord[],
  organizationName: string
): SchoolLookupResult {
  const normalized = normalizeSchoolName(organizationName)
  let matches = schools.filter((school) => school.normalizedName === normalized)

  // 정확 매칭 실패 시 지역명 접두사 보정: 단체명 쪽("여주능서초등학교" → "능서초등학교")과
  // 공식 명칭 쪽(공식명이 지역명을 포함하는 경우) 양방향으로 시도한다.
  if (matches.length === 0) {
    matches = schools.filter((school) => {
      const orgCandidates = stripCityPrefixCandidates(normalized, school.cityName)
      if (orgCandidates.includes(school.normalizedName)) {
        return true
      }
      const schoolCandidates = stripCityPrefixCandidates(school.normalizedName, school.cityName)
      return schoolCandidates.includes(normalized)
    })
  }
  if (matches.length === 1) {
    return { status: 'found', school: matches[0] }
  }
  if (matches.length > 1) {
    return { status: 'multiple', candidates: matches.map((school) => school.schoolName) }
  }
  return { status: 'not_found' }
}

export async function lookupSchool(
  cityName: string,
  organizationName: string
): Promise<SchoolLookupResult> {
  const schools = await getSchoolsForCity(cityName)
  return matchSchoolByName(schools, organizationName)
}

// 여러 시/군의 학교 데이터를 동시 호출 수 제한을 두고 일괄 조회한다.
// 실패한 시/군은 전체 작업을 중단하지 않고 failedCities로 보고한다.
export async function getSchoolsForCities(cityNames: string[]): Promise<{
  schoolsByCity: Map<string, SchoolRecord[]>
  failedCities: string[]
}> {
  const uniqueCities = [...new Set(cityNames)].filter((city) => GYEONGGI_SGG_CODES[city])
  const schoolsByCity = new Map<string, SchoolRecord[]>()
  const failedCities: string[] = []

  for (let i = 0; i < uniqueCities.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = uniqueCities.slice(i, i + MAX_CONCURRENT_REQUESTS)
    await Promise.all(
      batch.map(async (city) => {
        try {
          schoolsByCity.set(city, await getSchoolsForCity(city))
        } catch {
          failedCities.push(city)
        }
      })
    )
  }

  return { schoolsByCity, failedCities }
}
