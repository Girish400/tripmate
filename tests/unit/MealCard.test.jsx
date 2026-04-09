import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MealCard from '../../src/components/MealCard'

const user    = { uid: 'u1', displayName: 'Girish' }
const otherUid = 'u2'

const base = {
  mealId: 'm1',
  dish: 'Pancakes & eggs',
  slot: 'breakfast',
  day: 0,
  assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
  ingredients: [],
  createdBy: 'u1',
  lockedAt: null, lockedBy: null, lockedByName: null,
}

const lockedMeal = {
  ...base,
  lockedAt: new Date(),
  lockedBy: 'u1',
  lockedByName: 'Girish',
}

const othersMeal = { ...base, createdBy: otherUid }

describe('MealCard', () => {
  it('renders dish name', () => {
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('Pancakes & eggs')).toBeTruthy()
  })

  it('renders Everyone badge for type everyone', () => {
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('Everyone')).toBeTruthy()
  })

  it('renders family badge for type family', () => {
    const meal = { ...base, assignedTo: { type: 'family', id: 'f1', label: 'Sharma family' } }
    render(<MealCard meal={meal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('Sharma family')).toBeTruthy()
  })

  it('renders person badge for type person', () => {
    const meal = { ...base, assignedTo: { type: 'person', id: 'u1', label: 'Raj Patel' } }
    render(<MealCard meal={meal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('Raj Patel')).toBeTruthy()
  })

  it('shows ingredient count when ingredients present', () => {
    const meal = { ...base, ingredients: ['eggs', 'flour', 'milk'] }
    render(<MealCard meal={meal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('3 ingredients')).toBeTruthy()
  })

  it('hides ingredient count when ingredients empty', () => {
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByText(/ingredient/)).toBeNull()
  })

  it('calls onEdit when unlocked card is clicked', () => {
    const onEdit = vi.fn()
    render(<MealCard meal={base} user={user} onEdit={onEdit} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    expect(onEdit).toHaveBeenCalledWith(base)
  })

  it('does NOT call onEdit when locked card is clicked', () => {
    const onEdit = vi.fn()
    render(<MealCard meal={lockedMeal} user={user} onEdit={onEdit} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('shows delete button when unlocked', () => {
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-card-delete')).toBeTruthy()
  })

  it('hides delete button when locked', () => {
    render(<MealCard meal={lockedMeal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('meal-card-delete')).toBeNull()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={onDelete} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('meal-card-delete'))
    expect(onDelete).toHaveBeenCalledWith('m1')
  })

  it('shows lock button for creator', () => {
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-lock-btn')).toBeTruthy()
  })

  it('does NOT show lock button for non-creator', () => {
    render(<MealCard meal={othersMeal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('meal-lock-btn')).toBeNull()
  })

  it('calls onToggleLock with meal and isLocked when lock button clicked', () => {
    const onToggleLock = vi.fn()
    render(<MealCard meal={base} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={onToggleLock} />)
    fireEvent.click(screen.getByTestId('meal-lock-btn'))
    expect(onToggleLock).toHaveBeenCalledWith(base, false)
  })

  it('shows 🔒 icon when meal is locked', () => {
    render(<MealCard meal={lockedMeal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-lock-btn').textContent).toBe('🔒')
  })

  it('shows lock banner with locker name when locked', () => {
    render(<MealCard meal={lockedMeal} user={user} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-lock-banner')).toBeTruthy()
    expect(screen.getByText(/Girish/)).toBeTruthy()
  })
})
