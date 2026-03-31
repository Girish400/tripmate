import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { onAuthStateChanged } from 'firebase/auth'
import App from '../../src/App'

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
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Auth edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
    sessionStorage.clear()
  })

  // ── Memory leak prevention ───────────────────────────────────────────────────

  it('auth state listener cleanup prevents memory leaks', () => {
    const unsubscribe = vi.fn()
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return unsubscribe
    })
    const { unmount } = render(<App />)
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  // ── Loading screen race condition ────────────────────────────────────────────

  it('shows loading screen while auth state is being resolved', () => {
    // onAuthStateChanged never calls the callback — keeps loading: true
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})
    render(<App />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('no race condition between auth init and UI render — login page not shown during loading', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})
    render(<App />)
    // Loading screen visible, LoginPage not yet mounted
    expect(screen.queryByTestId('login-page')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  // ── Stable re-renders ────────────────────────────────────────────────────────

  it('auth state change with same user does not cause login page flash', async () => {
    let authCallback = null
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      authCallback = cb
      cb(mockUser)
      return () => {}
    })

    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    render(<App />)
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeTruthy())

    // Fire auth callback again with the same user — UI should remain stable
    await act(async () => {
      authCallback(mockUser)
    })

    // Home page should still be shown, not login page
    expect(screen.queryByTestId('login-page')).toBeNull()
    expect(screen.getByTestId('home-page')).toBeTruthy()
  })

  // ── Safari redirect flow ─────────────────────────────────────────────────────

  it('redirect result is processed on mount (Safari flow)', async () => {
    const { getRedirectResult } = await import('firebase/auth')
    const { upsertUser } = await import('../../src/utils/auth')
    const { getRedirectResult: mockGetRedirectResult } = await import('firebase/auth')

    vi.mocked(getRedirectResult).mockResolvedValue({
      user: mockUser,
      providerId: 'google.com',
      operationType: 'signIn',
    })

    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })

    render(<App />)

    // LoginPage mounts and calls getRedirectResult on mount via its own useEffect
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
    // getRedirectResult was called (by LoginPage's useEffect)
    expect(getRedirectResult).toHaveBeenCalled()
  })

  // ── Pending invite code ──────────────────────────────────────────────────────

  it('pending invite code in sessionStorage triggers redirect after login', async () => {
    sessionStorage.setItem('pendingInviteCode', 'CAMP42')

    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])

    // Mock firestore for JoinPage
    const { getTripByCode } = await import('../../src/utils/firestore')
    vi.mocked(getTripByCode).mockResolvedValue(null) // invalid code — shows error state

    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(mockUser)
      return () => {}
    })

    render(<App />)

    // AuthRedirect reads pendingInviteCode and navigates to /join/CAMP42
    await waitFor(() => {
      // After redirect, sessionStorage entry is removed
      expect(sessionStorage.getItem('pendingInviteCode')).toBeNull()
    })
  })

  // ── Unauthenticated user ─────────────────────────────────────────────────────

  it('unauthenticated user sees LoginPage after auth resolves', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
  })

  // ── onAuthStateChanged called once ───────────────────────────────────────────

  it('onAuthStateChanged is registered exactly once per App mount', () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })
    render(<App />)
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  })
})
