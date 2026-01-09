import { NextRequest, NextResponse } from 'next/server'

// 수동 테스트용 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    // Cron job을 수동으로 트리거
    const response = await fetch(`${request.nextUrl.origin}/api/cron/daily-notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'User-Agent': 'manual-test'
      }
    })

    const data = await response.json()

    return NextResponse.json({
      message: '수동 테스트 완료',
      cronResponse: data,
      status: response.status
    })

  } catch (error) {
    console.error('수동 테스트 오류:', error)
    return NextResponse.json({
      success: false,
      error: '테스트 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
