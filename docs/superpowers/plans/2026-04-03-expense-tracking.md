# Expense Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Splitwise-style expense tracker where any trip member can log expenses, split equally across families, and view live balance summaries.

**Architecture:** Expenses and expense labels live in Firestore subcollections under each trip. Balances are computed client-side from the full expense list via a pure `computeBalances` function. Five components mirror the Meals sub-project: a tab orchestrator, a balance summary bar, an expense list, and a form popover.

**Tech Stack:** React 18, Firestore (onSnapshot), Vitest, React Testing Library, inline styles + CSS variables.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/utils/expenses.js` | Firestore utils + `computeBalances` pure fn |
| Create | `src/components/BalanceSummary.jsx` | Family balance chips row |
| Create | `src/components/ExpenseList.jsx` | Chronological expense rows |
| Create | `src/components/ExpenseEditForm.jsx` | Add/edit popover |
| Create | `src/components/ExpensesTab.jsx` | Orchestrator, mounts subscriptions |
| Create | `tests/unit/expenses.test.js` | Unit tests for utils |
| Create | `tests/integration/expenses.test.jsx` | Integration tests for ExpensesTab |
| Modify | `src/pages/TripPage.jsx` | Unlock Expenses tab, mount ExpensesTab |

---

## Task 1: `computeBalances` pure function

**Files:**
- Create: `src/utils/expenses.js`
- Create: `tests/unit/expenses.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/expenses.test.js`:

```js
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
    // A pays $120, B pays $60 — 3 families, each owes $60 total
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
    // $100 / 3 families = $33.33 each
    const expenses = [{ expenseId: 'e1', amount: 100, paidByFamilyId: 'fA' }]
    const result = computeBalances(expenses, [famA, famB, famC])
    // A paid $100, owes $33.33 → net ≈ +$66.67
    expect(result.find(r => r.familyId === 'fA').balance).toBeCloseTo(66.67, 1)
    expect(result.find(r => r.familyId === 'fB').balance).toBeCloseTo(-33.33, 1)
    expect(result.find(r => r.familyId === 'fC').balance).toBeCloseTo(-33.33, 1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/unit/expenses.test.js
```

Expected: FAIL — `computeBalances` not found.

- [ ] **Step 3: Implement `computeBalances` in `src/utils/expenses.js`**

```js
export function computeBalances(expenses, families) {
  if (families.length === 0) return []
  const numFamilies = families.length
  const balanceMap = Object.fromEntries(families.map(f => [f.familyId, 0]))
  for (const expense of expenses) {
    const share = expense.amount / numFamilies
    if (expense.paidByFamilyId in balanceMap) {
      balanceMap[expense.paidByFamilyId] += expense.amount
    }
    for (const f of families) {
      balanceMap[f.familyId] -= share
    }
  }
  return families.map(f => ({
    familyId: f.familyId,
    name: f.name,
    balance: balanceMap[f.familyId],
  }))
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run tests/unit/expenses.test.js
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/expenses.js tests/unit/expenses.test.js
git commit -m "feat: add computeBalances pure function with unit tests"
```

---

## Task 2: Firestore utilities

**Files:**
- Modify: `src/utils/expenses.js`
- Modify: `tests/unit/expenses.test.js`

- [ ] **Step 1: Add Firestore util tests to `tests/unit/expenses.test.js`**

Append to the existing test file (keep the `computeBalances` tests, add below):

```js
import { vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot, collection, doc } from 'firebase/firestore'
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel,
} from '../../src/utils/expenses'

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
      expect.objectContaining({ name: 'Food', createdBy: 'u1' })
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/unit/expenses.test.js
```

Expected: FAIL — functions not exported yet.

- [ ] **Step 3: Add Firestore utils to `src/utils/expenses.js`**

Prepend the imports and add the util functions (keep `computeBalances` at the bottom):

```js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeExpenses(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenses')
  return onSnapshot(ref, snap => {
    const expenses = snap.docs.map(d => ({ expenseId: d.id, ...d.data() }))
    expenses.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    callback(expenses)
  })
}

export async function addExpense(tripId, data) {
  return addDoc(collection(db, 'trips', tripId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateExpense(tripId, expenseId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), changes)
}

export async function deleteExpense(tripId, expenseId) {
  return deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId))
}

