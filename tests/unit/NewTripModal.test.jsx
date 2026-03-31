import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewTripModal from '../../src/components/NewTripModal'

vi.mock('../../src/utils/firestore', () => ({
  createTrip: vi.fn(() => Promise.resolve('trip-123')),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('NewTripModal', () => {
  it('renders all form fields', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Trip Name/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Destination/i)).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Family Name/i)).toBeTruthy()
  })

  it('submit button is disabled when fields are empty', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByText(/Create Trip/)).toBeDisabled()
  })

  it('shows custom type input when Custom is selected', async () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Custom')
    expect(screen.getByPlaceholderText(/Enter custom trip type/i)).toBeTruthy()
  })

  it('blocks past start dates via min attribute', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    const today = new Date().toISOString().split('T')[0]
    const startInput = screen.getByLabelText(/Start Date/i)
    expect(startInput.min).toBe(today)
  })

  it('calls createTrip and onCreated on valid submit', async () => {
    const onCreated = vi.fn()
    const { createTrip } = await import('../../src/utils/firestore')
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={onCreated} />)

    await userEvent.type(screen.getByPlaceholderText(/Trip Name/i), 'Rocky Trip')
    await userEvent.type(screen.getByPlaceholderText(/Destination/i), 'Colorado')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Tent Camping')
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2026-06-15')
    await userEvent.type(screen.getByLabelText(/End Date/i), '2026-06-22')
    await userEvent.type(screen.getByPlaceholderText(/Family Name/i), 'Kumar Family')

    fireEvent.click(screen.getByText(/Create Trip/))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('trip-123'))
  })
})
