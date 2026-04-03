import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ExpenseEditForm from '../../src/components/ExpenseEditForm'

const families = [
  { familyId: 'fA', name: 'Sharma family' },
  { familyId: 'fB', name: 'Johnson family' },
]
const labels = [
  { labelId: 'l1', name: 'Food' },
  { labelId: 'l2', name: 'Transport' },
]
const user = { uid: 'u1' }

const defaultProps = {
  expense: null,
  families,
  labels,
  user,
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
  onAddLabel: vi.fn(),
}

describe('ExpenseEditForm', () => {
  it('renders the form', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    expect(screen.getByTestId('expense-edit-form')).toBeTruthy()
  })

  it('shows Add button in add mode', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    expect(screen.getByTestId('form-save').textContent).toBe('Add expense')
  })

  it('shows Save and Delete buttons in edit mode', () => {
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 50, paidByFamilyId: 'fA', label: 'Food', createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} />)
    expect(screen.getByTestId('form-save').textContent).toBe('Save')
    expect(screen.getByTestId('form-delete')).toBeTruthy()
  })

  it('pre-fills fields in edit mode', () => {
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 124.5, paidByFamilyId: 'fA', label: 'Food', createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} />)
    expect(screen.getByTestId('form-description').value).toBe('Groceries')
    expect(screen.getByTestId('form-amount').value).toBe('124.5')
    expect(screen.getByTestId('form-paid-by').value).toBe('fA')
  })

  it('does not call onSave when description is empty', async () => {
    const onSave = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('form-amount'), { target: { value: '50' } })
    fireEvent.change(screen.getByTestId('form-paid-by'), { target: { value: 'fA' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when amount is zero or negative', async () => {
    const onSave = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByTestId('form-amount'), { target: { value: '-10' } })
    fireEvent.change(screen.getByTestId('form-paid-by'), { target: { value: 'fA' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with correct data when form is valid', async () => {
    const onSave = vi.fn().mockResolvedValue()
    const onClose = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Groceries' } })
    fireEvent.change(screen.getByTestId('form-amount'),      { target: { value: '120' } })
    fireEvent.change(screen.getByTestId('form-paid-by'),     { target: { value: 'fA' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Groceries',
      amount: 120,
      paidByFamilyId: 'fA',
      paidByFamilyName: 'Sharma family',
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onDelete with expenseId when delete is clicked', async () => {
    const onDelete = vi.fn()
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 50, paidByFamilyId: 'fA', label: null, createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} onDelete={onDelete} />)
    await act(async () => { fireEvent.click(screen.getByTestId('form-delete')) })
    expect(onDelete).toHaveBeenCalledWith('e1')
  })

  it('shows new label input when "Create new label" is selected', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    fireEvent.change(screen.getByTestId('form-label'), { target: { value: '__create__' } })
    expect(screen.getByTestId('new-label-input')).toBeTruthy()
  })

  it('calls onAddLabel and selects the label when "Add" is clicked', async () => {
    const onAddLabel = vi.fn().mockResolvedValue()
    render(<ExpenseEditForm {...defaultProps} onAddLabel={onAddLabel} />)
    fireEvent.change(screen.getByTestId('form-label'), { target: { value: '__create__' } })
    fireEvent.change(screen.getByTestId('new-label-input'), { target: { value: 'Activities' } })
    await act(async () => { fireEvent.click(screen.getByTestId('new-label-add-btn')) })
    expect(onAddLabel).toHaveBeenCalledWith('Activities')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(onClose).toHaveBeenCalled()
  })
})
