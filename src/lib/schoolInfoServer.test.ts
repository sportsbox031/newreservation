import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateTierFromCounts,
  matchSchoolByName,
  normalizeSchoolName,
  parseCountExcludingSpecial,
  stripCityPrefixCandidates,
  type SchoolRecord,
} from './schoolInfoServer.ts'

test('parseCountExcludingSpecial: 괄호(특수학급) 제외, 일반학급만 집계', () => {
  assert.equal(parseCountExcludingSpecial('18(2)'), 18)
  assert.equal(parseCountExcludingSpecial('348(8)'), 348)
  assert.equal(parseCountExcludingSpecial('18'), 18)
  assert.equal(parseCountExcludingSpecial('1,024(2)'), 1024)
  assert.equal(parseCountExcludingSpecial(12), 12)
})

test('parseCountExcludingSpecial: 파싱 불가 값은 null', () => {
  assert.equal(parseCountExcludingSpecial(''), null)
  assert.equal(parseCountExcludingSpecial('비공시'), null)
  assert.equal(parseCountExcludingSpecial(null), null)
  assert.equal(parseCountExcludingSpecial(undefined), null)
  assert.equal(parseCountExcludingSpecial('(2)'), null)
  assert.equal(parseCountExcludingSpecial(-1), null)
})

test('normalizeSchoolName: 공백 제거와 축약형 보정', () => {
  assert.equal(normalizeSchoolName('가림초등학교'), '가림초등학교')
  assert.equal(normalizeSchoolName('가림 초등학교'), '가림초등학교')
  assert.equal(normalizeSchoolName('가림초'), '가림초등학교')
  assert.equal(normalizeSchoolName(' 가림초 '), '가림초등학교')
  // "초교" 축약형과 "초등확교" 같은 오타도 통일
  assert.equal(normalizeSchoolName('가림초교'), '가림초등학교')
  assert.equal(normalizeSchoolName('성남불정초등확교'), '성남불정초등학교')
  // 학교가 아닌 단체명은 그대로 유지
  assert.equal(normalizeSchoolName('행복지역아동센터'), '행복지역아동센터')
})

test('calculateTierFromCounts: 240명 이하 또는 11학급 이하 → Priority', () => {
  assert.equal(calculateTierFromCounts(240, 20), 'Priority')
  assert.equal(calculateTierFromCounts(500, 11), 'Priority')
  assert.equal(calculateTierFromCounts(240, 11), 'Priority')
  assert.equal(calculateTierFromCounts(241, 12), 'Standard')
  assert.equal(calculateTierFromCounts(356, 20), 'Standard')
})

const schools: SchoolRecord[] = [
  {
    schoolName: '가림초등학교',
    normalizedName: '가림초등학교',
    cityName: '광명시',
    classCount: 20,
    studentCount: 356,
  },
  {
    schoolName: '광명동초등학교',
    normalizedName: '광명동초등학교',
    cityName: '광명시',
    classCount: 17,
    studentCount: 347,
  },
  {
    schoolName: '중복초등학교',
    normalizedName: '중복초등학교',
    cityName: '광명시',
    classCount: 10,
    studentCount: 200,
  },
  {
    schoolName: '중복초등학교',
    normalizedName: '중복초등학교',
    cityName: '광명시',
    classCount: 30,
    studentCount: 700,
  },
]

test('matchSchoolByName: 정확 매칭과 축약형 매칭', () => {
  const exact = matchSchoolByName(schools, '가림초등학교')
  assert.equal(exact.status, 'found')
  assert.equal(exact.status === 'found' && exact.school.studentCount, 356)

  const short = matchSchoolByName(schools, '가림초')
  assert.equal(short.status, 'found')
})

test('stripCityPrefixCandidates: 시/군 접두사 제거 후보', () => {
  assert.deepEqual(stripCityPrefixCandidates('여주능서초등학교', '여주시'), ['능서초등학교'])
  // "여주" 제거 후보("시능서초등학교")는 실제 학교 목록에 없으므로 매칭에 영향 없음
  assert.deepEqual(stripCityPrefixCandidates('여주시능서초등학교', '여주시'), ['능서초등학교', '시능서초등학교'])
  assert.deepEqual(stripCityPrefixCandidates('연천은대초등학교', '연천군'), ['은대초등학교'])
  // "시흥시화초등학교": "시흥시" 제거 → "화초등학교", "시흥" 제거 → "시화초등학교" 둘 다 후보
  assert.deepEqual(stripCityPrefixCandidates('시흥시화초등학교', '시흥시'), ['화초등학교', '시화초등학교'])
  assert.deepEqual(stripCityPrefixCandidates('시흥시시화초등학교', '시흥시'), ['시화초등학교', '시시화초등학교'])
  // "경기" 접두사: 시/군 없이 붙거나 시/군 이름 앞에 붙는 경우 모두 후보 생성
  assert.deepEqual(stripCityPrefixCandidates('경기분당초등학교', '성남시'), ['분당초등학교'])
  assert.ok(stripCityPrefixCandidates('경기광주벌원초등학교', '광주시').includes('벌원초등학교'))
  // 접두사가 없거나 제거 결과가 학교명 형태가 아니면 후보 없음
  assert.deepEqual(stripCityPrefixCandidates('능서초등학교', '여주시'), [])
  assert.deepEqual(stripCityPrefixCandidates('여주초등학교', '여주시'), [])
})