export function subscribeExpenseLabels(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenseLabels')
  return onSnapshot(ref, snap => {
    const labels = snap.docs.map(d => ({ labelId: d.id, ...d.data() }))
    labels.sort((a, b) => a.name.localeCompare(b.name))
    callback(labels)
  })
}

export async function addExpenseLabel(tripId, name, uid) {
  return addDoc(collection(db, 'trips', tripId, 'expenseLabels'), {
    name,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

// computeBalances remains here (from Task 1)
```

The full `src/utils/expenses.js` after both tasks:

```js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeExpenses(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenses')
  return onSnapshot(ref, snap => {
    const expenses = snap.docs.map(d => ({ expenseId: d.id, ...d.data() }))
    expenses.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    callback(expenses)
  })
}

export async function addExpense(tripId, data) {
  return addDoc(collection(db, 'trips', tripId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateExpense(tripId, expenseId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), changes)
}

export async function deleteExpense(tripId, expenseId) {
  return deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId))
}

export function subscribeExpenseLabels(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenseLabels')
  return onSnapshot(ref, snap => {
    const labels = snap.docs.map(d => ({ labelId: d.id, ...d.data() }))
    labels.sort((a, b) => a.name.localeCompare(b.name))
    callback(labels)
  })
}

export async function addExpenseLabel(tripId, name, uid) {
  return addDoc(collection(db, 'trips', tripId, 'expenseLabels'), {
    name,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

export function computeBalances(expenses, families) {
  if (families.length === 0) return []
  const numFamilies = families.length
  const balanceMap = Object.fromEntries(families.map(f => [f.familyId, 0]))
  for (const expense of expenses) {
    const share = expense.amount / numFamilies
    if (expense.paidByFamilyId in balanceMap) {
      balanceMap[expense.paidByFamilyId] += expense.amount
    }
    for (const f of families) {
      balanceMap[f.familyId] -= share
    }
  }
  return families.map(f => ({
    familyId: f.familyId,
    name: f.name,
    balance: balanceMap[f.familyId],
  }))
}
```

- [ ] **Step 4: Run all unit tests — verify they pass**

```
npx vitest run tests/unit/expenses.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/expenses.js tests/unit/expenses.test.js
git commit -m "feat: add expenses Firestore utils with unit tests"
```

---

## Task 3: `BalanceSummary` component

**Files:**
- Create: `src/components/BalanceSummary.jsx`
- Create: `tests/unit/BalanceSummary.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/BalanceSummary.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BalanceSummary from '../../src/components/BalanceSummary'

const balances = [
  { familyId: 'fA', name: 'Sharma family', balance: 80 },
  { familyId: 'fB', name: 'Johnson family', balance: -40 },
  { familyId: 'fC', name: 'Patel family', balance: 0 },
]

describe('BalanceSummary', () => {
  it('renders one chip per family', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fA')).toBeTruthy()
    expect(screen.getByTestId('balance-chip-fB')).toBeTruthy()
    expect(screen.getByTestId('balance-chip-fC')).toBeTruthy()
  })

  it('shows family names', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByText('Sharma family')).toBeTruthy()
    expect(screen.getByText('Johnson family')).toBeTruthy()
    expect(screen.getByText('Patel family')).toBeTruthy()
  })

  it('shows + prefix for creditors', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fA').textContent).toContain('+')
  })

  it('shows − prefix for debtors', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fB').textContent).toContain('−')
  })

  it('renders nothing when balances is empty', () => {
    const { container } = render(<BalanceSummary balances={[]} currency="USD" />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/unit/BalanceSummary.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/BalanceSummary.jsx`**

```jsx
export default function BalanceSummary({ balances, currency = 'USD' }) {
  if (balances.length === 0) return null

  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount))

  return (
    <div data-testid="balance-summary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {balances.map(({ familyId, name, balance }) => {
        const isCreditor = balance > 0
        const isDebtor   = balance < 0
        const color  = isCreditor ? '#6ed48a' : isDebtor ? '#f47b7b' : '#7a9ab8'
        const bg     = isCreditor ? 'rgba(52,168,83,0.1)'  : isDebtor ? 'rgba(234,67,53,0.1)'  : 'rgba(255,255,255,0.05)'
        const border = isCreditor ? '1px solid rgba(52,168,83,0.3)' : isDebtor ? '1px solid rgba(234,67,53,0.3)' : '1px solid rgba(255,255,255,0.1)'
        const sign   = isCreditor ? '+' : isDebtor ? '−' : ''

        return (
          <div
            key={familyId}
            data-testid={`balance-chip-${familyId}`}
            style={{ background: bg, border, borderRadius: 8, padding: '6px 12px', minWidth: 100 }}
          >
            <div style={{ color: '#a8c8e8', fontSize: 11 }}>{name}</div>
            <div style={{ color, fontSize: 14, fontWeight: 700 }}>{sign}{fmt(balance)}</div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run tests/unit/BalanceSummary.test.jsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/BalanceSummary.jsx tests/unit/BalanceSummary.test.jsx
git commit -m "feat: add BalanceSummary component with unit tests"
```

---

## Task 4: `ExpenseList` component

**Files:**
- Create: `src/components/ExpenseList.jsx`
- Create: `tests/unit/ExpenseList.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/ExpenseList.test.jsx`:

```jsx
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
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/unit/ExpenseList.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/ExpenseList.jsx`**

```jsx
export default function ExpenseList({ expenses, user, currency = 'USD', onEdit, onDelete }) {
  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  if (expenses.length === 0) {
    return (
      <div data-testid="expense-list-empty" style={{ color: '#7a9ab8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
        No expenses yet — add the first one
      </div>
    )
  }

  return (
    <div data-testid="expense-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {expenses.map(exp => {
        const isOwn = exp.createdBy === user.uid
        return (
          <div
            key={exp.expenseId}
            data-testid={`expense-row-${exp.expenseId}`}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13 }}>{exp.description}</div>
              <div style={{ color: '#7a9ab8', fontSize: 11, marginTop: 2 }}>
                {exp.paidByFamilyName}
                {exp.label && (
                  <span
                    data-testid={`label-pill-${exp.expenseId}`}
                    style={{
                      marginLeft: 6, background: 'rgba(66,133,244,0.15)',
                      border: '1px solid rgba(66,133,244,0.3)',
                      borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#7eb8f7',
                    }}
                  >
                    {exp.label}
                  </span>
                )}
              </div>
            </div>
            <div style={{ color: '#6ed48a', fontSize: 14, fontWeight: 700 }}>{fmt(exp.amount)}</div>
            {isOwn && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  data-testid={`edit-btn-${exp.expenseId}`}
                  onClick={() => onEdit(exp)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >✏️</button>
                <button
                  data-testid={`delete-btn-${exp.expenseId}`}
                  onClick={() => onDelete(exp.expenseId)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >🗑</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run tests/unit/ExpenseList.test.jsx
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExpenseList.jsx tests/unit/ExpenseList.test.jsx
git commit -m "feat: add ExpenseList component with unit tests"
```

---

## Task 5: `ExpenseEditForm` component

**Files:**
- Create: `src/components/ExpenseEditForm.jsx`
- Create: `tests/unit/ExpenseEditForm.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/ExpenseEditForm.test.jsx`:

```jsx
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
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/unit/ExpenseEditForm.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/ExpenseEditForm.jsx`**

```jsx
import { useState } from 'react'

// props:
//   expense      object | null   — null for add mode, existing expense for edit mode
//   families     [{familyId, name}]
//   labels       [{labelId, name}]
//   user         {uid}
//   onSave       async (data) => void  — { description, amount, paidByFamilyId, paidByFamilyName, label }
//   onDelete     async (expenseId) => void — edit mode only
//   onClose      () => void
//   onAddLabel   async (name) => void
export default function ExpenseEditForm({ expense, families, labels, user, onSave, onDelete, onClose, onAddLabel }) {
  const isEdit = !!expense?.expenseId

  const [description,    setDescription]    = useState(expense?.description    ?? '')
  const [amount,         setAmount]         = useState(expense?.amount         ?? '')
  const [paidByFamilyId, setPaidByFamilyId] = useState(expense?.paidByFamilyId ?? '')
  const [label,          setLabel]          = useState(expense?.label          ?? '')
  const [creatingLabel,  setCreatingLabel]  = useState(false)
  const [newLabelName,   setNewLabelName]   = useState('')

  const isValid = description.trim() && parseFloat(amount) > 0 && paidByFamilyId

  async function handleSave() {
    if (!isValid) return
    const paidByFamily = families.find(f => f.familyId === paidByFamilyId)
    await onSave({
      description: description.trim(),
      amount:      parseFloat(amount),
      paidByFamilyId,
      paidByFamilyName: paidByFamily?.name ?? '',
      label: label || null,
    })
    onClose()
  }

  async function handleCreateLabel() {
    const name = newLabelName.trim()
    if (!name) return
    await onAddLabel(name)
    setLabel(name)
    setCreatingLabel(false)
    setNewLabelName('')
  }

  function handleLabelChange(val) {
    if (val === '__create__') {
      setCreatingLabel(true)
      setLabel('')
    } else {
      setLabel(val)
      setCreatingLabel(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  return (
    <div
      data-testid="expense-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Description
      </div>
      <input
        data-testid="form-description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Groceries at Walmart"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Amount
      </div>
      <input
        data-testid="form-amount"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="0.00"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Paid by
      </div>
      <select
        data-testid="form-paid-by"
        value={paidByFamilyId}
        onChange={e => setPaidByFamilyId(e.target.value)}
        style={inputStyle}
      >
        <option value="">Select family…</option>
        {families.map(f => (
          <option key={f.familyId} value={f.familyId}>{f.name}</option>
        ))}
      </select>

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Label <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
      </div>
      {!creatingLabel && (
        <select
          data-testid="form-label"
          value={label}
          onChange={e => handleLabelChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">No label</option>
          {labels.map(l => (
            <option key={l.labelId} value={l.name}>{l.name}</option>
          ))}
          <option value="__create__">+ Create new label…</option>
        </select>
      )}
      {creatingLabel && (
        <div style={{ display: 'flex', gap: 5 }}>
          <input
            data-testid="new-label-input"
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); if (e.key === 'Escape') { setCreatingLabel(false); setNewLabelName('') } }}
            placeholder="Label name…"
            style={{ ...inputStyle, flex: 1 }}
            autoFocus
          />
          <button
            data-testid="new-label-add-btn"
            onClick={handleCreateLabel}
            style={{
              background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
              borderRadius: 6, color: '#7eb8f7', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
            }}
          >Add</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          data-testid="form-save"
          onClick={handleSave}
          style={{
            background: '#4285F4', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '5px 12px', cursor: 'pointer',
            opacity: isValid ? 1 : 0.5,
          }}
        >
          {isEdit ? 'Save' : 'Add expense'}
        </button>
        {isEdit && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(expense.expenseId)}
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 6, color: '#f28b82', fontSize: 11,
              padding: '5px 10px', cursor: 'pointer',
            }}
          >Delete</button>
        )}
        <button
          data-testid="form-cancel"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.07)', border: 'none',
            borderRadius: 6, color: '#7a9ab8', fontSize: 11,
            padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run tests/unit/ExpenseEditForm.test.jsx
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExpenseEditForm.jsx tests/unit/ExpenseEditForm.test.jsx
git commit -m "feat: add ExpenseEditForm component with unit tests"
```

---

## Task 6: `ExpensesTab` orchestrator + integration tests

**Files:**
- Create: `src/components/ExpensesTab.jsx`
- Create: `tests/integration/expenses.test.jsx`

- [ ] **Step 1: Write the failing integration tests**

Create `tests/integration/expenses.test.jsx`:

```jsx
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
    // Families loaded async — wait for re-render
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
    render(<ExpensesTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-expense-btn'))
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Gas' } })
    fireEvent.change(screen.getByTestId('form-amount'),      { target: { value: '60' } })
    fireEvent.change(screen.getByTestId('form-paid-by'),     { target: { value: 'fA' } })
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
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run tests/integration/expenses.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/ExpensesTab.jsx`**

```jsx
import { useEffect, useState } from 'react'
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel, computeBalances,
} from '../utils/expenses'
import { getTripFamilies } from '../utils/firestore'
import BalanceSummary from './BalanceSummary'
import ExpenseList from './ExpenseList'
import ExpenseEditForm from './ExpenseEditForm'

export default function ExpensesTab({ trip, user }) {
  const [expenses,       setExpenses]       = useState([])
  const [labels,         setLabels]         = useState([])
  const [families,       setFamilies]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [editingExpense, setEditingExpense] = useState(null)  // null=closed, {}=new, {...exp}=editing

  useEffect(() => {
    const unsub1 = subscribeExpenses(trip.tripId, items => {
      setExpenses(items)
      setLoading(false)
    })
    const unsub2 = subscribeExpenseLabels(trip.tripId, setLabels)
    getTripFamilies(trip.tripId).then(setFamilies)
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  async function handleSave(data) {
    if (editingExpense?.expenseId) {
      await updateExpense(trip.tripId, editingExpense.expenseId, data)
    } else {
      await addExpense(trip.tripId, { ...data, createdBy: user.uid })
    }
    setEditingExpense(null)
  }

  async function handleDelete(expenseId) {
    await deleteExpense(trip.tripId, expenseId)
    setEditingExpense(null)
  }

  async function handleAddLabel(name) {
    await addExpenseLabel(trip.tripId, name, user.uid)
  }

  const balances = computeBalances(expenses, families)
  const currency = trip.currency ?? 'USD'

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading expenses…
      </div>
    )
  }

  return (
    <div data-testid="expenses-tab">
      <BalanceSummary balances={balances} currency={currency} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          data-testid="add-expense-btn"
          onClick={() => setEditingExpense({})}
          style={{
            background: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.4)',
            borderRadius: 8, padding: '7px 14px', color: '#6ed48a',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add Expense
        </button>
      </div>

      <ExpenseList
        expenses={expenses}
        user={user}
        currency={currency}
        onEdit={exp => setEditingExpense(exp)}
        onDelete={handleDelete}
      />

      {editingExpense !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingExpense(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ExpenseEditForm
              expense={editingExpense?.expenseId ? editingExpense : null}
              families={families}
              labels={labels}
              user={user}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setEditingExpense(null)}
              onAddLabel={handleAddLabel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run integration tests — verify they pass**

```
npx vitest run tests/integration/expenses.test.jsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExpensesTab.jsx tests/integration/expenses.test.jsx
git commit -m "feat: add ExpensesTab orchestrator with integration tests"
```

---

## Task 7: Unlock Expenses tab in TripPage

**Files:**
- Modify: `src/pages/TripPage.jsx`

- [ ] **Step 1: Import `ExpensesTab` and update the available tabs**

In `src/pages/TripPage.jsx`, make two changes:

**Add import** (after the MealsTab import on line 10):
```jsx
import ExpensesTab from '../components/ExpensesTab'
```

**Update `isAvailable` check** (line 66 currently reads `tab === 'Checklist' || tab === 'Meals'`):
```jsx
const isAvailable = tab === 'Checklist' || tab === 'Meals' || tab === 'Expenses'
```

**Add Expenses tab content** (after the `activeTab === 'Meals'` block, before the member list):
```jsx
{activeTab === 'Expenses' && (
  <ExpensesTab trip={trip} user={user} />
)}
```

- [ ] **Step 2: Run the full test suite — verify nothing is broken**

```
npx vitest run
```

Expected: all existing tests pass plus the new expenses tests.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TripPage.jsx
git commit -m "feat: unlock Expenses tab in TripPage and mount ExpensesTab"
```

---

## Complete

All tasks done. Run the full suite one final time to confirm:

```
npx vitest run
```

Then start the dev server and manually verify:
1. Open a trip → Expenses tab is now clickable
2. Add an expense → appears in the list with correct amount
3. Balance chips update to reflect the new expense
4. Edit/delete buttons appear only on your own expenses
5. Create a new label inline → it appears in the dropdown for future expenses
