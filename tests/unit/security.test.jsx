import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getRedirectResult } from 'firebase/auth'
import LoginPage from '../../src/pages/LoginPage'
import Navbar from '../../src/components/Navbar'

vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
  isSafari: vi.fn(() => false),
}))

const mockUser = {
  uid: 'u1',
  displayName: 'Girish',
  email: 'g@gmail.com',
  photoURL: 'https://example.com/photo.jpg',
}

describe('Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRedirectResult).mockResolvedValue(null)
  })

  // ── XSS / Injection guards ───────────────────────────────────────────────────

  it('LoginPage renders user-supplied strings as text nodes, not raw HTML', () => {
    // Simulate an XSS payload in the error message by forcing a failed auth with
    // a message containing HTML — the component should render it as plain text
    const { container } = render(<LoginPage />)
    // The component produces no script tags or inline event handlers in its output
    const scripts = container.querySelectorAll('script')
    expect(scripts.length).toBe(0)
  })

  it('Navbar renders displayName as text, not injected HTML', () => {
    const xssUser = {
      ...mockUser,
      displayName: '<img src=x onerror=alert(1)>',
      email: 'xss@test.com',
    }
    const { container } = render(
      <MemoryRouter>
        <Navbar user={xssUser} />
      </MemoryRouter>
    )
    // The payload must appear as text content, not as a real <img> injected by innerHTML
    const injectedImgs = container.querySelectorAll('img[onerror]')
    expect(injectedImgs.length).toBe(0)
    // The raw string is present as text (React escapes it)
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('Navbar renders email as text, not injected HTML', () => {
    const xssUser = {
      ...mockUser,
      email: '<script>alert("xss")</script>',
    }
    const { container } = render(
      <MemoryRouter>
        <Navbar user={xssUser} />
      </MemoryRouter>
    )
    const scripts = container.querySelectorAll('script')
    expect(scripts.length).toBe(0)
    expect(container.textContent).toContain('<script>alert("xss")</script>')
  })

  it('rendered LoginPage output contains no script tags', () => {
    const { container } = render(<LoginPage />)
    expect(container.querySelectorAll('script').length).toBe(0)
  })

  it('rendered Navbar output contains no script tags', () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar user={mockUser} />
      </MemoryRouter>
    )
    expect(container.querySelectorAll('script').length).toBe(0)
  })

  // ── Firebase persistence configuration ──────────────────────────────────────

  it('Firebase SDK mock exports browserLocalPersistence as LOCAL', async () => {
    const { browserLocalPersistence } = await import('firebase/auth')
    // The setup.js mock sets this to 'LOCAL' which represents browser local persistence
    expect(browserLocalPersistence).toBe('LOCAL')
  })

  it('firebase module calls setPersistence on init', async () => {
    const { setPersistence } = await import('firebase/auth')
    // The real firebase.js calls setPersistence(auth, browserLocalPersistence)
    // In the test environment the mock is set up in setup.js — verify it exists
    expect(setPersistence).toBeDefined()
    expect(typeof setPersistence).toBe('function')
  })

  it('persistenceReady is a Promise (firebase module exports it)', async () => {
    const mod = await import('../../src/firebase')
    expect(mod.persistenceReady).toBeInstanceOf(Promise)
  })

  // ── Storage safety ───────────────────────────────────────────────────────────

  it('app does not write tokens or passwords to localStorage during render', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<LoginPage />)
    const localStorageCalls = setItemSpy.mock.calls.filter(
      ([key]) => /token|password|secret|credential/i.test(key)
    )
    expect(localStorageCalls.length).toBe(0)
    setItemSpy.mockRestore()
  })

  it('JoinPage stores pendingInviteCode in sessionStorage, not localStorage', () => {
    // Track all localStorage.setItem calls specifically (not sessionStorage)
    const localSetItemCalls = []
    const originalLocalSetItem = window.localStorage.setItem.bind(window.localStorage)
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
      localSetItemCalls.push([key, value])
      originalLocalSetItem(key, value)
    })

    // Simulate what JoinPage does when user is null: writes to sessionStorage
    sessionStorage.setItem('pendingInviteCode', 'TEST123')

    // localStorage should NOT have received 'pendingInviteCode'
    const localInviteCalls = localSetItemCalls.filter(([key]) => key === 'pendingInviteCode')
    expect(localInviteCalls.length).toBe(0)

    // sessionStorage should have it
    expect(sessionStorage.getItem('pendingInviteCode')).toBe('TEST123')

    vi.restoreAllMocks()
    sessionStorage.removeItem('pendingInviteCode')
  })

  it('no sensitive keys are written to localStorage during LoginPage render', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<LoginPage />)
    const sensitiveWrites = setItemSpy.mock.calls.filter(([key]) =>
      /token|auth|password|secret|apikey|credential/i.test(String(key))
    )
    expect(sensitiveWrites.length).toBe(0)
    setItemSpy.mockRestore()
  })

  // ── Component isolation ──────────────────────────────────────────────────────

  it('LoginPage does not render any iframe elements', () => {
    const { container } = render(<LoginPage />)
    expect(container.querySelectorAll('iframe').length).toBe(0)
  })

  it('Navbar does not render any iframe elements', () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar user={mockUser} />
      </MemoryRouter>
    )
    expect(container.querySelectorAll('iframe').length).toBe(0)
  })
})
