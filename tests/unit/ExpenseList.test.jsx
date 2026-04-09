import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExpenseList from '../../src/components/ExpenseList'

const user = { uid: 'u1', displayName: 'Girish' }

const expenses = [
  {
    expenseId: 'e1',
    description: 'Groceries at Walmart',
    amount: 124.5,
    paidByFamilyName: 'Sharma family',
    label: 'Food',
    createdBy: 'u1',
    lockedAt: null, lockedBy: null, lockedByName: null,
  },
  {
    expenseId: 'e2',
    description: 'Campsite booking',
    amount: 250,
    paidByFamilyName: 'Johnson family',
    label: null,
    createdBy: 'u2',
    lockedAt: null, lockedBy: null, lockedByName: null,
  },
]

const lockedExpense = {
  ...expenses[0],
  lockedAt: new Date(),
  lockedBy: 'u1',
  lockedByName: 'Girish',
}

describe('ExpenseList', () => {
  it('renders empty state when no expenses', () => {
    render(<ExpenseList expenses={[]} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('expense-list-empty')).toBeTruthy()
    expect(screen.getByText(/No expenses yet/)).toBeTruthy()
  })

  it('renders a row for each expense', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('expense-row-e1')).toBeTruthy()
    expect(screen.getByTestId('expense-row-e2')).toBeTruthy()
  })

  it('shows description, paidByFamilyName, and formatted amount', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('Groceries at Walmart')).toBeTruthy()
    expect(screen.getByText('Sharma family')).toBeTruthy()
    expect(screen.getByText('$124.50')).toBeTruthy()
  })

  it('shows label pill when label is present', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('label-pill-e1')).toBeTruthy()
    expect(screen.getByText('Food')).toBeTruthy()
  })

  it('hides label pill when label is null', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('label-pill-e2')).toBeNull()
  })

  it('shows edit and delete buttons for own unlocked expense', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-e1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-e1')).toBeTruthy()
  })

  it('hides edit and delete buttons for other users expenses', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-e2')).toBeNull()
    expect(screen.queryByTestId('delete-btn-e2')).toBeNull()
  })

  it('shows lock button for own expense', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-btn-e1')).toBeTruthy()
  })

  it('does not show lock button for other user expense', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('lock-btn-e2')).toBeNull()
  })

  it('hides edit and delete when expense is locked', () => {
    render(<ExpenseList expenses={[lockedExpense]} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-e1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-e1')).toBeNull()
  })

  it('shows lock banner with locker name when locked', () => {
    render(<ExpenseList expenses={[lockedExpense]} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-banner-e1')).toBeTruthy()
    expect(screen.getByText(/Girish/)).toBeTruthy()
  })

  it('calls onToggleLock with expense and isLocked when lock button clicked', () => {
    const onToggleLock = vi.fn()
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={onToggleLock} />)
    fireEvent.click(screen.getByTestId('lock-btn-e1'))
    expect(onToggleLock).toHaveBeenCalledWith(expenses[0], false)
  })

  it('calls onEdit with the expense when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={onEdit} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-e1'))
    expect(onEdit).toHaveBeenCalledWith(expenses[0])
  })

  it('calls onDelete with expenseId when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={onDelete} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('delete-btn-e1'))
    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})
