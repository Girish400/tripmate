import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signInWithPopup } from 'firebase/auth'
import LoginPage from '../../src/pages/LoginPage'
import { upsertUser } from '../../src/utils/auth'

vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
}))

// Convenience: the button's accessible name is set by aria-label
const BTN_LABEL = /Sign in with Google Gmail account/i

describe('LoginPage - Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  // ── Core Functional ──────────────────────────────────────────────────────────

  it('calls signInWithPopup on login button click', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { uid: 'u1' } })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalledOnce())
  })

  it('disables login button while authentication is in progress', async () => {
    vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}))
    render(<LoginPage />)
    const btn = screen.getByRole('button', { name: BTN_LABEL })
    fireEvent.click(btn)
    await waitFor(() => expect(btn).toBeDisabled())
  })

  it('re-enables login button after auth failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked' })
    render(<LoginPage />)
    const btn = screen.getByRole('button', { name: BTN_LABEL })
    fireEvent.click(btn)
    await waitFor(() => expect(btn).not.toBeDisabled())
  })

  it('calls upsertUser after successful sign-in', async () => {
    const mockUser = { uid: 'u1', displayName: 'Test', email: 't@g.com', photoURL: '' }
    vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(upsertUser).toHaveBeenCalledWith(mockUser))
  })

  // ── Error Handling / Negative Cases ─────────────────────────────────────────

  it('shows friendly message when user cancels popup (auth/popup-closed-by-user)', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-closed-by-user' })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/cancelled/i)
  })

  it('shows popup-blocked message (auth/popup-blocked)', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked' })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/blocked/i)
  })

  it('shows network error message (auth/network-request-failed)', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/network-request-failed' })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/network/i)
  })

  it('shows generic error for unknown auth failures', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('Something unexpected'))
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/Sign-in failed/i)
  })

  it('blocks login attempt when offline (navigator.onLine is false)', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    // LoginPage checks navigator.onLine and sets error immediately — no popup opened
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toMatch(/offline/i)
    expect(signInWithPopup).not.toHaveBeenCalled()
  })

  // ── Popup Spam / Destructive ─────────────────────────────────────────────────

  it('prevents multiple simultaneous login attempts (button disabled during auth)', async () => {
    let resolveAuth
    vi.mocked(signInWithPopup).mockReturnValue(
      new Promise(resolve => { resolveAuth = resolve })
    )
    render(<LoginPage />)
    const btn = screen.getByRole('button', { name: BTN_LABEL })
    fireEvent.click(btn)
    await waitFor(() => expect(btn).toBeDisabled())
    // Second click while disabled — signInWithPopup should still be called only once
    fireEvent.click(btn)
    expect(signInWithPopup).toHaveBeenCalledTimes(1)
    // Clean up the pending promise
    resolveAuth({ user: { uid: 'u1' } })
  })

  // ── UI States ────────────────────────────────────────────────────────────────

  it('shows loading indicator during authentication', async () => {
    vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}))
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: BTN_LABEL }))
    await waitFor(() => expect(screen.getByText('Signing in…')).toBeTruthy())
  })

  it('hides error message initially', () => {
    render(<LoginPage />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clears previous error on new login attempt', async () => {
    // First attempt — fail with popup closed
    vi.mocked(signInWithPopup).mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' })
    render(<LoginPage />)
    const btn = screen.getByRole('button', { name: BTN_LABEL })
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())

    // Second attempt — never resolves; error should clear immediately on click
    vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}))
    fireEvent.click(btn)
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
