import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityCard from '../../src/components/ActivityCard'

const mockUser = { uid: 'u1' }

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
  createdBy: 'u1',
}

const mockMeal = {
  mealId: 'm1',
  dish: 'Pancakes',
  slot: 'breakfast',
  assignedTo: { type: 'everyone', label: 'Everyone' },
}

describe('ActivityCard — activity variant', () => {
  it('renders with data-testid activity-card-{activityId}', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
  })

  it('shows icon, title, and formatted time', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('🥾')).toBeTruthy()
    expect(screen.getByText('Hike to waterfall')).toBeTruthy()
    expect(screen.getByText(/9:00 AM/)).toBeTruthy()
  })

  it('shows location when present', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Blue Ridge Trail/)).toBeTruthy()
  })

  it('shows edit and delete buttons for own activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-a1')).toBeTruthy()
  })

  it('hides edit and delete buttons for another user\'s activity', () => {
    const otherActivity = { ...mockActivity, createdBy: 'u2' }
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(onEdit).toHaveBeenCalledWith(mockActivity)
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('delete-btn-a1'))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })
})

describe('ActivityCard — meal variant', () => {
  it('renders with data-testid meal-card-itinerary-{mealId}', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('shows slot name and dish', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Breakfast/)).toBeTruthy()
    expect(screen.getByText(/Pancakes/)).toBeTruthy()
  })

  it('shows "from Meals tab" label', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/from Meals tab/)).toBeTruthy()
  })

  it('has no edit or delete buttons', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('✏️')).toBeNull()
    expect(screen.queryByText('🗑')).toBeNull()
  })
})
