export const RESERVATION_MIN_START_TIME = '10:00'
export const RESERVATION_MAX_START_TIME = '16:30'
export const RESERVATION_TIME_STEP_MINUTES = 10
export const RESERVATION_SLOT_DURATION_MINUTES = 40

function padTimeSegment(value: number) {
  return String(value).padStart(2, '0')
}

export function buildReservationStartTimeOptions() {
  const [minHours, minMinutes] = RESERVATION_MIN_START_TIME.split(':').map(Number)
  const [maxHours, maxMinutes] = RESERVATION_MAX_START_TIME.split(':').map(Number)
  const minTotalMinutes = minHours * 60 + minMinutes
  const maxTotalMinutes = maxHours * 60 + maxMinutes

  const options: string[] = []
  for (
    let totalMinutes = minTotalMinutes;
    totalMinutes <= maxTotalMinutes;
    totalMinutes += RESERVATION_TIME_STEP_MINUTES
  ) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    options.push(`${padTimeSegment(hours)}:${padTimeSegment(minutes)}`)
  }

  return options
}

export function isReservationStartTimeAllowed(startTime: string) {
  return startTime >= RESERVATION_MIN_START_TIME && startTime <= RESERVATION_MAX_START_TIME
}
