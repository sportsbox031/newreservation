import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isManualLogoutInProgress,
  markManualLogout,
  resetManualLogout,
} from './sessionLogoutState.ts'

test('manual logout flag resets after a successful login flow', () => {
  resetManualLogout()
  markManualLogout()

  assert.equal(isManualLogoutInProgress(), true)

  resetManualLogout()

  assert.equal(isManualLogoutInProgress(), false)
})
