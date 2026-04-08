import { describe, it, expect } from 'vitest'

describe('firebase module', () => {
  it('exports auth, db, and googleProvider', async () => {
    const mod = await import('../../src/firebase')
    expect(mod.auth).toBeDefined()
    expect(mod.db).toBeDefined()
    expect(mod.googleProvider).toBeDefined()
  })

  // Section 2 — Integration: Verify Google provider is correctly initialized
  // The global mock stubs out the firebase module, so we verify configuration
  // by reading the source to ensure setCustomParameters is called with the
  // correct 'select_account' prompt (forces Google account picker every time).
  it('firebase.js source declares setCustomParameters with prompt:select_account', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.resolve('src/firebase.js'),
      'utf-8'
    )
    expect(src).toContain('setCustomParameters')
    expect(src).toContain('select_account')
  })

  it('firebase.js source uses GoogleAuthProvider for the Google sign-in provider', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(path.resolve('src/firebase.js'), 'utf-8')
    expect(src).toContain('GoogleAuthProvider')
  })
})
