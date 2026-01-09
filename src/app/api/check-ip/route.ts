import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // ipify를 사용해서 Vercel 서버의 실제 아웃바운드 IP 확인
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()

    return NextResponse.json({
      ip: data.ip,
      message: '이 IP를 알리고에 등록하세요!'
    })
  } catch (error) {
    console.error('IP check error:', error)
    return NextResponse.json({
      error: 'IP 확인에 실패했습니다'
    }, { status: 500 })
  }
}
