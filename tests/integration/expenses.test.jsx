import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ExpensesTab from '../../src/components/ExpensesTab'
import * as expensesUtils from '../../src/utils/expenses'
import * as firestoreUtils from '../../src/utils/firestore'

const mockTrip = {
  tripId: 'trip1',
  tripType: 'Tent Camping',
  currency: 'USD',
}
const mockUser = { uid: 'u1', displayName: 'Test User' }

const mockFamilies = [
  { familyId: 'fA', name: 'Sharma family' },
  { familyId: 'fB', name: 'Johnson family' },
]

const mockExpenses = [
  { expenseId: 'e1', description: 'Groceries', amount: 120, paidByFamilyId: 'fA', paidByFamilyName: 'Sharma family', label: 'Food', createdBy: 'u1' },
  { expenseId: 'e2', description: 'Campsite', amount: 60, paidByFamilyId: 'fB', paidByFamilyName: 'Johnson family', label: null, createdBy: 'u2' },
]

const mockLabels = [
  { labelId: 'l1', name: 'Food' },
]

describe('ExpensesTab integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(expensesUtils, 'subscribeExpenseLabels').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue([])
    vi.spyOn(firestoreUtils, 'getTripMembers').mockResolvedValue([])
    vi.spyOn(expensesUtils, 'addExpense').mockResolvedValue({ id: 'new-exp' })
    vi.spyOn(expensesUtils, 'updateExpense').mockResolvedValue()
    vi.spyOn(expensesUtils, 'deleteExpense').mockResolvedValue()
    vi.spyOn(expensesUtils, 'addExpenseLabel').mockResolvedValue()
  })

  it('renders expenses-tab', () => {
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('expenses-tab')).toBeTruthy()
  })

  it('shows empty state when no expenses', () => {
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByText(/No expenses yet/)).toBeTruthy()
  })

  it('renders balance chips from mocked data', async () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    expect(screen.getByTestId('balance-chip-fA')).toBeTruthy()
    expect(screen.getByTestId('balance-chip-fB')).toBeTruthy()
  })

  it('renders expense rows from mocked data', () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('expense-row-e1')).toBeTruthy()
    expect(screen.getByTestId('expense-row-e2')).toBeTruthy()
  })

  it('opens add form when "+ Add Expense" is clicked', () => {
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('add-expense-btn'))
    expect(screen.getByTestId('expense-edit-form')).toBeTruthy()
  })

  it('submitting add form calls addExpense with correct args', async () => {
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    vi.spyOn(firestoreUtils, 'getTripMembers').mockResolvedValue([{ uid: 'u1', familyId: 'fA' }])
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-expense-btn'))
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Gas' } })
    fireEvent.change(screen.getByTestId('form-amount'),      { target: { value: '60' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(expensesUtils.addExpense).toHaveBeenCalledWith('trip1', expect.objectContaining({
      description: 'Gas',
      amount: 60,
      paidByFamilyId: 'fA',
      createdBy: 'u1',
    }))
  })

  it('edit and delete buttons visible only for own expenses', () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('edit-btn-e1')).toBeTruthy()
    expect(screen.queryByTestId('edit-btn-e2')).toBeNull()
  })

  it('clicking edit opens form pre-filled with expense data', () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('edit-btn-e1'))
    expect(screen.getByTestId('form-description').value).toBe('Groceries')
    expect(screen.getByTestId('form-amount').value).toBe('120')
  })

  it('saving edit form calls updateExpense', async () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('edit-btn-e1'))
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Groceries Updated' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(expensesUtils.updateExpense).toHaveBeenCalledWith('trip1', 'e1', expect.objectContaining({
      description: 'Groceries Updated',
    }))
  })

  it('clicking delete on own expense calls deleteExpense', async () => {
    vi.spyOn(expensesUtils, 'subscribeExpenses').mockImplementation((_tripId, cb) => {
      cb(mockExpenses)
      return vi.fn()
    })
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => { fireEvent.click(screen.getByTestId('delete-btn-e1')) })
    expect(expensesUtils.deleteExpense).toHaveBeenCalledWith('trip1', 'e1')
  })

  it('adding a new label calls addExpenseLabel', async () => {
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    vi.spyOn(expensesUtils, 'subscribeExpenseLabels').mockImplementation((_tripId, cb) => {
      cb(mockLabels)
      return vi.fn()
    })
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-expense-btn'))
    fireEvent.change(screen.getByTestId('form-label'), { target: { value: '__create__' } })
    fireEvent.change(screen.getByTestId('new-label-input'), { target: { value: 'Activities' } })
    await act(async () => { fireEvent.click(screen.getByTestId('new-label-add-btn')) })
    expect(expensesUtils.addExpenseLabel).toHaveBeenCalledWith('trip1', 'Activities', 'u1')
  })
})
