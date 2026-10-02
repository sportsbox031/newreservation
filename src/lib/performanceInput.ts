import type { PerformanceProgram } from './performanceTypes.ts'

// 수기 실적 입력(스포츠교실/이벤트/체험존 공통). 교실/이벤트는 반드시 회원가입된
// 단체(user_id)여야 하고, 체험존은 미가입 단체도 허용한다.
export interface ManualRecordInput {
  date: string
  organization_name: string
  program_type: PerformanceProgram
  user_id: string | null
  phone: string | null
  region_id: number | null
  city_id: number | null
  grade: string | null
  participant_count: number
  memo: string | null
}

export function validateManualRecordInput(input: ManualRecordInput): { message: string } | null {
  if (!input.date || !input.organization_name) {
    return { message: '날짜와 단체명은 필수입니다.' }
  }
  if (input.program_type === 'sports_class' || input.program_type === 'sports_event') {
    if (!input.user_id) {
      return { message: '스포츠교실·스포츠이벤트는 회원가입된 단체만 선택할 수 있습니다.' }
    }
  }
  return null
}
