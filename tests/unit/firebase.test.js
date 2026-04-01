import { describe, it, expect } from 'vitest'

describe('firebase module', () => {
  it('exports auth, db, and googleProvider', async () => {
    const mod = await import('../../src/firebase')
    expect(mod.auth).toBeDefined()
    expect(mod.db).toBeDefined()
    expect(mod.googleProvider).toBeDefined()
  })
})
