import { describe, it, expect } from 'vitest'
import { computeProgress } from '../../src/components/ChecklistProgress'

const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]

describe('computeProgress', () => {
  it('returns 0% when nothing checked', () => {
    const items = [{ mode: 'per-family', checks: {}, sharedCheck: null }]
    const result = computeProgress(items, families)
    expect(result.overall).toBe(0)
    expect(result.perFamily[0].percent).toBe(0)
    expect(result.perFamily[1].percent).toBe(0)
  })

  it('excludes NA items — noItems true when all NA', () => {
    const items = [{ mode: 'na', checks: {}, sharedCheck: null }]
    const result = computeProgress(items, families)
    expect(result.noItems).toBe(true)
    expect(result.overall).toBe(0)
    expect(result.total).toBe(0)
  })

  it('counts shared item as 1 box regardless of family count', () => {
    const items = [{
      mode: 'shared', checks: {},
      sharedCheck: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null },
    }]
    const result = computeProgress(items, families)
    expect(result.total).toBe(1)
    expect(result.checked).toBe(1)
    expect(result.overall).toBe(100)
  })

  it('counts per-family item as N boxes (one per family)', () => {
    const items = [{
      mode: 'per-family',
      checks: { fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null } },
      sharedCheck: null,
    }]
    const result = computeProgress(items, families)
    expect(result.total).toBe(2)
    expect(result.checked).toBe(1)
    expect(result.overall).toBe(50)
  })

  it('per-family bars reflect each family independently', () => {
    const items = [{
      mode: 'per-family',
      checks: {
        fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null },
      },
      sharedCheck: null,
    }]
    const result = computeProgress(items, families)
    expect(result.perFamily[0].percent).toBe(100)
    expect(result.perFamily[1].percent).toBe(0)
  })

  it('mixed shared + per-family items computed correctly', () => {
    const items = [
      { mode: 'per-family', checks: { fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null } }, sharedCheck: null },
      { mode: 'shared', checks: {}, sharedCheck: null },
    ]
    const result = computeProgress(items, families)
    // total = 2 (per-family fA + fB) + 1 (shared) = 3... wait:
    // per-family item: fA checked=1, fB=0, total=2
    // shared item: not checked, total=1
    // overall total=3, checked=1
    expect(result.total).toBe(3)
    expect(result.checked).toBe(1)
  })
})
