import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MealCard from '../../src/components/MealCard'

const base = {
  mealId: 'm1',
  dish: 'Pancakes & eggs',
  slot: 'breakfast',
  day: 0,
  assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
  ingredients: [],
}

describe('MealCard', () => {
  it('renders dish name', () => {
    render(<MealCard meal={base} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Pancakes & eggs')).toBeTruthy()
  })

  it('renders Everyone badge for type everyone', () => {
    render(<MealCard meal={base} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Everyone')).toBeTruthy()
  })

  it('renders family badge for type family', () => {
    const meal = { ...base, assignedTo: { type: 'family', id: 'f1', label: 'Sharma family' } }
    render(<MealCard meal={meal} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Sharma family')).toBeTruthy()
  })

  it('renders person badge for type person', () => {
    const meal = { ...base, assignedTo: { type: 'person', id: 'u1', label: 'Raj Patel' } }
    render(<MealCard meal={meal} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Raj Patel')).toBeTruthy()
  })

  it('shows ingredient count when ingredients present', () => {
    const meal = { ...base, ingredients: ['eggs', 'flour', 'milk'] }
    render(<MealCard meal={meal} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('3 ingredients')).toBeTruthy()
  })

  it('hides ingredient count when ingredients empty', () => {
    render(<MealCard meal={base} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText(/ingredient/)).toBeNull()
  })

  it('calls onEdit when card is clicked', () => {
    const onEdit = vi.fn()
    render(<MealCard meal={base} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    expect(onEdit).toHaveBeenCalledWith(base)
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<MealCard meal={base} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('meal-card-delete'))
    expect(onDelete).toHaveBeenCalledWith('m1')
  })
})
