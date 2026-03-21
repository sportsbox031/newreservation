export type AdminCalendarDayStatus = 'available' | 'limited' | 'full' | 'blocked' | 'closed'

type ReservationStatusMap = Record<string, {
  current: number
  max: number
  isFull: boolean
  isOpen: boolean
}>

type BlockedDate = {
  date: string
  start_time: string | null
  end_time: string | null
}

export function getAdminCalendarDayStatus(
  date: Date,
  today: Date,
  reservationStatus: ReservationStatusMap,
  blockedDates: BlockedDate[]
): AdminCalendarDayStatus {
  if (date < today) {
    return 'blocked'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`

  const fullDayBlocked = blockedDates.some(
    (blockedDate) => blockedDate.date === dateString && !blockedDate.start_time && !blockedDate.end_time
  )
  if (fullDayBlocked) {
    return 'blocked'
  }

  const status = reservationStatus[dateString]
  if (!status) {
    return 'available'
  }

  if (status.isFull) {
    return 'full'
  }

  if (status.current > 0 && status.current < status.max) {
    return 'limited'
  }

  if (!status.isOpen) {
    return 'closed'
  }

  return 'available'
}
