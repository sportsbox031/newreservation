import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { GYEONGGI_SGG_CODES, calculateTierFromCounts, lookupSchool } from '@/lib/schoolInfoServer'
import { getErrorMessage } from '@/lib/requestUtils'

// 회원가입 화면에서 학교알리미 학생수/학급수 자동 기입에 사용하는 공개 조회 엔드포인트.
// 서버 캐시(12시간) 덕분에 같은 시/군 반복 조회는 외부 API를 다시 호출하지 않는다.
const lookupSchema = z.object({
  city: z.string().min(1).refine((value) => Boolean(GYEONGGI_SGG_CODES[value]), {
    message: '지원하지 않는 시/군입니다.',
  }),
  name: z.string().trim().min(2).max(50),
})

export async function GET(request: NextRequest) {
  try {
    const parsed = lookupSchema.safeParse({
      city: request.nextUrl.searchParams.get('city') ?? '',
      name: request.nextUrl.searchParams.get('name') ?? '',
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: '시/군과 학교명을 확인해주세요.' } },
        { status: 400 }
      )
    }

    const result = await lookupSchool(parsed.data.city, parsed.data.name)
    if (result.status === 'found') {
      return NextResponse.json({
        data: {
          status: 'found',
          schoolName: result.school.schoolName,
          studentCount: result.school.studentCount,
          classCount: result.school.classCount,
          tier: calculateTierFromCounts(result.school.studentCount, result.school.classCount),
        },
      })
    }

    return NextResponse.json({ data: { status: result.status } })
  } catch (error) {
    console.error('학교알리미 조회 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '학교 정보 조회 중 오류가 발생했습니다.') } },
      { status: 502 }
    )
  }
}
