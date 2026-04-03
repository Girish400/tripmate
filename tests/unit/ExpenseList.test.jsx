import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExpenseList from '../../src/components/ExpenseList'

const user = { uid: 'u1' }

const expenses = [
  {
    expenseId: 'e1',
    description: 'Groceries at Walmart',
    amount: 124.5,
    paidByFamilyName: 'Sharma family',
    label: 'Food',
    createdBy: 'u1',
  },
  {
    expenseId: 'e2',
    description: 'Campsite booking',
    amount: 250,
    paidByFamilyName: 'Johnson family',
    label: null,
    createdBy: 'u2',
  },
]

describe('ExpenseList', () => {
  it('renders empty state when no expenses', () => {
    render(<ExpenseList expenses={[]} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('expense-list-empty')).toBeTruthy()
    expect(screen.getByText(/No expenses yet/)).toBeTruthy()
  })

  it('renders a row for each expense', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('expense-row-e1')).toBeTruthy()
    expect(screen.getByTestId('expense-row-e2')).toBeTruthy()
  })

  it('shows description, paidByFamilyName, and formatted amount', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Groceries at Walmart')).toBeTruthy()
    expect(screen.getByText('Sharma family')).toBeTruthy()
    expect(screen.getByText('$124.50')).toBeTruthy()
  })

  it('shows label pill when label is present', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('label-pill-e1')).toBeTruthy()
    expect(screen.getByText('Food')).toBeTruthy()
  })

  it('hides label pill when label is null', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByTestId('label-pill-e2')).toBeNull()
  })

  it('shows edit and delete buttons only for own expenses', () => {
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-e1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-e1')).toBeTruthy()
    expect(screen.queryByTestId('edit-btn-e2')).toBeNull()
    expect(screen.queryByTestId('delete-btn-e2')).toBeNull()
  })

  it('calls onEdit with the expense when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-e1'))
    expect(onEdit).toHaveBeenCalledWith(expenses[0])
  })

  it('calls onDelete with expenseId when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ExpenseList expenses={expenses} user={user} currency="USD" onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('delete-btn-e1'))
    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})
