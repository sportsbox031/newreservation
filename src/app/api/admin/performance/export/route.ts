import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getAllPerformanceRecords } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

const PROGRAM_LABEL: Record<string, string> = {
  sports_class: '스포츠교실',
  sports_event: '스포츠이벤트',
  experience_zone: '스포츠체험존',
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getAllPerformanceRecords(auth.user.role, filters)
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error ?? { message: '데이터 없음' } }, { status: 400 })
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('실적')
    ws.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '단체명', key: 'organization_name', width: 24 },
      { header: '시/군', key: 'city_name', width: 12 },
      { header: '지역', key: 'region', width: 8 },
      { header: '프로그램', key: 'program', width: 14 },
      { header: '학년', key: 'grade', width: 12 },
      { header: '총인원', key: 'participant_count', width: 10 },
      { header: '메모', key: 'memo', width: 30 },
    ]
    for (const r of result.data) {
      ws.addRow({
        date: r.date,
        organization_name: r.organization_name,
        city_name: r.city_name ?? '',
        region: r.region_code === 'south' ? '남부' : r.region_code === 'north' ? '북부' : '',
        program: PROGRAM_LABEL[r.program_type] ?? r.program_type,
        grade: r.grade ?? '',
        participant_count: r.participant_count,
        memo: r.memo ?? '',
      })
    }
    ws.getRow(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `performance_${filters.year ?? 'all'}.xlsx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('실적 내보내기 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 내보내기 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
