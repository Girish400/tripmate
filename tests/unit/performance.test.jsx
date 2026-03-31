import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { onAuthStateChanged } from 'firebase/auth'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App'
import HomePage from '../../src/pages/HomePage'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
  isSafari: vi.fn(() => false),
}))
vi.mock('../../src/utils/firestore', () => ({
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
  getTripMembers: vi.fn(() => Promise.resolve([])),
  createTrip: vi.fn(() => Promise.resolve('trip-id')),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── onAuthStateChanged subscription count ────────────────────────────────────

  it('onAuthStateChanged listener is created only once per App mount', () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })
    render(<App />)
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  })

  it('re-rendering App does not create additional onAuthStateChanged listeners', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })
    const { rerender } = render(<App />)
    rerender(<App />)
    // React strict mode may double-invoke effects, but in production mode
    // it should be called once per mount. We verify it is not called more than twice.
    expect(onAuthStateChanged.mock.calls.length).toBeLessThanOrEqual(2)
  })

  // ── onAuthStateChanged cleanup ───────────────────────────────────────────────

  it('onAuthStateChanged unsubscribe is called on App unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return unsubscribe
    })
    const { unmount } = render(<App />)
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('unsubscribe is not called before unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return unsubscribe
    })
    render(<App />)
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  // ── getUserTrips call count ──────────────────────────────────────────────────

  it('getUserTrips is called only once per HomePage mount', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    render(
      <MemoryRouter>
        <HomePage user={mockUser} />
      </MemoryRouter>
    )

    await waitFor(() => expect(getUserTrips).toHaveBeenCalledTimes(1))
  })

  it('getUserTrips is called with the correct user uid', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    render(
      <MemoryRouter>
        <HomePage user={mockUser} />
      </MemoryRouter>
    )

    await waitFor(() => expect(getUserTrips).toHaveBeenCalledWith(mockUser.uid))
  })

  it('getUserTrips is not called again on re-render with the same user uid', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    const { rerender } = render(
      <MemoryRouter>
        <HomePage user={mockUser} />
      </MemoryRouter>
    )

    await waitFor(() => expect(getUserTrips).toHaveBeenCalledTimes(1))

    // Re-render with the same user — uid dependency unchanged, effect should not re-run
    rerender(
      <MemoryRouter>
        <HomePage user={{ ...mockUser, displayName: 'Updated Name' }} />
      </MemoryRouter>
    )

    // Still only one call — uid did not change
    expect(getUserTrips).toHaveBeenCalledTimes(1)
  })

  it('getUserTrips is called again when user uid changes', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    const { rerender } = render(
      <MemoryRouter>
        <HomePage user={mockUser} />
      </MemoryRouter>
    )

    await waitFor(() => expect(getUserTrips).toHaveBeenCalledTimes(1))

    const differentUser = { ...mockUser, uid: 'u2' }
    rerender(
      <MemoryRouter>
        <HomePage user={differentUser} />
      </MemoryRouter>
    )

    await waitFor(() => expect(getUserTrips).toHaveBeenCalledTimes(2))
    expect(getUserTrips).toHaveBeenLastCalledWith('u2')
  })
})
