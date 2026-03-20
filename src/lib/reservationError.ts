export function isReservationTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('시간이 초과되었습니다')
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' && message.includes('시간이 초과되었습니다')
  }

  return false
}
