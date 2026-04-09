# Meals, Expenses & Itinerary — Lock/Unlock + Auto-Populate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lock/unlock buttons to expenses, meals, and itinerary activities; auto-populate the meal "Responsible" dropdown with real family/member data; and remove the expense "Paid by" dropdown in favour of auto-setting from the current user's family.

**Architecture:** Each feature adds `lockedAt / lockedBy / lockedByName` fields to Firestore docs and a `toggleXxxLock` utility, then threads a lock handler from the tab → card component. The meal assignment dropdown replaces free-form text with a structured flat `<select>` built from `families` + `members` data (loaded lazily in `MealsTab`). Expense paid-by is resolved once from `getTripMembers` in `ExpensesTab` and passed as props; the `<select>` in `ExpenseEditForm` is removed.

**Tech Stack:** React 18, Vite, Firebase Firestore (`updateDoc`, `serverTimestamp`), Vitest + React Testing Library.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/utils/meals.js` | Modify | Add `toggleMealLock`; update `addMeal` to store `createdBy` + null lock fields |
| `src/utils/expenses.js` | Modify | Add `toggleExpenseLock`; update `addExpense` to store null lock fields |
| `src/utils/itinerary.js` | Modify | Add `toggleActivityLock`; update `addActivity` to store null lock fields |
| `src/components/MealEditForm.jsx` | Modify | Replace type-select + text-input with flat `<select data-testid="form-responsible">` |
| `src/components/MealCard.jsx` | Modify | Accept `user` + `onToggleLock` props; add lock button; guard edit/delete |
| `src/components/MealCell.jsx` | Modify | Thread `user`, `families`, `members`, `onToggleLock` to children |
| `src/components/MealGrid.jsx` | Modify | Thread `user`, `families`, `members`, `onToggleLock` to `MealCell` |
| `src/components/MealsTab.jsx` | Modify | Load families + members; add `handleToggleMealLock`; pass new props to grid; store `createdBy` in `handleAdd` |
| `src/components/ExpenseEditForm.jsx` | Modify | Remove `families` prop + paid-by `<select>`; accept `userFamilyId` / `userFamilyName` props; show read-only text |
| `src/components/ExpenseList.jsx` | Modify | Accept `onToggleLock`; add lock button; hide edit/delete when locked |
| `src/components/ExpensesTab.jsx` | Modify | Load members; derive user's family; add `handleToggleExpenseLock`; update prop passing |
| `src/components/ActivityCard.jsx` | Modify | Add lock button (activity type only); guard edit/delete on lock state |
| `src/components/ItineraryTab.jsx` | Modify | Add `handleToggleActivityLock`; pass `onToggleLock` to `ActivityCard` |
| `tests/unit/expenses.test.js` | Modify | Add `toggleExpenseLock` tests; update `addExpense` test to assert null lock fields |
| `tests/unit/itinerary.test.js` | Modify | Add `toggleActivityLock` tests; update `addActivity` test to assert null lock fields |
| `tests/unit/ExpenseEditForm.test.jsx` | Modify | Replace `form-paid-by` assertions; add `userFamilyId`/`userFamilyName` props to test helper |
| `tests/unit/ExpenseList.test.jsx` | Modify | Add lock button tests; add hide-edit-delete-when-locked tests |
| `tests/unit/MealCard.test.jsx` | Modify | Add `user` prop to render calls; add lock button + lock-state tests |
| `tests/unit/ActivityCard.test.jsx` | Modify | Add lock button tests; add hide-edit-delete-when-locked tests |

---

## Task 1 — Utility Functions: lock helpers + updated add functions

**Files:**
- Modify: `src/utils/meals.js`
- Modify: `src/utils/expenses.js`
- Modify: `src/utils/itinerary.js`
- Modify: `tests/unit/expenses.test.js`
- Modify: `tests/unit/itinerary.test.js`

- [ ] **Step 1.1 — Write failing tests for the new utility functions**

Append to `tests/unit/expenses.test.js`:

```js
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel, toggleExpenseLock,
} from '../../src/utils/expenses'

// (add inside the existing 'expenses Firestore utils' describe block or as a new one)
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
```

Append to `tests/unit/itinerary.test.js`:

```js
import {
  subscribeActivities, addActivity, updateActivity, deleteActivity,
  toggleActivityLock,
} from '../../src/utils/itinerary'

describe('toggleActivityLock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks an activity: writes lockedAt, lockedBy, lockedByName', async () => {
    await toggleActivityLock('trip1', 'act1', false, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedBy: 'u1', lockedByName: 'Girish' })
    )
  })

  it('unlocks an activity: writes null fields', async () => {
    await toggleActivityLock('trip1', 'act1', true, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { lockedAt: null, lockedBy: null, lockedByName: null }
    )
  })
})

describe('addActivity with lock fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('initialises lockedAt, lockedBy, lockedByName to null', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'act1' })
    await addActivity('trip1', { title: 'Hike', time: '09:00', date: '2026-04-05', icon: '🥾', createdBy: 'u1' })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedAt: null, lockedBy: null, lockedByName: null })
    )
  })
})
```

Create `tests/unit/meals-utils.test.js` (meals utils have no existing test file):

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc } from 'firebase/firestore'
import { addMeal, toggleMealLock } from '../../src/utils/meals'

const TRIP_ID = 'trip1'

describe('addMeal with lock fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores createdBy and null lock fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'm1' })
    await addMeal(TRIP_ID, {
      dish: 'Pasta', slot: 'dinner', day: 0,
      assignedTo: { type: 'person', id: 'u1', label: 'Girish' },
      createdBy: 'u1',
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dish: 'Pasta', createdBy: 'u1',
        lockedAt: null, lockedBy: null, lockedByName: null,
      })
    )
  })
})

describe('toggleMealLock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks a meal: writes lockedAt, lockedBy, lockedByName', async () => {
    await toggleMealLock(TRIP_ID, 'm1', false, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lockedBy: 'u1', lockedByName: 'Girish' })
    )
  })

  it('unlocks a meal: writes null fields', async () => {
    await toggleMealLock(TRIP_ID, 'm1', true, 'u1', 'Girish')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { lockedAt: null, lockedBy: null, lockedByName: null }
    )
  })
})
```

