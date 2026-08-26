import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getSurveyContacts } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getSurveyContacts(auth.user.role, filters)
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error ?? { message: '데이터 없음' } }, { status: 400 })
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('만족도조사')
    ws.columns = [
      { header: '연락처', key: 'phone', width: 18 },
      { header: '단체명', key: 'organization_name', width: 28 },
    ]
    for (const c of result.data) {
      ws.addRow({ phone: c.phone, organization_name: c.organization_name })
    }
    ws.getRow(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `survey_contacts_${filters.year ?? 'all'}.xlsx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('만족도조사 명단 내보내기 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '만족도조사 명단 내보내기 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
