import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../src/pages/HomePage'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/firestore', () => ({
  createTrip: vi.fn(() => Promise.resolve('new-trip-id')),
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Trip creation flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens NewTripModal on + Create Trip click (empty state)', async () => {
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/No trips yet/i))
    fireEvent.click(screen.getByText('+ Create Trip'))
    await waitFor(() => expect(screen.getByText('New Trip 🚀')).toBeTruthy())
  })

  it('calls createTrip with correct data', async () => {
    const { createTrip } = await import('../../src/utils/firestore')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/No trips yet/i))
    fireEvent.click(screen.getByText('+ Create Trip'))
    await waitFor(() => screen.getByText('New Trip 🚀'))

    await userEvent.type(screen.getByPlaceholderText(/Trip Name/i), 'Rocky Trip')
    await userEvent.type(screen.getByPlaceholderText(/Destination/i), 'Colorado')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Tent Camping')
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2026-06-15')
    await userEvent.type(screen.getByLabelText(/End Date/i), '2026-06-22')
    await userEvent.type(screen.getByPlaceholderText(/Family Name/i), 'Kumar Family')

    fireEvent.click(screen.getByText(/Create Trip 🚀/))
    await waitFor(() => expect(createTrip).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Rocky Trip', destination: 'Colorado', tripType: 'Tent Camping',
    })))
  })
})
