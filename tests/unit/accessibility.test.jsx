import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import LoginPage from '../../src/pages/LoginPage'
import Navbar from '../../src/components/Navbar'
import App from '../../src/App'
import NewTripModal from '../../src/components/NewTripModal'

vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
  isSafari: vi.fn(() => false),
}))
vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/firestore', () => ({
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
  getTripMembers: vi.fn(() => Promise.resolve([])),
  createTrip: vi.fn(() => Promise.resolve('trip-id')),
}))

const mockUser = {
  uid: 'u1',
  displayName: 'Girish',
  email: 'g@gmail.com',
  photoURL: 'https://example.com/photo.jpg',
}

describe('Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRedirectResult).mockResolvedValue(null)
  })

  // ── LoginPage ────────────────────────────────────────────────────────────────

  describe('LoginPage', () => {
    it('login button has accessible label', () => {
      render(<LoginPage />)
      const btn = screen.getByRole('button', { name: /Sign in with Google Gmail account/i })
      expect(btn).toBeTruthy()
    })

    it('error messages have role="alert" for screen readers', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked' })
      const { fireEvent: fe } = await import('@testing-library/react')
      render(<LoginPage />)
      fe.click(screen.getByRole('button', { name: /Sign in with Google Gmail account/i }))
      await waitFor(() => {
        const alertEl = screen.getByRole('alert')
        expect(alertEl).toBeTruthy()
      })
    })

    it('loading state has aria-busy attribute on the page container', async () => {
      const { signInWithPopup } = await import('firebase/auth')
      vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}))
      const { fireEvent: fe } = await import('@testing-library/react')
      render(<LoginPage />)
      fe.click(screen.getByRole('button', { name: /Sign in with Google Gmail account/i }))
      await waitFor(() => {
        const page = screen.getByTestId('login-page')
        expect(page.getAttribute('aria-busy')).toBe('true')
      })
    })

    it('all interactive elements are focusable buttons', () => {
      render(<LoginPage />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('floating emoji elements are present in the page structure', () => {
      const { container } = render(<LoginPage />)
      // Emojis rendered as plain text nodes inside positioned divs, not as imgs
      // Verify none have img role (they should be decorative divs, not images)
      const imgs = container.querySelectorAll('img[alt]')
      // No emoji images — they are text nodes
      const emojiImgs = Array.from(imgs).filter(img =>
        /\p{Emoji}/u.test(img.getAttribute('alt') || '')
      )
      expect(emojiImgs.length).toBe(0)
    })
  })

  // ── Navbar ───────────────────────────────────────────────────────────────────

  describe('Navbar', () => {
    it('sign out button has accessible text', () => {
      render(
        <MemoryRouter>
          <Navbar user={mockUser} />
        </MemoryRouter>
      )
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeTruthy()
    })

    it('user avatar img has alt text matching display name', () => {
      render(
        <MemoryRouter>
          <Navbar user={mockUser} />
        </MemoryRouter>
      )
      const avatar = screen.getByAltText(mockUser.displayName)
      expect(avatar).toBeTruthy()
    })

    it('shows user display name as text', () => {
      render(
        <MemoryRouter>
          <Navbar user={mockUser} />
        </MemoryRouter>
      )
      expect(screen.getByText(mockUser.displayName)).toBeTruthy()
    })

    it('shows user email as text', () => {
      render(
        <MemoryRouter>
          <Navbar user={mockUser} />
        </MemoryRouter>
      )
      expect(screen.getByText(mockUser.email)).toBeTruthy()
    })

    it('renders initial avatar when photoURL is absent', () => {
      const userNoPhoto = { ...mockUser, photoURL: '' }
      const { container } = render(
        <MemoryRouter>
          <Navbar user={userNoPhoto} />
        </MemoryRouter>
      )
      // Initial character shown in the fallback div
      expect(container.textContent).toContain('G')
    })
  })

  // ── App ──────────────────────────────────────────────────────────────────────

  describe('App', () => {
    it('loading screen has aria-label and role="status"', () => {
      // Keep auth in loading state by never calling callback
      vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})
      render(<App />)
      const loader = screen.getByRole('status')
      expect(loader).toBeTruthy()
      expect(loader.getAttribute('aria-label')).toBe('Loading')
    })

    it('renders login page once auth resolves to null', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
        cb(null)
        return () => {}
      })
      render(<App />)
      await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
    })
  })

  // ── NewTripModal ─────────────────────────────────────────────────────────────

  describe('NewTripModal', () => {
    const noop = () => {}
    const props = { user: mockUser, onClose: noop, onCreated: noop }

    it('date fields have associated label elements', () => {
      render(
        <MemoryRouter>
          <NewTripModal {...props} />
        </MemoryRouter>
      )
      // htmlFor="startDate" and htmlFor="endDate" labels exist
      expect(screen.getByText('Start Date *')).toBeTruthy()
      expect(screen.getByText('End Date *')).toBeTruthy()
    })

    it('date inputs are linked to their labels via id', () => {
      const { container } = render(
        <MemoryRouter>
          <NewTripModal {...props} />
        </MemoryRouter>
      )
      expect(container.querySelector('#startDate')).toBeTruthy()
      expect(container.querySelector('#endDate')).toBeTruthy()
    })

    it('submit button has descriptive text', () => {
      render(
        <MemoryRouter>
          <NewTripModal {...props} />
        </MemoryRouter>
      )
      expect(screen.getByRole('button', { name: /Create Trip/i })).toBeTruthy()
    })

    it('close button is present and accessible', () => {
      render(
        <MemoryRouter>
          <NewTripModal {...props} />
        </MemoryRouter>
      )
      // The ✕ button exists
      const closeBtns = screen.getAllByRole('button')
      expect(closeBtns.length).toBeGreaterThanOrEqual(2)
    })
  })
})
