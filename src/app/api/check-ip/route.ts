import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 실제 알리고 발송 주체인 Fly 프록시의 outbound IP를 확인
    const response = await fetch('https://sportsbox-aligo-proxy.fly.dev/check-ip', {
      cache: 'no-store'
    })
    const data = await response.json()

    return NextResponse.json({
      ip: data.outboundIP,
      message: '이 IP를 알리고에 등록하세요!',
      source: 'sportsbox-aligo-proxy'
    })
  } catch (error) {
    console.error('IP check error:', error)
    return NextResponse.json({
      error: 'IP 확인에 실패했습니다'
    }, { status: 500 })
  }
}
