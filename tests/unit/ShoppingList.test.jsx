import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShoppingList from '../../src/components/ShoppingList'

const items = [
  { itemId: 'si1', name: 'eggs x12',  mealLabel: 'Day 1 Breakfast · Pancakes', checkedBy: null, checkedAt: null },
  { itemId: 'si2', name: 'flour',     mealLabel: 'Day 1 Breakfast · Pancakes', checkedBy: 'u1', checkedAt: new Date() },
  { itemId: 'si3', name: 'chicken',   mealLabel: 'Day 1 Dinner · BBQ night',   checkedBy: null, checkedAt: null },
]

describe('ShoppingList', () => {
  it('renders all ingredient names', () => {
    render(<ShoppingList items={items} onToggle={vi.fn()} />)
    expect(screen.getByText('eggs x12')).toBeTruthy()
    expect(screen.getByText('flour')).toBeTruthy()
    expect(screen.getByText('chicken')).toBeTruthy()
  })

  it('renders source meal label for each item', () => {
    render(<ShoppingList items={items} onToggle={vi.fn()} />)
    expect(screen.getAllByText('Day 1 Breakfast · Pancakes').length).toBe(2)
  })

  it('shows progress counter X / Y bought', () => {
    render(<ShoppingList items={items} onToggle={vi.fn()} />)
    expect(screen.getByText('1 / 3 bought')).toBeTruthy()
  })

  it('calls onToggle with itemId and new checked state when clicked', () => {
    const onToggle = vi.fn()
    render(<ShoppingList items={items} onToggle={onToggle} />)
    fireEvent.click(screen.getByTestId('shop-item-si1'))
    expect(onToggle).toHaveBeenCalledWith('si1', true)
  })

  it('unchecks a checked item when clicked', () => {
    const onToggle = vi.fn()
    render(<ShoppingList items={items} onToggle={onToggle} />)
    fireEvent.click(screen.getByTestId('shop-item-si2'))
    expect(onToggle).toHaveBeenCalledWith('si2', false)
  })

  it('shows empty state when items is empty', () => {
    render(<ShoppingList items={[]} onToggle={vi.fn()} />)
    expect(screen.getByText(/No ingredients added yet/)).toBeTruthy()
  })
})
