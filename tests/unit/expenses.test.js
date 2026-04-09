import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot, collection, doc } from 'firebase/firestore'
import { computeBalances } from '../../src/utils/expenses'
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel, toggleExpenseLock,
} from '../../src/utils/expenses'

const famA = { familyId: 'fA', name: 'Sharma family' }
const famB = { familyId: 'fB', name: 'Johnson family' }
const famC = { familyId: 'fC', name: 'Patel family' }

describe('computeBalances', () => {
  it('returns empty array when no families', () => {
    const result = computeBalances([], [])
    expect(result).toEqual([])
  })

  it('returns zero balances when no expenses', () => {
    const result = computeBalances([], [famA, famB, famC])
    expect(result).toEqual([
      { familyId: 'fA', name: 'Sharma family', balance: 0 },
      { familyId: 'fB', name: 'Johnson family', balance: 0 },
      { familyId: 'fC', name: 'Patel family', balance: 0 },
    ])
  })

  it('splits one expense equally across 3 families', () => {
    const expenses = [{ expenseId: 'e1', amount: 120, paidByFamilyId: 'fA' }]
    const result = computeBalances(expenses, [famA, famB, famC])
    expect(result.find(r => r.familyId === 'fA').balance).toBeCloseTo(80)
    expect(result.find(r => r.familyId === 'fB').balance).toBeCloseTo(-40)
    expect(result.find(r => r.familyId === 'fC').balance).toBeCloseTo(-40)
  })

  it('handles single family — net balance is always zero', () => {
    const expenses = [{ expenseId: 'e1', amount: 100, paidByFamilyId: 'fA' }]
    const result = computeBalances(expenses, [famA])
    expect(result[0].balance).toBeCloseTo(0)
  })

  it('handles multiple expenses with mixed payers', () => {
    const expenses = [
      { expenseId: 'e1', amount: 120, paidByFamilyId: 'fA' },
      { expenseId: 'e2', amount: 60,  paidByFamilyId: 'fB' },
    ]
    const result = computeBalances(expenses, [famA, famB, famC])
    expect(result.find(r => r.familyId === 'fA').balance).toBeCloseTo(60)
    expect(result.find(r => r.familyId === 'fB').balance).toBeCloseTo(0)
    expect(result.find(r => r.familyId === 'fC').balance).toBeCloseTo(-60)
  })

  it('handles amounts that do not divide evenly', () => {
    const expenses = [{ expenseId: 'e1', amount: 100, paidByFamilyId: 'fA' }]
    const result = computeBalances(expenses, [famA, famB, famC])
    expect(result.find(r => r.familyId === 'fA').balance).toBeCloseTo(66.67, 1)
    expect(result.find(r => r.familyId === 'fB').balance).toBeCloseTo(-33.33, 1)
    expect(result.find(r => r.familyId === 'fC').balance).toBeCloseTo(-33.33, 1)
  })
})

const TRIP_ID = 'trip1'

describe('expenses Firestore utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeExpenses calls onSnapshot on the expenses collection', () => {
    const cb = vi.fn()
    subscribeExpenses(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('addExpense calls addDoc with correct fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'exp1' })
    await addExpense(TRIP_ID, {
      description: 'Groceries',
      amount: 120,
      paidByFamilyId: 'fA',
      paidByFamilyName: 'Sharma family',
      label: 'Food',
      createdBy: 'u1',
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        description: 'Groceries',
        amount: 120,
        paidByFamilyId: 'fA',
        paidByFamilyName: 'Sharma family',
        label: 'Food',
        createdBy: 'u1',
        createdAt: expect.anything(),
      })
    )
  })

  it('updateExpense calls updateDoc', async () => {
    await updateExpense(TRIP_ID, 'exp1', { description: 'Updated' })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { description: 'Updated' }
    )
  })

  it('deleteExpense calls deleteDoc', async () => {
    await deleteExpense(TRIP_ID, 'exp1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything())
  })

  it('subscribeExpenseLabels calls onSnapshot on expenseLabels collection', () => {
    const cb = vi.fn()
    subscribeExpenseLabels(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('addExpenseLabel calls addDoc with name, createdBy, createdAt', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'lbl1' })
    await addExpenseLabel(TRIP_ID, 'Food', 'u1')
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'Food', createdBy: 'u1', createdAt: expect.anything() })
    )
  })
})

describe('toggleExpenseLock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks an expense: writes lockedAt, lockedBy, lockedByName', async () => {
    await toggleExpenseLock('trip1', 'exp1', false, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedBy: 'u1', lockedByName: 'Girish' })
    )
  })

  it('unlocks an expense: writes null fields', async () => {
    await toggleExpenseLock('trip1', 'exp1', true, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { lockedAt: null, lockedBy: null, lockedByName: null }
    )
  })
})

describe('addExpense with lock fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('initialises lockedAt, lockedBy, lockedByName to null', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'exp1' })
    await addExpense('trip1', { description: 'Test', amount: 10, paidByFamilyId: 'fA', paidByFamilyName: 'Sharma', createdBy: 'u1' })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedAt: null, lockedBy: null, lockedByName: null })
    )
  })
})