- [ ] **Step 1.2 — Run failing tests**

```bash
npx vitest run tests/unit/expenses.test.js tests/unit/itinerary.test.js tests/unit/meals-utils.test.js
```

Expected: failures for `toggleExpenseLock`, `toggleActivityLock`, `toggleMealLock`, and the lock-field assertions on `addExpense` / `addActivity` / `addMeal`.

- [ ] **Step 1.3 — Implement utility changes**

Replace `src/utils/meals.js` with:

```js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, where,
  arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const SLOT_ORDER = { breakfast: 0, lunch: 1, snacks: 2, dinner: 3 }

export function subscribeMeals(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'meals')
  return onSnapshot(ref, snap => {
    const meals = snap.docs.map(d => ({ mealId: d.id, ...d.data() }))
    meals.sort((a, b) =>
      a.day !== b.day
        ? a.day - b.day
        : SLOT_ORDER[a.slot] !== SLOT_ORDER[b.slot]
          ? SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]
          : (a.order ?? 0) - (b.order ?? 0)
    )
    callback(meals)
  })
}

export async function addMeal(tripId, { dish, slot, day, assignedTo, createdBy }) {
  return addDoc(collection(db, 'trips', tripId, 'meals'), {
    dish, slot, day, assignedTo,
    ingredients: [],
    order: Date.now(),
    createdBy: createdBy ?? null,
    lockedAt: null, lockedBy: null, lockedByName: null,
    createdAt: serverTimestamp(),
  })
}

export async function toggleMealLock(tripId, mealId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'meals', mealId)
  if (isLocked) {
    await updateDoc(ref, { lockedAt: null, lockedBy: null, lockedByName: null })
  } else {
    await updateDoc(ref, { lockedAt: serverTimestamp(), lockedBy: uid, lockedByName: displayName })
  }
}

export async function updateMeal(tripId, mealId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'meals', mealId), changes)
}

export async function deleteMeal(tripId, mealId) {
  return deleteDoc(doc(db, 'trips', tripId, 'meals', mealId))
}

export async function addIngredient(tripId, mealId, name, mealLabel) {
  await updateDoc(doc(db, 'trips', tripId, 'meals', mealId), {
    ingredients: arrayUnion(name),
  })
  await addDoc(collection(db, 'trips', tripId, 'shoppingItems'), {
    name, mealId, mealLabel, checkedBy: null, checkedAt: null, createdAt: serverTimestamp(),
  })
}

export async function removeIngredient(tripId, mealId, name) {
  await updateDoc(doc(db, 'trips', tripId, 'meals', mealId), {
    ingredients: arrayRemove(name),
  })
  const q = query(
    collection(db, 'trips', tripId, 'shoppingItems'),
    where('mealId', '==', mealId),
    where('name', '==', name)
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) await deleteDoc(d.ref)
}
```

Replace `src/utils/expenses.js` with:

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
    lockedAt: null, lockedBy: null, lockedByName: null,
    createdAt: serverTimestamp(),
  })
}

export async function toggleExpenseLock(tripId, expenseId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'expenses', expenseId)
  if (isLocked) {
    await updateDoc(ref, { lockedAt: null, lockedBy: null, lockedByName: null })
  } else {
    await updateDoc(ref, { lockedAt: serverTimestamp(), lockedBy: uid, lockedByName: displayName })
  }
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
    labels.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    callback(labels)
  })
}

export async function addExpenseLabel(tripId, name, uid) {
  return addDoc(collection(db, 'trips', tripId, 'expenseLabels'), {
    name, createdBy: uid, createdAt: serverTimestamp(),
  })
}

export function computeBalances(expenses, families) {
  if (families.length === 0) return []
  const numFamilies = families.length
  const balanceMap = Object.fromEntries(families.map(f => [f.familyId, 0]))
  for (const expense of expenses) {
    const share = expense.amount / numFamilies
    if (expense.paidByFamilyId in balanceMap) balanceMap[expense.paidByFamilyId] += expense.amount
    for (const f of families) balanceMap[f.familyId] -= share
  }
  return families.map(f => ({ familyId: f.familyId, name: f.name, balance: balanceMap[f.familyId] }))
}
```

Replace `src/utils/itinerary.js` with:

```js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeActivities(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'activities')
  return onSnapshot(ref, snap => {
    const activities = snap.docs.map(d => ({ activityId: d.id, ...d.data() }))
    activities.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    callback(activities)
  })
}

export async function addActivity(tripId, data) {
  return addDoc(collection(db, 'trips', tripId, 'activities'), {
    ...data,
    lockedAt: null, lockedBy: null, lockedByName: null,
    createdAt: serverTimestamp(),
  })
}

export async function toggleActivityLock(tripId, activityId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'activities', activityId)
  if (isLocked) {
    await updateDoc(ref, { lockedAt: null, lockedBy: null, lockedByName: null })
  } else {
    await updateDoc(ref, { lockedAt: serverTimestamp(), lockedBy: uid, lockedByName: displayName })
  }
}

