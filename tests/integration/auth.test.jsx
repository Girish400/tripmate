import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { onAuthStateChanged } from 'firebase/auth'
import App from '../../src/App'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(),
  getTripStatus: vi.fn(),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(),
  isSafari: vi.fn(() => false),
}))
vi.mock('../../src/utils/firestore', () => ({
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
  getTripMembers: vi.fn(() => Promise.resolve([])),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Auth + routing integration', () => {
  beforeEach(() => { vi.clearAllMocks(); window.location.hash = '' })

  it('unauthenticated user sees LoginPage', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(null); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
  })

  it('user with 0 trips routes to /home (empty state)', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeTruthy())
  })

  it('user with 1 active trip routes directly to /trip/:id', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([{
      tripId: 't1', name: 'Trip A', destination: 'USA', tripType: 'RV',
      startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
      memberIds: ['u1'], hostId: 'u1', inviteCode: 'ABC123',
    }])
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    // Mock Firestore getDoc for TripPage
    const { getDoc } = await import('firebase/firestore')
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, id: 't1', data: () => ({ name: 'Trip A', destination: 'USA', tripType: 'RV', startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'), memberIds: ['u1'], hostId: 'u1' }) })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('trip-page')).toBeTruthy())
  })

  it('user with 2+ trips routes to /home (card grid)', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([
      { tripId: 't1', name: 'A', destination: 'USA', tripType: 'RV', startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'), memberIds: ['u1'], hostId: 'u1', inviteCode: 'A1' },
      { tripId: 't2', name: 'B', destination: 'CA',  tripType: 'Beach', startDate: new Date('2026-07-01'), endDate: new Date('2026-07-07'), memberIds: ['u1'], hostId: 'u2', inviteCode: 'B2' },
    ])
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeTruthy())
  })
})
