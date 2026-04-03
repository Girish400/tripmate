import { describe, it, expect } from 'vitest'
import { computeBalances } from '../../src/utils/expenses'

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
