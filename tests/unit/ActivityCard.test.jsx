import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityCard from '../../src/components/ActivityCard'

const mockUser = { uid: 'u1', displayName: 'Girish' }

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
  createdBy: 'u1',
  lockedAt: null, lockedBy: null, lockedByName: null,
}

const lockedActivity = {
  ...mockActivity,
  lockedAt: new Date(),
  lockedBy: 'u1',
  lockedByName: 'Girish',
}

const otherActivity = { ...mockActivity, createdBy: 'u2' }

const mockMeal = {
  mealId: 'm1',
  dish: 'Pancakes',
  slot: 'breakfast',
  assignedTo: { type: 'everyone', label: 'Everyone' },
}

describe('ActivityCard — activity variant', () => {
  it('renders with data-testid activity-card-{activityId}', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
  })

  it('shows icon, title, and formatted time', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('🥾')).toBeTruthy()
    expect(screen.getByText('Hike to waterfall')).toBeTruthy()
    expect(screen.getByText(/9:00 AM/)).toBeTruthy()
  })

  it('shows location when present', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/Blue Ridge Trail/)).toBeTruthy()
  })

  it('shows edit and delete buttons for own unlocked activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-a1')).toBeTruthy()
  })

  it('hides edit and delete buttons for another user\'s activity', () => {
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('shows lock button for own activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-btn-a1')).toBeTruthy()
  })

  it('does NOT show lock button for other user activity', () => {
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('lock-btn-a1')).toBeNull()
  })

  it('hides edit and delete when activity is locked', () => {
    render(<ActivityCard item={lockedActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('shows lock banner with locker name when locked', () => {
    render(<ActivityCard item={lockedActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-banner-a1')).toBeTruthy()
    expect(screen.getByText(/Girish/)).toBeTruthy()
  })

  it('calls onToggleLock with item and isLocked when lock button clicked', () => {
    const onToggleLock = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={onToggleLock} />)
    fireEvent.click(screen.getByTestId('lock-btn-a1'))
    expect(onToggleLock).toHaveBeenCalledWith(mockActivity, false)
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={onEdit} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(onEdit).toHaveBeenCalledWith(mockActivity)
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={onDelete} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('delete-btn-a1'))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })
})

describe('ActivityCard — meal variant', () => {
  it('renders with data-testid meal-card-itinerary-{mealId}', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('shows slot name and dish', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/Breakfast/)).toBeTruthy()
    expect(screen.getByText(/Pancakes/)).toBeTruthy()
  })

  it('shows "from Meals tab" label', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/from Meals tab/)).toBeTruthy()
  })

  it('has no edit, delete, or lock buttons', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByText('✏️')).toBeNull()
    expect(screen.queryByText('🗑')).toBeNull()
    expect(screen.queryByTestId('lock-btn-m1')).toBeNull()
  })
})
