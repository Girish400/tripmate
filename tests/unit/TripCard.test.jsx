import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripCard from '../../src/components/TripCard'
import * as tripsUtils from '../../src/utils/trips'

vi.mock('../../src/utils/trips', () => ({
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))

const baseTrip = {
  tripId: 'trip1', name: 'Rocky Mountains',
  destination: 'Colorado, USA', tripType: 'Tent Camping',
  startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
  memberIds: ['u1', 'u2', 'u3'], hostId: 'u1',
  inviteCode: 'RTX924',
}

describe('TripCard', () => {
  it('renders trip name, destination, type, member count', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('Rocky Mountains')).toBeTruthy()
    expect(screen.getByText(/Colorado/)).toBeTruthy()
    expect(screen.getByText(/Tent Camping/)).toBeTruthy()
    expect(screen.getByText(/3 members/)).toBeTruthy()
  })

  it('shows HOST badge for trip creator', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('HOST')).toBeTruthy()
  })

  it('shows MEMBER badge for non-host', () => {
    render(<TripCard trip={baseTrip} currentUserId="u2" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('MEMBER')).toBeTruthy()
  })

  it('shows Invite button for active/upcoming trips', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText(/Invite/)).toBeTruthy()
  })

  it('hides Invite button and shows View Summary for completed trips', () => {
    vi.mocked(tripsUtils.getTripStatus).mockReturnValueOnce('completed')
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.queryByText(/Invite/)).toBeNull()
    expect(screen.getByText('View Summary')).toBeTruthy()
  })

  it('calls onOpen when Open Trip is clicked', () => {
    const onOpen = vi.fn()
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={onOpen} onInvite={vi.fn()} />)
    fireEvent.click(screen.getByText('Open Trip'))
    expect(onOpen).toHaveBeenCalledWith('trip1')
  })
})
