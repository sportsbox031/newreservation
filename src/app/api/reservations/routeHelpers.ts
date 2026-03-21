import { isReservationTimeoutError } from '@/lib/reservationError'

export function isMissingAtomicReservationFunctionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error ? error.code : undefined
  if (code === 'PGRST202') {
    return true
  }

  const message = 'message' in error ? error.message : undefined
  return typeof message === 'string' && message.includes('create_reservation_atomic')
}

export function shouldFallbackAfterRpcFailure(error: unknown): boolean {
  if (isReservationTimeoutError(error)) {
    return false
  }

  return isMissingAtomicReservationFunctionError(error)
}

export function getTierIdFromName(tier: string | null | undefined): 1 | 2 {
  return tier === 'Priority' ? 1 : 2
}

export function getTierReservationWindowKey(date: string): string {
  return date.slice(0, 7)
}
