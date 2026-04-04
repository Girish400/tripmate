import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import {
  subscribeActivities, addActivity, updateActivity, deleteActivity,
} from '../../src/utils/itinerary'

const TRIP_ID = 'trip1'

describe('itinerary Firestore utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeActivities calls onSnapshot on the activities collection', () => {
    const cb = vi.fn()
    subscribeActivities(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('subscribeActivities sorts activities by time ascending', () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, fn) => {
      fn({
        docs: [
          { id: 'a2', data: () => ({ title: 'Dinner', time: '19:00', date: '2026-04-05', icon: '🍽️', createdBy: 'u1' }) },
          { id: 'a1', data: () => ({ title: 'Hike',   time: '09:00', date: '2026-04-05', icon: '🥾', createdBy: 'u1' }) },
        ],
      })
      return vi.fn()
    })
    const cb = vi.fn()
    subscribeActivities(TRIP_ID, cb)
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ activityId: 'a1', time: '09:00' }),
      expect.objectContaining({ activityId: 'a2', time: '19:00' }),
    ])
  })

  it('subscribeActivities maps d.id to activityId', () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, fn) => {
      fn({
        docs: [
          { id: 'doc-123', data: () => ({ title: 'Hike', time: '09:00', date: '2026-04-05' }) },
        ],
      })
      return vi.fn()
    })
    const cb = vi.fn()
    subscribeActivities(TRIP_ID, cb)
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ activityId: 'doc-123', title: 'Hike' }),
    ])
  })

  it('addActivity calls addDoc with correct fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'act1' })
    await addActivity(TRIP_ID, {
      title: 'Hike', time: '09:00', date: '2026-04-05',
      location: 'Blue Ridge', notes: '', assignedTo: null, icon: '🥾', createdBy: 'u1',
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Hike', time: '09:00', date: '2026-04-05',
        icon: '🥾', createdBy: 'u1', createdAt: expect.anything(),
      })
    )
  })

  it('updateActivity calls updateDoc', async () => {
    await updateActivity(TRIP_ID, 'act1', { title: 'Updated hike' })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { title: 'Updated hike' }
    )
  })

  it('deleteActivity calls deleteDoc on the correct document', async () => {
    await deleteActivity(TRIP_ID, 'act1')
    const callArg = deleteDoc.mock.calls[0][0]
    expect(callArg.path).toMatch(/trips\/trip1\/activities\/act1/)
  })
})
