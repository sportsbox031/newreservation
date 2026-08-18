// 이벤트 일정(event_dates) 재조정 순수 로직.
//
// 배경: event_applications.event_date_id → event_dates(id) FK는 ON DELETE 동작이 없어(RESTRICT)
// 신청자가 참조 중인 일정 행을 삭제하려 하면 실패한다. 기존 구현은 수정 시 모든 일정을
// blanket delete 후 재삽입해서, 신청자가 한 명이라도 생기면 이벤트 수정 자체가 실패하고
// (삭제 성공/삽입 실패 시엔) 일정이 0개로 남는 위험이 있었다.
//
// 이 헬퍼는 기존/희망 일정을 event_date(달력 날짜) 기준으로 대조해 최소 변경 집합만 만든다.
// 매칭된 행은 id를 유지(→ FK 참조 보존)하고 label/sort_order만 갱신하므로, 신청자가 있어도
// 메타데이터 수정·일정 추가가 가능하다. 실제로 제거되는(참조 중일 수 있는) 일정만 삭제 대상이 된다.

export type ExistingEventDate = { id: string; event_date: string; label: string | null; sort_order: number }
export type DesiredEventDate = { event_date: string; label: string | null; sort_order: number }

export type EventDateReconciliation = {
  toInsert: DesiredEventDate[]
  toUpdate: { id: string; label: string | null; sort_order: number }[]
  toDeleteIds: string[]
}

export function reconcileEventDates(
  existing: ExistingEventDate[],
  desired: DesiredEventDate[]
): EventDateReconciliation {
  // event_date별 첫 기존 행 매핑 (일정은 서로 다른 날짜라는 전제; 중복 날짜는 첫 행만 매칭되고 나머지는 삭제 대상)
  const existingByDate = new Map<string, ExistingEventDate>()
  for (const e of existing) {
    if (!existingByDate.has(e.event_date)) existingByDate.set(e.event_date, e)
  }

  const toInsert: DesiredEventDate[] = []
  const toUpdate: { id: string; label: string | null; sort_order: number }[] = []
  const matchedIds = new Set<string>()

  for (const d of desired) {
    const match = existingByDate.get(d.event_date)
    if (!match || matchedIds.has(match.id)) {
      // 기존에 없는 날짜(또는 이미 매칭된 날짜의 중복) → 신규 삽입
      toInsert.push(d)
      continue
    }
    matchedIds.add(match.id)
    if (match.label !== d.label || match.sort_order !== d.sort_order) {
      toUpdate.push({ id: match.id, label: d.label, sort_order: d.sort_order })
    }
  }

  // 희망 집합과 매칭되지 못한 기존 행 → 삭제 대상
  const toDeleteIds = existing.filter((e) => !matchedIds.has(e.id)).map((e) => e.id)

  return { toInsert, toUpdate, toDeleteIds }
}