test('matchSchoolByName: 오타/경기 접두사 실사례 매칭', () => {
  const cases: [SchoolRecord, string][] = [
    [
      { schoolName: '불정초등학교', normalizedName: '불정초등학교', cityName: '성남시', classCount: 20, studentCount: 400 },
      '성남불정초등확교',
    ],
    [
      { schoolName: '분당초등학교', normalizedName: '분당초등학교', cityName: '성남시', classCount: 20, studentCount: 400 },
      '경기분당초등학교',
    ],
    [
      { schoolName: '벌원초등학교', normalizedName: '벌원초등학교', cityName: '광주시', classCount: 10, studentCount: 150 },
      '경기광주벌원초등학교',
    ],
    [
      { schoolName: '봉암초등학교', normalizedName: '봉암초등학교', cityName: '양주시', classCount: 6, studentCount: 40 },
      '양주봉암초등학교',
    ],
  ]

  for (const [school, orgName] of cases) {
    const result = matchSchoolByName([school], orgName)
    assert.equal(result.status, 'found', `${orgName} 매칭 실패`)
    assert.equal(result.status === 'found' && result.school.schoolName, school.schoolName)
  }
})

test('matchSchoolByName: "시흥시화초등학교" → 시화초등학교 매칭', () => {
  const siheungSchools: SchoolRecord[] = [
    {
      schoolName: '시화초등학교',
      normalizedName: '시화초등학교',
      cityName: '시흥시',
      classCount: 25,
      studentCount: 500,
    },
    {
      schoolName: '시흥초등학교',
      normalizedName: '시흥초등학교',
      cityName: '시흥시',
      classCount: 15,
      studentCount: 300,
    },
  ]

  for (const name of ['시흥시화초등학교', '시흥시 시화초등학교', '시흥시시화초등학교', '시흥 시화초']) {
    const result = matchSchoolByName(siheungSchools, name)
    assert.equal(result.status, 'found', `${name} 매칭 실패`)
    assert.equal(result.status === 'found' && result.school.schoolName, '시화초등학교')
  }

  // 공식 명칭이 지역명으로 시작하는 "시흥초등학교"는 정확 매칭이 우선
  const exact = matchSchoolByName(siheungSchools, '시흥초등학교')
  assert.equal(exact.status, 'found')
  assert.equal(exact.status === 'found' && exact.school.schoolName, '시흥초등학교')
})

test('matchSchoolByName: 지역명 접두사가 붙은 단체명 보정 매칭', () => {
  const yeojuSchools: SchoolRecord[] = [
    {
      schoolName: '능서초등학교',
      normalizedName: '능서초등학교',
      cityName: '여주시',
      classCount: 6,
      studentCount: 100,
    },
    {
      schoolName: '여주초등학교',
      normalizedName: '여주초등학교',
      cityName: '여주시',
      classCount: 20,
      studentCount: 400,
    },
  ]

  // "여주능서초등학교", "여주 능서초등학교", "여주시 능서초" 모두 능서초등학교로 매칭
  for (const name of ['여주능서초등학교', '여주 능서초등학교', '여주시 능서초']) {
    const result = matchSchoolByName(yeojuSchools, name)
    assert.equal(result.status, 'found', `${name} 매칭 실패`)
    assert.equal(result.status === 'found' && result.school.schoolName, '능서초등학교')
  }

  // 공식 명칭 자체가 지역명으로 시작하는 학교("여주초등학교")는 정확 매칭이 우선
  const exact = matchSchoolByName(yeojuSchools, '여주초등학교')
  assert.equal(exact.status, 'found')
  assert.equal(exact.status === 'found' && exact.school.schoolName, '여주초등학교')

  // 반대 방향: 공식 명칭에 지역명이 붙어 있고 단체명에는 없는 경우
  const prefixedOfficial: SchoolRecord[] = [
    {
      schoolName: '연천왕산초등학교',
      normalizedName: '연천왕산초등학교',
      cityName: '연천군',
      classCount: 6,
      studentCount: 80,
    },
  ]
  const reverse = matchSchoolByName(prefixedOfficial, '왕산초등학교')
  assert.equal(reverse.status, 'found')
})

test('matchSchoolByName: 미발견과 중복 처리', () => {
  assert.equal(matchSchoolByName(schools, '없는초등학교').status, 'not_found')

  const duplicated = matchSchoolByName(schools, '중복초등학교')
  assert.equal(duplicated.status, 'multiple')
  assert.equal(duplicated.status === 'multiple' && duplicated.candidates.length, 2)
})
