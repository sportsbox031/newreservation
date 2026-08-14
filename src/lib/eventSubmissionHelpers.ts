export function canSubmit(status: string): boolean {
  return status !== 'cancelled'
}

export function isValidSelectionStatus(status: string): boolean {
  return status === 'applied' || status === 'selected' || status === 'rejected'
}
