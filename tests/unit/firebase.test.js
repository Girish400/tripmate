import { describe, it, expect } from 'vitest'

describe('firebase module', () => {
  it('exports auth, db, googleProvider, and persistenceReady', async () => {
    const mod = await import('../../src/firebase')
    expect(mod.auth).toBeDefined()
    expect(mod.db).toBeDefined()
    expect(mod.googleProvider).toBeDefined()
    expect(mod.persistenceReady).toBeDefined()
  })
})
