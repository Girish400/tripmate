import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinPage from '../../src/pages/JoinPage'

vi.mock('../../src/utils/firestore', () => ({
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/utils/trips', () => ({
  getTripEmoji: vi.fn(() => '⛺'),
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
}))

const mockUser = { uid: 'u2', displayName: 'Jane', email: 'j@gmail.com', photoURL: '' }

const mockTrip = {
  tripId: 't1', name: 'Rocky Mountains', destination: 'Colorado, USA',
  tripType: 'Tent Camping',
  startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
  memberIds: ['u1'], hostId: 'u1', inviteCode: 'RTX924',
}

function renderJoin(code = 'RTX924', user = mockUser) {
  return render(
    <MemoryRouter initialEntries={[`/join/${code}`]}>
      <Routes>
        <Route path="/join/:inviteCode" element={<JoinPage user={user} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('JoinPage', () => {
  it('shows login prompt when user is null', () => {
    renderJoin('RTX924', null)
    expect(screen.getByText(/Sign in to join/i)).toBeTruthy()
  })

  it('shows trip preview after loading', async () => {
    const { getTripByCode } = await import('../../src/utils/firestore')
    vi.mocked(getTripByCode).mockResolvedValue(mockTrip)
    renderJoin()
    await waitFor(() => expect(screen.getByText('Rocky Mountains')).toBeTruthy())
    expect(screen.getByText(/Colorado/)).toBeTruthy()
  })

  it('shows error for invalid invite code', async () => {
    const { getTripByCode } = await import('../../src/utils/firestore')
    vi.mocked(getTripByCode).mockResolvedValue(null)
    renderJoin('BADCODE')
    await waitFor(() => expect(screen.getByText(/Invalid invite code/i)).toBeTruthy())
  })
})
