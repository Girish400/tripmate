import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../src/pages/HomePage'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(),
  getTripStatus: vi.fn(),
  getTripEmoji: vi.fn(() => '⛺'),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('HomePage', () => {
  it('shows empty state when user has no trips', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/No trips yet/i)).toBeTruthy()
    })
  })

  it('shows card grid when user has 2+ trips', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    const trips = [
      { tripId: 't1', name: 'Trip A', destination: 'USA', tripType: 'Tent Camping',
        startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ABC123' },
      { tripId: 't2', name: 'Trip B', destination: 'Canada', tripType: 'RV',
        startDate: new Date('2026-07-01'), endDate: new Date('2026-07-07'),
        memberIds: ['u1'], hostId: 'u2', inviteCode: 'DEF456' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(trips)
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Trip A')).toBeTruthy()
      expect(screen.getByText('Trip B')).toBeTruthy()
    })
  })

  it('shows collapsed completed section by default', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    const completed = [
      { tripId: 't3', name: 'Old Trip', destination: 'Beach', tripType: 'Beach',
        startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ZZZ999' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(completed)
    vi.mocked(getTripStatus).mockReturnValue('completed')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/Completed Trips/)).toBeTruthy()
      expect(screen.queryByText('Old Trip')).toBeNull()
    })
  })

  it('expands completed section on click', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    const completed = [
      { tripId: 't3', name: 'Old Trip', destination: 'Beach', tripType: 'Beach',
        startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ZZZ999' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(completed)
    vi.mocked(getTripStatus).mockReturnValue('completed')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/Completed Trips/))
    fireEvent.click(screen.getByText(/Completed Trips/))
    await waitFor(() => expect(screen.getByText('Old Trip')).toBeTruthy())
  })
})
