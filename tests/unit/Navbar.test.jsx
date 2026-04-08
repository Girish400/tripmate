import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import Navbar from '../../src/components/Navbar'

const mockUser = {
  uid: 'u1', displayName: 'Girish Kumar',
  email: 'girish@gmail.com', photoURL: 'https://photo.url/img.jpg',
}

function renderNavbar(props = {}) {
  return render(
    <MemoryRouter initialEntries={[props.path || '/home']}>
      <Routes>
        <Route path="*" element={<Navbar user={mockUser} {...props} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  it('shows display name and email', () => {
    renderNavbar()
    expect(screen.getByText('Girish Kumar')).toBeTruthy()
    expect(screen.getByText('girish@gmail.com')).toBeTruthy()
  })

  it('shows Gmail photo', () => {
    renderNavbar()
    const img = screen.getByAltText('Girish Kumar')
    expect(img.src).toContain('photo.url')
  })

  it('shows fallback initial avatar when photo is null', () => {
    render(
      <MemoryRouter><Navbar user={{ ...mockUser, photoURL: null }} /></MemoryRouter>
    )
    expect(screen.getByText('G')).toBeTruthy()
  })

  it('calls signOut on Sign Out click', async () => {
    vi.mocked(signOut).mockResolvedValue()
    renderNavbar()
    fireEvent.click(screen.getByText('Sign Out'))
    expect(signOut).toHaveBeenCalled()
  })

  // Section 1 — Core: Verify logout clears session and redirects to login page
  it('navigates to / (login page) after signOut resolves', async () => {
    vi.mocked(signOut).mockResolvedValue()
    const { container } = render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Navbar user={mockUser} />} />
          <Route path="/" element={<div data-testid="login-page-sentinel" />} />
        </Routes>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('Sign Out'))
    // After signOut resolves, navigate('/') renders the login route
    await waitFor(() =>
      expect(container.querySelector('[data-testid="login-page-sentinel"]')).toBeTruthy()
    )
  })

  it('shows My Trips back button when showBack is true', () => {
    renderNavbar({ showBack: true, tripName: 'Rocky Mountains' })
    expect(screen.getByText('← My Trips')).toBeTruthy()
    expect(screen.getByText('Rocky Mountains')).toBeTruthy()
  })

  it('hides My Trips back button by default', () => {
    renderNavbar()
    expect(screen.queryByText('← My Trips')).toBeNull()
  })
})
