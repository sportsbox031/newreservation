let isManualLogout = false

export function markManualLogout(): void {
  isManualLogout = true
}

export function resetManualLogout(): void {
  isManualLogout = false
}

export function isManualLogoutInProgress(): boolean {
  return isManualLogout
}
