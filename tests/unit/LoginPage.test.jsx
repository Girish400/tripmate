import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signInWithPopup } from 'firebase/auth'
import LoginPage from '../../src/pages/LoginPage'

vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
  isSafari: vi.fn(() => false),
}))

describe('LoginPage', () => {
  it('renders app name and login button', () => {
    render(<LoginPage />)
    expect(screen.getByText('TripMate')).toBeTruthy()
    expect(screen.getByText('Login with Gmail')).toBeTruthy()
    expect(screen.getByText(/Gmail accounts only/)).toBeTruthy()
  })

  it('calls signInWithPopup when Login with Gmail is clicked (non-Safari)', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { uid: 'u1' } })
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Login with Gmail'))
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalled())
  })

  it('shows error message on sign-in failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('popup blocked'))
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Login with Gmail'))
    await waitFor(() => expect(screen.getByText(/Sign-in failed/i)).toBeTruthy())
  })
})
