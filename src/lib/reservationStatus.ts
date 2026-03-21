export type ReservationStatusMap = Record<string, {
  current: number
  max: number
  isFull: boolean
  isOpen: boolean
}>

export function applyReservationStatusDelta(
  previous: ReservationStatusMap,
  dateString: string,
  delta: number
): ReservationStatusMap {
  const current = previous[dateString]
  if (!current) {
    return previous
  }

  const nextCurrent = Math.max(0, current.current + delta)

  return {
    ...previous,
    [dateString]: {
      ...current,
      current: nextCurrent,
      isFull: current.max > 0 ? nextCurrent >= current.max : true,
    },
  }
}