export async function updateActivity(tripId, activityId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'activities', activityId), changes)
}

export async function deleteActivity(tripId, activityId) {
  return deleteDoc(doc(db, 'trips', tripId, 'activities', activityId))
}
```

- [ ] **Step 1.4 — Run tests; all should pass**

```bash
npx vitest run tests/unit/expenses.test.js tests/unit/itinerary.test.js tests/unit/meals-utils.test.js
```

Expected: all tests pass.

- [ ] **Step 1.5 — Commit**

```bash
git add src/utils/meals.js src/utils/expenses.js src/utils/itinerary.js \
        tests/unit/meals-utils.test.js tests/unit/expenses.test.js tests/unit/itinerary.test.js
git commit -m "feat: add toggleLock helpers and null lock fields to addMeal/addExpense/addActivity"
```

---

## Task 2 — Expense UI: lock button + paid-by auto-set

**Files:**
- Modify: `src/components/ExpenseList.jsx`
- Modify: `src/components/ExpenseEditForm.jsx`
- Modify: `src/components/ExpensesTab.jsx`
- Modify: `tests/unit/ExpenseList.test.jsx`
- Modify: `tests/unit/ExpenseEditForm.test.jsx`

- [ ] **Step 2.1 — Write failing tests for ExpenseList (lock)**

Replace the entire `tests/unit/ExpenseList.test.jsx` with:

```jsx
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
```

- [ ] **Step 2.2 — Write failing tests for ExpenseEditForm (auto paid-by)**

Replace the entire `tests/unit/ExpenseEditForm.test.jsx` with:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ExpenseEditForm from '../../src/components/ExpenseEditForm'

const labels = [
  { labelId: 'l1', name: 'Food' },
  { labelId: 'l2', name: 'Transport' },
]
const user = { uid: 'u1' }

// userFamilyId + userFamilyName replace the old `families` dropdown prop
const defaultProps = {
  expense: null,
  userFamilyId: 'fA',
  userFamilyName: 'Sharma family',
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

  it('shows the auto-set family name as read-only paid-by text', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    expect(screen.getByTestId('paid-by-display')).toBeTruthy()
    expect(screen.getByText('Sharma family')).toBeTruthy()
  })

  it('does NOT render a paid-by <select> dropdown', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    expect(screen.queryByTestId('form-paid-by')).toBeNull()
  })

  it('shows Save and Delete buttons in edit mode', () => {
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 50, paidByFamilyId: 'fA', paidByFamilyName: 'Sharma family', label: 'Food', createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} />)
    expect(screen.getByTestId('form-save').textContent).toBe('Save')
    expect(screen.getByTestId('form-delete')).toBeTruthy()
  })

  it('pre-fills description and amount in edit mode', () => {
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 124.5, paidByFamilyId: 'fA', paidByFamilyName: 'Sharma family', label: 'Food', createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} />)
    expect(screen.getByTestId('form-description').value).toBe('Groceries')
    expect(screen.getByTestId('form-amount').value).toBe('124.5')
  })

  it('shows original paidByFamilyName in edit mode (not user family)', () => {
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 50, paidByFamilyId: 'fB', paidByFamilyName: 'Johnson family', label: null, createdBy: 'u2' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} />)
    expect(screen.getByTestId('paid-by-display').textContent).toContain('Johnson family')
  })

  it('does not call onSave when description is empty', async () => {
    const onSave = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('form-amount'), { target: { value: '50' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when amount is zero or negative', async () => {
    const onSave = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByTestId('form-amount'), { target: { value: '-10' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with auto-set paidByFamilyId and paidByFamilyName in add mode', async () => {
    const onSave = vi.fn().mockResolvedValue()
    const onClose = vi.fn()
    render(<ExpenseEditForm {...defaultProps} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByTestId('form-description'), { target: { value: 'Groceries' } })
    fireEvent.change(screen.getByTestId('form-amount'), { target: { value: '120' } })
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
    const expense = { expenseId: 'e1', description: 'Groceries', amount: 50, paidByFamilyId: 'fA', paidByFamilyName: 'Sharma family', label: null, createdBy: 'u1' }
    render(<ExpenseEditForm {...defaultProps} expense={expense} onDelete={onDelete} />)
    await act(async () => { fireEvent.click(screen.getByTestId('form-delete')) })
    expect(onDelete).toHaveBeenCalledWith('e1')
  })

  it('shows new label input when "Create new label" is selected', () => {
    render(<ExpenseEditForm {...defaultProps} />)
    fireEvent.change(screen.getByTestId('form-label'), { target: { value: '__create__' } })
    expect(screen.getByTestId('new-label-input')).toBeTruthy()
  })

  it('calls onAddLabel when new label is added', async () => {
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

- [ ] **Step 2.3 — Run failing tests**

```bash
npx vitest run tests/unit/ExpenseList.test.jsx tests/unit/ExpenseEditForm.test.jsx
```

Expected: multiple failures for missing `lock-btn-e1`, `lock-banner-e1`, missing `onToggleLock`, `paid-by-display` testid.

- [ ] **Step 2.4 — Implement ExpenseList**

Replace `src/components/ExpenseList.jsx` with:

```jsx
export default function ExpenseList({ expenses, user, currency = 'USD', onEdit, onDelete, onToggleLock }) {
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
        const isOwn    = exp.createdBy === user?.uid
        const isLocked = !!exp.lockedAt

        return (
          <div
            key={exp.expenseId}
            data-testid={`expense-row-${exp.expenseId}`}
            style={{
              background: isLocked ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isLocked ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              {isLocked && (
                <div
                  data-testid={`lock-banner-${exp.expenseId}`}
                  style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}
                >
                  🔒 Locked by {exp.lockedByName}
                </div>
              )}
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
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  data-testid={`lock-btn-${exp.expenseId}`}
                  onClick={() => onToggleLock(exp, isLocked)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                >
                  {isLocked ? '🔒' : '🔓'}
                </button>
                {!isLocked && (
                  <>
                    <button
                      data-testid={`edit-btn-${exp.expenseId}`}
                      aria-label={`Edit ${exp.description}`}
                      onClick={() => onEdit(exp)}
                      style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                    >✏️</button>
                    <button
                      data-testid={`delete-btn-${exp.expenseId}`}
                      aria-label={`Delete ${exp.description}`}
                      onClick={() => onDelete(exp.expenseId)}
                      style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                    >🗑</button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2.5 — Implement ExpenseEditForm**

Replace `src/components/ExpenseEditForm.jsx` with:

```jsx
import { useState } from 'react'

export default function ExpenseEditForm({ expense, userFamilyId, userFamilyName, labels, user, onSave, onDelete, onClose, onAddLabel }) {
  const isEdit = !!expense?.expenseId

  // In add mode use user's family; in edit mode keep original
  const paidByFamilyId   = isEdit ? expense.paidByFamilyId   : userFamilyId
  const paidByFamilyName = isEdit ? expense.paidByFamilyName : userFamilyName

  const [description,   setDescription]   = useState(expense?.description ?? '')
  const [amount,        setAmount]        = useState(expense?.amount       ?? '')
  const [label,         setLabel]         = useState(expense?.label        ?? '')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [newLabelName,  setNewLabelName]  = useState('')

  const isValid = description.trim() && parseFloat(amount) > 0

  async function handleSave() {
    if (!isValid) return
    await onSave({
      description: description.trim(),
      amount: parseFloat(amount),
      paidByFamilyId,
      paidByFamilyName,
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
    if (val === '__create__') { setCreatingLabel(true); setLabel('') }
    else { setLabel(val); setCreatingLabel(false) }
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
        type="number" min="0.01" step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="0.00"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Paid by
      </div>
      <div
        data-testid="paid-by-display"
        style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, color: '#ccc', fontSize: 12, padding: '6px 9px',
        }}
      >
        {paidByFamilyName}
      </div>

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
          {labels.map(l => <option key={l.labelId} value={l.name}>{l.name}</option>)}
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
        >{isEdit ? 'Save' : 'Add expense'}</button>
        {isEdit && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(expense.expenseId)}
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 6, color: '#f28b82', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
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

- [ ] **Step 2.6 — Update ExpensesTab to wire everything together**

Replace `src/components/ExpensesTab.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel, computeBalances, toggleExpenseLock,
} from '../utils/expenses'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import BalanceSummary from './BalanceSummary'
import ExpenseList from './ExpenseList'
import ExpenseEditForm from './ExpenseEditForm'

export default function ExpensesTab({ trip, user }) {
  const [expenses,       setExpenses]       = useState([])
  const [labels,         setLabels]         = useState([])
  const [families,       setFamilies]       = useState([])
  const [userFamilyId,   setUserFamilyId]   = useState('')
  const [userFamilyName, setUserFamilyName] = useState('')
  const [loading,        setLoading]        = useState(true)
  const [editingExpense, setEditingExpense] = useState(null)

  useEffect(() => {
    const unsub1 = subscribeExpenses(trip.tripId, items => {
      setExpenses(items)
      setLoading(false)
    })
    const unsub2 = subscribeExpenseLabels(trip.tripId, setLabels)
    Promise.all([
      getTripFamilies(trip.tripId),
      getTripMembers(trip.tripId),
    ]).then(([fams, members]) => {
      setFamilies(fams)
      const myMember = members.find(m => m.uid === user.uid)
      const myFamily = fams.find(f => f.familyId === myMember?.familyId)
      if (myFamily) {
        setUserFamilyId(myFamily.familyId)
        setUserFamilyName(myFamily.name)
      }
    }).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  async function handleSave(data) {
    try {
      if (editingExpense?.expenseId) {
        await updateExpense(trip.tripId, editingExpense.expenseId, data)
      } else {
        await addExpense(trip.tripId, { ...data, createdBy: user.uid })
      }
      setEditingExpense(null)
    } catch (err) {
      console.error('Failed to save expense:', err)
    }
  }

  async function handleDelete(expenseId) {
    try {
      await deleteExpense(trip.tripId, expenseId)
    } finally {
      setEditingExpense(null)
    }
  }

  async function handleToggleExpenseLock(expense, isLocked) {
    await toggleExpenseLock(trip.tripId, expense.expenseId, isLocked, user.uid, user.displayName)
  }

  async function handleAddLabel(name) {
    await addExpenseLabel(trip.tripId, name, user.uid)
  }

  const balances  = computeBalances(expenses, families)
  const currency  = trip.currency ?? 'USD'

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
        onToggleLock={handleToggleExpenseLock}
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
              userFamilyId={userFamilyId}
              userFamilyName={userFamilyName}
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

- [ ] **Step 2.7 — Run tests; all should pass**

```bash
npx vitest run tests/unit/ExpenseList.test.jsx tests/unit/ExpenseEditForm.test.jsx
```

Expected: all pass.

- [ ] **Step 2.8 — Run full suite to check for regressions**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 2.9 — Commit**

```bash
git add src/components/ExpenseList.jsx src/components/ExpenseEditForm.jsx src/components/ExpensesTab.jsx \
        tests/unit/ExpenseList.test.jsx tests/unit/ExpenseEditForm.test.jsx
git commit -m "feat: add expense lock/unlock button and auto-set paid-by from user's family"
```

---

## Task 3 — Meal UI: lock button + assignment dropdown

**Files:**
- Modify: `src/components/MealCard.jsx`
- Modify: `src/components/MealCell.jsx`
- Modify: `src/components/MealGrid.jsx`
- Modify: `src/components/MealsTab.jsx`
- Modify: `src/components/MealEditForm.jsx`
- Modify: `tests/unit/MealCard.test.jsx`

- [ ] **Step 3.1 — Write failing tests for MealCard (lock)**

Replace `tests/unit/MealCard.test.jsx` with:

```jsx
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
```

- [ ] **Step 3.2 — Run failing tests**

```bash
npx vitest run tests/unit/MealCard.test.jsx
```

Expected: failures for missing `meal-lock-btn`, `meal-lock-banner`, unexpected `onEdit` call on locked card.

- [ ] **Step 3.3 — Implement MealCard**

Replace `src/components/MealCard.jsx` with:

```jsx
export default function MealCard({ meal, user, onEdit, onDelete, onToggleLock }) {
  const { mealId, dish, assignedTo, ingredients } = meal
  const isLocked = !!meal.lockedAt
  const isOwn    = meal.createdBy === user?.uid
  const count    = ingredients?.length ?? 0

  const badgeStyle = {
    everyone: { background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.3)', color: '#7eb8f7' },
    family:   { background: 'rgba(52,168,83,0.15)',  border: '1px solid rgba(52,168,83,0.3)',  color: '#6ed48a' },
    person:   { background: 'rgba(251,188,5,0.15)',  border: '1px solid rgba(251,188,5,0.3)',  color: '#fdd663' },
  }[assignedTo.type] ?? {}

  return (
    <div
      data-testid="meal-card"
      onClick={() => !isLocked && onEdit(meal)}
      style={{
        background: isLocked ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isLocked ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 7, padding: '8px 10px',
        cursor: isLocked ? 'default' : 'pointer', position: 'relative',
      }}
    >
      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 5, right: 7, display: 'flex', gap: 4 }}>
        {isOwn && (
          <button
            data-testid="meal-lock-btn"
            onClick={e => { e.stopPropagation(); onToggleLock(meal, isLocked) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
        )}
        {!isLocked && (
          <button
            data-testid="meal-card-delete"
            onClick={e => { e.stopPropagation(); onDelete(mealId) }}
            style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 11 }}
          >✕</button>
        )}
      </div>

      {isLocked && (
        <div data-testid="meal-lock-banner" style={{ fontSize: 10, color: '#fbbf24', marginBottom: 3 }}>
          🔒 {meal.lockedByName}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#e8f0fe', marginBottom: 4 }}>{dish}</div>

      <span style={{ fontSize: 10, borderRadius: 4, padding: '1px 6px', display: 'inline-block', ...badgeStyle }}>
        {assignedTo.label}
      </span>

      {count > 0 && (
        <div style={{ fontSize: 10, color: '#7a9ab8', marginTop: 3 }}>
          {count} ingredient{count > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.4 — Run MealCard tests; all should pass**

```bash
npx vitest run tests/unit/MealCard.test.jsx
```

Expected: all pass.

- [ ] **Step 3.5 — Implement MealEditForm (flat responsible dropdown)**

Replace `src/components/MealEditForm.jsx` with:

```jsx
import { useState } from 'react'

function buildOptions(user, families, members) {
  const myMember    = members.find(m => m.uid === user.uid)
  const myFamilyId  = myMember?.familyId
  const myFamily    = families.find(f => f.familyId === myFamilyId)
  const otherFams   = families.filter(f => f.familyId !== myFamilyId)
  const otherMems   = members.filter(m => m.uid !== user.uid)

  return [
    { type: 'person',   id: user.uid,  label: user.displayName, text: `👤 ${user.displayName} (you)` },
    ...(myFamily ? [{ type: 'family', id: myFamily.familyId, label: myFamily.name, text: `👨‍👩‍👧 ${myFamily.name} (your fam)` }] : []),
    { type: 'everyone', id: null,      label: 'Everyone',        text: '🌍 Everyone' },
    ...otherFams.map(f => ({ type: 'family', id: f.familyId, label: f.name,         text: `👨‍👩‍👧 ${f.name}` })),
    ...otherMems.map(m => ({ type: 'person', id: m.uid,     label: m.displayName,   text: `👤 ${m.displayName}` })),
  ]
}

export default function MealEditForm({ mode, meal, day, slot, user, families, members, onSave, onDelete, onClose }) {
  const options = buildOptions(user ?? { uid: '', displayName: '' }, families ?? [], members ?? [])

  const initIndex = () => {
    if (!meal) return '0'
    const idx = options.findIndex(o => o.type === meal.assignedTo?.type && o.id === meal.assignedTo?.id)
    return idx >= 0 ? String(idx) : '0'
  }

  const [dish,        setDish]        = useState(meal?.dish ?? '')
  const [respIdx,     setRespIdx]     = useState(initIndex)
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? [])
  const [ingrInput,   setIngrInput]   = useState('')

  function handleSave() {
    if (!dish.trim()) return
    const opt = options[parseInt(respIdx, 10)] ?? options[0]
    onSave({
      dish: dish.trim(),
      assignedTo: { type: opt.type, id: opt.id, label: opt.label },
      ...(mode === 'edit' && { ingredients }),
    })
  }

  function addIngr() {
    const val = ingrInput.trim()
    if (!val || ingredients.includes(val)) return
    setIngredients(prev => [...prev, val])
    setIngrInput('')
  }

  function removeIngr(name) {
    setIngredients(prev => prev.filter(i => i !== name))
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  return (
    <div
      data-testid="meal-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Dish name
      </div>
      <input
        data-testid="form-dish"
        value={dish}
        onChange={e => setDish(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Grilled cheese…"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Responsible
      </div>
      <select
        data-testid="form-responsible"
        value={respIdx}
        onChange={e => setRespIdx(e.target.value)}
        style={inputStyle}
      >
        {options.map((opt, i) => (
          <option key={`${opt.type}-${opt.id ?? 'everyone'}`} value={String(i)}>{opt.text}</option>
        ))}
      </select>

      {mode === 'edit' && (
        <>
          <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Ingredients <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ingredients.map(ing => (
              <div key={ing} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccd9ea' }}>
                <span style={{ flex: 1 }}>{ing}</span>
                <button
                  data-testid={`remove-ingr-${ing}`}
                  onClick={() => removeIngr(ing)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 11 }}
                >✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              data-testid="ingr-input"
              value={ingrInput}
              onChange={e => setIngrInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addIngr(); if (e.key === 'Escape') onClose() }}
              placeholder="Add ingredient…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              data-testid="ingr-add-btn"
              onClick={addIngr}
              style={{
                background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
                borderRadius: 6, color: '#7eb8f7', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
              }}
            >+ Add</button>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          data-testid="form-save"
          onClick={handleSave}
          style={{
            background: '#4285F4', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 12px', cursor: 'pointer',
          }}
        >{mode === 'add' ? 'Add meal' : 'Save'}</button>
        {mode === 'edit' && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(meal.mealId)}
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 6, color: '#f28b82', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
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

- [ ] **Step 3.6 — Thread user + families + members + onToggleLock through MealCell and MealGrid**

Replace `src/components/MealCell.jsx` with:

```jsx
import { useState } from 'react'
import MealCard from './MealCard'
import MealEditForm from './MealEditForm'

export default function MealCell({ day, slot, meals, user, families, members, onEdit, onDelete, onAdd, onToggleLock }) {
  const [showAddForm, setShowAddForm] = useState(false)

  function handleAdd(data) {
    onAdd({ ...data, day, slot })
    setShowAddForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 140 }}>
      {meals.map(meal => (
        <MealCard
          key={meal.mealId}
          meal={meal}
          user={user}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleLock={onToggleLock}
        />
      ))}

      {showAddForm ? (
        <MealEditForm
          mode="add"
          meal={null}
          day={day}
          slot={slot}
          user={user}
          families={families}
          members={members}
          onSave={handleAdd}
          onDelete={() => {}}
          onClose={() => setShowAddForm(false)}
        />
      ) : (
        <button
          data-testid={`add-meal-${day}-${slot}`}
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'none', border: '1px dashed rgba(255,255,255,0.14)',
            borderRadius: 6, color: '#7a9ab8', fontSize: 11,
            padding: '5px 8px', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          + Add meal
        </button>
      )}
    </div>
  )
}
```

Replace `src/components/MealGrid.jsx` with:

```jsx
import MealCell from './MealCell'

const SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner']
const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🥪 Lunch', snacks: '🍎 Snacks', dinner: '🍲 Dinner' }

export function computeMealDays(startDate, endDate) {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate)
  const end   = endDate?.toDate   ? endDate.toDate()   : new Date(endDate)
  const days  = []
  const cur   = new Date(start)
  let idx = 0
  while (cur <= end) {
    days.push({ index: idx, label: `Day ${idx + 1}`, date: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
    cur.setDate(cur.getDate() + 1)
    idx++
  }
  return days
}

export default function MealGrid({ trip, meals, user, families, members, onEdit, onDelete, onAdd, onToggleLock }) {
  const days = computeMealDays(trip.startDate, trip.endDate)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 680 }}>
        <thead>
          <tr>
            <th style={{
              background: 'rgba(255,255,255,0.06)', color: '#7a9ab8',
              padding: '10px 12px', textAlign: 'left',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 80,
            }}>Day</th>
            {SLOTS.map(slot => (
              <th key={slot} style={{
                background: 'rgba(255,255,255,0.06)', color: '#a8d5ff',
                padding: '10px 12px', textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>{SLOT_LABELS[slot]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day.index}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{day.label}</div>
                <div style={{ color: '#7a9ab8', fontSize: 10 }}>{day.date}</div>
              </td>
              {SLOTS.map(slot => (
                <td key={slot} style={{ padding: '7px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                  <MealCell
                    day={day.index}
                    slot={slot}
                    meals={meals.filter(m => m.day === day.index && m.slot === slot)}
                    user={user}
                    families={families}
                    members={members}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAdd={onAdd}
                    onToggleLock={onToggleLock}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3.7 — Update MealsTab to load families/members and wire lock handler**

Replace `src/components/MealsTab.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient, toggleMealLock } from '../utils/meals'
import { subscribeShoppingItems, toggleShoppingItem } from '../utils/shopping'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import MealGrid from './MealGrid'
import MealEditForm from './MealEditForm'
import ShoppingList from './ShoppingList'

export default function MealsTab({ trip, user }) {
  const [meals,        setMeals]        = useState([])
  const [shopping,     setShopping]     = useState([])
  const [families,     setFamilies]     = useState([])
  const [members,      setMembers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [editingMeal,  setEditingMeal]  = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('grid')

  useEffect(() => {
    const unsub1 = subscribeMeals(trip.tripId, items => {
      setMeals(items)
      setLoading(false)
    })
    const unsub2 = subscribeShoppingItems(trip.tripId, setShopping)
    Promise.all([
      getTripFamilies(trip.tripId),
      getTripMembers(trip.tripId),
    ]).then(([fams, mems]) => {
      setFamilies(fams)
      setMembers(mems)
    }).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  function mealLabel(meal) {
    const slotName = meal.slot[0].toUpperCase() + meal.slot.slice(1)
    return `Day ${meal.day + 1} ${slotName} · ${meal.dish}`
  }

  async function handleAdd({ dish, assignedTo, day, slot }) {
    await addMeal(trip.tripId, { dish, slot, day, assignedTo, createdBy: user.uid })
  }

  async function handleSaveEdit(data) {
    if (!editingMeal) return
    const { ingredients: newIngredients, ...rest } = data
    await updateMeal(trip.tripId, editingMeal.mealId, rest)

    const oldIngredients = editingMeal.ingredients ?? []
    const label = mealLabel({ ...editingMeal, dish: rest.dish })
    for (const ing of newIngredients) {
      if (!oldIngredients.includes(ing)) await addIngredient(trip.tripId, editingMeal.mealId, ing, label)
    }
    for (const ing of oldIngredients) {
      if (!newIngredients.includes(ing)) await removeIngredient(trip.tripId, editingMeal.mealId, ing)
    }
    setEditingMeal(null)
  }

  async function handleDelete(mealId) {
    await deleteMeal(trip.tripId, mealId)
    setEditingMeal(null)
  }

  async function handleToggleMealLock(meal, isLocked) {
    await toggleMealLock(trip.tripId, meal.mealId, isLocked, user.uid, user.displayName)
  }

  async function handleToggleShopping(itemId, isChecked) {
    await toggleShoppingItem(trip.tripId, itemId, user.uid, isChecked)
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>Loading meals…</div>
  }

  // Sub-tab bar
  const subTabStyle = (key) => ({
    padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
    border: activeSubTab === key ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: activeSubTab === key ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeSubTab === key ? '#7eb8f7' : '#7a9ab8',
    fontWeight: activeSubTab === key ? 600 : 400,
  })

  return (
    <div data-testid="meals-tab">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div onClick={() => setActiveSubTab('grid')}     style={subTabStyle('grid')}>🍽️ Meal Plan</div>
        <div onClick={() => setActiveSubTab('shopping')} style={subTabStyle('shopping')}>🛒 Shopping List</div>
      </div>

      {activeSubTab === 'grid' && (
        <MealGrid
          trip={trip}
          meals={meals}
          user={user}
          families={families}
          members={members}
          onEdit={meal => setEditingMeal(meal)}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onToggleLock={handleToggleMealLock}
        />
      )}
      {activeSubTab === 'shopping' && (
        <ShoppingList
          items={shopping}
          onToggle={handleToggleShopping}
        />
      )}

      {editingMeal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingMeal(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <MealEditForm
              mode="edit"
              meal={editingMeal}
              user={user}
              families={families}
              members={members}
              onSave={handleSaveEdit}
              onDelete={handleDelete}
              onClose={() => setEditingMeal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.8 — Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3.9 — Commit**

```bash
git add src/components/MealCard.jsx src/components/MealCell.jsx \
        src/components/MealGrid.jsx src/components/MealsTab.jsx \
        src/components/MealEditForm.jsx tests/unit/MealCard.test.jsx
git commit -m "feat: add meal lock/unlock and auto-populated responsible dropdown"
```

---

## Task 4 — Itinerary UI: lock button on ActivityCard

**Files:**
- Modify: `src/components/ActivityCard.jsx`
- Modify: `src/components/ItineraryTab.jsx`
- Modify: `tests/unit/ActivityCard.test.jsx`

- [ ] **Step 4.1 — Write failing tests for ActivityCard (lock)**

Replace `tests/unit/ActivityCard.test.jsx` with:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityCard from '../../src/components/ActivityCard'

const mockUser = { uid: 'u1', displayName: 'Girish' }

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
  createdBy: 'u1',
  lockedAt: null, lockedBy: null, lockedByName: null,
}

const lockedActivity = {
  ...mockActivity,
  lockedAt: new Date(),
  lockedBy: 'u1',
  lockedByName: 'Girish',
}

const otherActivity = { ...mockActivity, createdBy: 'u2' }

const mockMeal = {
  mealId: 'm1',
  dish: 'Pancakes',
  slot: 'breakfast',
  assignedTo: { type: 'everyone', label: 'Everyone' },
}

describe('ActivityCard — activity variant', () => {
  it('renders with data-testid activity-card-{activityId}', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
  })

  it('shows icon, title, and formatted time', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText('🥾')).toBeTruthy()
    expect(screen.getByText('Hike to waterfall')).toBeTruthy()
    expect(screen.getByText(/9:00 AM/)).toBeTruthy()
  })

  it('shows location when present', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/Blue Ridge Trail/)).toBeTruthy()
  })

  it('shows edit and delete buttons for own unlocked activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-a1')).toBeTruthy()
  })

  it('hides edit and delete buttons for another user\'s activity', () => {
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('shows lock button for own activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-btn-a1')).toBeTruthy()
  })

  it('does NOT show lock button for other user activity', () => {
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('lock-btn-a1')).toBeNull()
  })

  it('hides edit and delete when activity is locked', () => {
    render(<ActivityCard item={lockedActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('shows lock banner with locker name when locked', () => {
    render(<ActivityCard item={lockedActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('lock-banner-a1')).toBeTruthy()
    expect(screen.getByText(/Girish/)).toBeTruthy()
  })

  it('calls onToggleLock with item and isLocked when lock button clicked', () => {
    const onToggleLock = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={onToggleLock} />)
    fireEvent.click(screen.getByTestId('lock-btn-a1'))
    expect(onToggleLock).toHaveBeenCalledWith(mockActivity, false)
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={onEdit} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(onEdit).toHaveBeenCalledWith(mockActivity)
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={onDelete} onToggleLock={vi.fn()} />)
    fireEvent.click(screen.getByTestId('delete-btn-a1'))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })
})

describe('ActivityCard — meal variant', () => {
  it('renders with data-testid meal-card-itinerary-{mealId}', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('shows slot name and dish', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/Breakfast/)).toBeTruthy()
    expect(screen.getByText(/Pancakes/)).toBeTruthy()
  })

  it('shows "from Meals tab" label', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.getByText(/from Meals tab/)).toBeTruthy()
  })

  it('has no edit, delete, or lock buttons', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByText('✏️')).toBeNull()
    expect(screen.queryByText('🗑')).toBeNull()
    expect(screen.queryByTestId('lock-btn-m1')).toBeNull()
  })
})
```

- [ ] **Step 4.2 — Run failing tests**

```bash
npx vitest run tests/unit/ActivityCard.test.jsx
```

Expected: failures for missing `lock-btn-a1`, `lock-banner-a1`.

- [ ] **Step 4.3 — Implement ActivityCard**

Replace `src/components/ActivityCard.jsx` with:

```jsx
function formatTime(hhmm) {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function ActivityCard({ item, type, user, onEdit, onDelete, onToggleLock }) {
  if (type === 'meal') {
    const slotLabel = item.slot ? item.slot[0].toUpperCase() + item.slot.slice(1) : 'Meal'
    return (
      <div
        data-testid={`meal-card-itinerary-${item.mealId}`}
        style={{
          background: 'rgba(66,133,244,0.08)',
          border: '1px solid rgba(66,133,244,0.25)',
          borderRadius: 8, padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🍽️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#7eb8f7', fontSize: 12, fontWeight: 600 }}>
              {slotLabel} · {item.dish}
            </div>
            <div style={{ color: '#5a8ab8', fontSize: 10, marginTop: 2 }}>from Meals tab</div>
          </div>
        </div>
      </div>
    )
  }

  const isOwn    = item.createdBy === user?.uid
  const isLocked = !!item.lockedAt

  return (
    <div
      data-testid={`activity-card-${item.activityId}`}
      style={{
        background: isLocked ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isLocked ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8, padding: '10px 12px',
      }}
    >
      {isLocked && (
        <div
          data-testid={`lock-banner-${item.activityId}`}
          style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}
        >
          🔒 Locked by {item.lockedByName}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{item.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{item.title}</div>
          <div style={{ color: '#7a9ab8', fontSize: 10, marginTop: 2 }}>
            ⏰ {formatTime(item.time)}
            {item.location && ` · 📍 ${item.location}`}
          </div>
        </div>
        {isOwn && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              data-testid={`lock-btn-${item.activityId}`}
              onClick={() => onToggleLock(item, isLocked)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
            >
              {isLocked ? '🔒' : '🔓'}
            </button>
            {!isLocked && (
              <>
                <button
                  data-testid={`edit-btn-${item.activityId}`}
                  aria-label={`Edit ${item.title}`}
                  onClick={() => onEdit(item)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >✏️</button>
                <button
                  data-testid={`delete-btn-${item.activityId}`}
                  aria-label={`Delete ${item.title}`}
                  onClick={() => onDelete(item.activityId)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >🗑</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.4 — Update ItineraryTab to wire lock handler**

In `src/components/ItineraryTab.jsx`, add the import and handler, then pass `onToggleLock` to `ActivityCard`.

Add to imports at top of file:

```js
import { subscribeActivities, addActivity, updateActivity, deleteActivity, toggleActivityLock } from '../utils/itinerary'
```

Add handler after `handleDelete` (around line 110):

```js
async function handleToggleActivityLock(activity, isLocked) {
  await toggleActivityLock(trip.tripId, activity.activityId, isLocked, user.uid, user.displayName)
}
```

Update the activity `ActivityCard` render call (around line 179):

```jsx
<ActivityCard
  key={`activity-${item.activityId}`}
  item={item}
  type="activity"
  user={user}
  onEdit={act => setEditingActivity(act)}
  onDelete={handleDelete}
  onToggleLock={handleToggleActivityLock}
/>
```

The meal-type `ActivityCard` call does not need `onToggleLock` wired (meals are locked from the meal grid), but pass a no-op to satisfy the prop:

```jsx
<ActivityCard
  key={`meal-${item.mealId}`}
  item={item}
  type="meal"
  user={user}
  onEdit={() => {}}
  onDelete={() => {}}
  onToggleLock={() => {}}
/>
```

- [ ] **Step 4.5 — Run all tests**

```bash
npx vitest run
```

Expected: all 267+ tests pass.

- [ ] **Step 4.6 — Commit**

```bash
git add src/components/ActivityCard.jsx src/components/ItineraryTab.jsx \
        tests/unit/ActivityCard.test.jsx
git commit -m "feat: add itinerary activity lock/unlock button"
```

---

## Task 5 — Push & Deploy

- [ ] **Step 5.1 — Run full test suite one last time**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5.2 — Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 5.3 — Deploy to GitHub Pages**

```bash
npm run deploy
```

Expected: `Published`.
