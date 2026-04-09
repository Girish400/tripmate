import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc } from 'firebase/firestore'
import { addMeal, toggleMealLock } from '../../src/utils/meals'

const TRIP_ID = 'trip1'

describe('addMeal with lock fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores createdBy and null lock fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'm1' })
    await addMeal(TRIP_ID, {
      dish: 'Pasta', slot: 'dinner', day: 0,
      assignedTo: { type: 'person', id: 'u1', label: 'Girish' },
      createdBy: 'u1',
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dish: 'Pasta', createdBy: 'u1',
        lockedAt: null, lockedBy: null, lockedByName: null,
      })
    )
  })
})

describe('toggleMealLock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks a meal: writes lockedAt, lockedBy, lockedByName', async () => {
    await toggleMealLock(TRIP_ID, 'm1', false, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedBy: 'u1', lockedByName: 'Girish' })
    )
  })

  it('unlocks a meal: writes null fields', async () => {
    await toggleMealLock(TRIP_ID, 'm1', true, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { lockedAt: null, lockedBy: null, lockedByName: null }
    )
  })
})
