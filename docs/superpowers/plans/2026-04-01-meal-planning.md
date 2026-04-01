# Meal Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collaborative meal planner to TripMate — a day × meal-slot grid where any trip member can add/edit/delete meals and optionally attach ingredients that feed into a shared, real-time checkable shopping list.

**Architecture:** Two Firestore subcollections (`meals`, `shoppingItems`) under each trip. `MealsTab` orchestrates two `onSnapshot` subscriptions and passes data down to `MealGrid` (the calendar table) and `ShoppingList` (flat ingredient list). `MealEditForm` is a shared popover used for both adding and editing meals.

**Tech Stack:** React 18, Firebase Firestore (`onSnapshot`, `addDoc`, `updateDoc`, `deleteDoc`, `arrayUnion`, `arrayRemove`, `serverTimestamp`), Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/meals.js` | Firestore ops for meals collection |
| Create | `src/utils/shopping.js` | Firestore ops for shoppingItems collection |
| Create | `src/components/MealsTab.jsx` | Orchestrator — subscriptions, state, handlers |
| Create | `src/components/MealGrid.jsx` | Day × slot table |
| Create | `src/components/MealCell.jsx` | Single cell: stacked cards + add form |
| Create | `src/components/MealCard.jsx` | Single meal card with edit/delete |
| Create | `src/components/MealEditForm.jsx` | Shared popover for add and edit |
| Create | `src/components/ShoppingList.jsx` | Flat checkable ingredient list |
| Modify | `src/pages/TripPage.jsx` | Unlock Meals tab, mount MealsTab |
| Modify | `tests/setup.js` | Add `arrayRemove`, `deleteDoc` to Firestore mock |
| Create | `tests/unit/MealCard.test.jsx` | Unit tests for MealCard |
| Create | `tests/unit/ShoppingList.test.jsx` | Unit tests for ShoppingList |
| Create | `tests/integration/meals.test.jsx` | Integration tests for full meal flow |

---

## Task 1: Update test setup mock

**Files:**
- Modify: `tests/setup.js`

The Firestore mock is missing `arrayRemove` and `deleteDoc` which are needed by the meal utils.

- [ ] **Step 1: Add `arrayRemove` and `deleteDoc` to the Firestore mock**

Open `tests/setup.js`. Inside the `vi.mock('firebase/firestore', ...)` factory, add two entries after `arrayUnion`:

```js
  arrayUnion: vi.fn((...args) => args),
  arrayRemove: vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => new Date('2026-03-30')),
  Timestamp: { fromDate: vi.fn(d => d) },
  onSnapshot: vi.fn(() => vi.fn()),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  deleteField: vi.fn(() => '__DELETE__'),
  deleteDoc: vi.fn(() => Promise.resolve()),
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: all tests pass (same count as before).

- [ ] **Step 3: Commit**

```bash
git add tests/setup.js
git commit -m "test: add arrayRemove and deleteDoc to Firestore mock"
```

---

## Task 2: `src/utils/meals.js`

**Files:**
- Create: `src/utils/meals.js`
- Test: `tests/integration/meals.test.jsx` (partial — add more in Task 9)

- [ ] **Step 1: Write the failing test**

Create `tests/integration/meals.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot, collection, doc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient } from '../../src/utils/meals'

const TRIP_ID = 'trip1'

describe('meals utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeMeals calls onSnapshot on the meals collection', () => {
    const cb = vi.fn()
    subscribeMeals(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('addMeal calls addDoc with correct fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'meal1' })
    await addMeal(TRIP_ID, {
      dish: 'Pancakes',
      slot: 'breakfast',
      day: 0,
      assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dish: 'Pancakes',
        slot: 'breakfast',
        day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      })
    )
  })

  it('updateMeal calls updateDoc', async () => {
    await updateMeal(TRIP_ID, 'meal1', { dish: 'Waffles' })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { dish: 'Waffles' }
    )
  })

  it('deleteMeal calls deleteDoc', async () => {
    await deleteMeal(TRIP_ID, 'meal1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything())
  })

  it('addIngredient calls updateDoc with arrayUnion and addDoc for shoppingItem', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'si1' })
    await addIngredient(TRIP_ID, 'meal1', 'eggs x12', 'Day 1 Breakfast · Pancakes')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { ingredients: expect.anything() }
    )
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'eggs x12', mealId: 'meal1' })
    )
  })

  it('removeIngredient calls updateDoc with arrayRemove and deleteDoc for shoppingItem', async () => {
    // shoppingItems query returns one matching item
    const { getDocs } = await import('firebase/firestore')
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'si1', data: () => ({ name: 'eggs x12', mealId: 'meal1' }) }],
      empty: false,
    })
    await removeIngredient(TRIP_ID, 'meal1', 'eggs x12')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { ingredients: expect.anything() }
    )
    expect(deleteDoc).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/integration/meals.test.jsx
```

Expected: FAIL — "Cannot find module '../../src/utils/meals'"

- [ ] **Step 3: Create `src/utils/meals.js`**

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

export async function addMeal(tripId, { dish, slot, day, assignedTo }) {
  return addDoc(collection(db, 'trips', tripId, 'meals'), {
    dish,
    slot,
    day,
    assignedTo,
    ingredients: [],
    order: Date.now(),
    createdAt: serverTimestamp(),
  })
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
    name,
    mealId,
    mealLabel,
    checkedBy: null,
    checkedAt: null,
    createdAt: serverTimestamp(),
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
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/integration/meals.test.jsx
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/meals.js tests/integration/meals.test.jsx
git commit -m "feat: add meals.js Firestore utils with subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient"
```

---

## Task 3: `src/utils/shopping.js`

**Files:**
- Create: `src/utils/shopping.js`
- Test: `tests/integration/meals.test.jsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/integration/meals.test.jsx`:

```jsx
import { subscribeShoppingItems, toggleShoppingItem } from '../../src/utils/shopping'

describe('shopping utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeShoppingItems calls onSnapshot on shoppingItems collection', () => {
    const cb = vi.fn()
    subscribeShoppingItems(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('toggleShoppingItem sets checkedBy and checkedAt when checking', async () => {
    await toggleShoppingItem(TRIP_ID, 'si1', 'user1', true)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ checkedBy: 'user1' })
    )
  })

  it('toggleShoppingItem clears checkedBy and checkedAt when unchecking', async () => {
    await toggleShoppingItem(TRIP_ID, 'si1', 'user1', false)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { checkedBy: null, checkedAt: null }
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/integration/meals.test.jsx
```

Expected: FAIL — "Cannot find module '../../src/utils/shopping'"

- [ ] **Step 3: Create `src/utils/shopping.js`**

```js
import {
  collection, doc, updateDoc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeShoppingItems(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'shoppingItems')
  return onSnapshot(ref, snap => {
    const items = snap.docs.map(d => ({ itemId: d.id, ...d.data() }))
    items.sort((a, b) => (a.mealLabel ?? '').localeCompare(b.mealLabel ?? ''))
    callback(items)
  })
}

export async function toggleShoppingItem(tripId, itemId, uid, isChecked) {
  return updateDoc(doc(db, 'trips', tripId, 'shoppingItems', itemId), isChecked
    ? { checkedBy: uid, checkedAt: serverTimestamp() }
    : { checkedBy: null, checkedAt: null }
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/integration/meals.test.jsx
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/shopping.js tests/integration/meals.test.jsx
git commit -m "feat: add shopping.js utils with subscribeShoppingItems and toggleShoppingItem"
```

---

## Task 4: `MealCard` component + unit tests

**Files:**
- Create: `src/components/MealCard.jsx`
- Create: `tests/unit/MealCard.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/MealCard.test.jsx`:

```jsx
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/MealCard.test.jsx
```

Expected: FAIL — "Cannot find module '../../src/components/MealCard'"

- [ ] **Step 3: Create `src/components/MealCard.jsx`**

```jsx
export default function MealCard({ meal, onEdit, onDelete }) {
  const { mealId, dish, assignedTo, ingredients } = meal
  const count = ingredients?.length ?? 0

  const badgeStyle = {
    everyone: { background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.3)', color: '#7eb8f7' },
    family:   { background: 'rgba(52,168,83,0.15)',  border: '1px solid rgba(52,168,83,0.3)',  color: '#6ed48a' },
    person:   { background: 'rgba(251,188,5,0.15)',  border: '1px solid rgba(251,188,5,0.3)',  color: '#fdd663' },
  }[assignedTo.type] ?? {}

  return (
    <div
      data-testid="meal-card"
      onClick={() => onEdit(meal)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 7, padding: '8px 10px',
        cursor: 'pointer', position: 'relative',
      }}
    >
      <button
        data-testid="meal-card-delete"
        onClick={e => { e.stopPropagation(); onDelete(mealId) }}
        style={{
          position: 'absolute', top: 5, right: 7,
          background: 'none', border: 'none',
          color: '#7a9ab8', cursor: 'pointer', fontSize: 11,
        }}
      >✕</button>

      <div style={{ fontSize: 12, color: '#e8f0fe', marginBottom: 4 }}>{dish}</div>

      <span style={{
        fontSize: 10, borderRadius: 4, padding: '1px 6px',
        display: 'inline-block', ...badgeStyle,
      }}>
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/MealCard.test.jsx
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/MealCard.jsx tests/unit/MealCard.test.jsx
git commit -m "feat: add MealCard component with badge colours and ingredient count"
```

---

## Task 5: `ShoppingList` component + unit tests

**Files:**
- Create: `src/components/ShoppingList.jsx`
- Create: `tests/unit/ShoppingList.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/ShoppingList.test.jsx`:

```jsx
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/ShoppingList.test.jsx
```

Expected: FAIL — "Cannot find module '../../src/components/ShoppingList'"

- [ ] **Step 3: Create `src/components/ShoppingList.jsx`**

```jsx
export default function ShoppingList({ items, onToggle }) {
  const checked = items.filter(i => i.checkedBy).length

  if (items.length === 0) {
    return (
      <div style={{ color: '#7a9ab8', fontSize: 13, padding: '16px 0' }}>
        No ingredients added yet. Add ingredients to meal items in the grid.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, fontSize: 11, color: '#7a9ab8' }}>
        {checked} / {items.length} bought
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => {
          const isChecked = !!item.checkedBy
          return (
            <div
              key={item.itemId}
              data-testid={`shop-item-${item.itemId}`}
              onClick={() => onToggle(item.itemId, !isChecked)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '10px 14px',
                cursor: 'pointer', opacity: isChecked ? 0.45 : 1,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: isChecked ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                background: isChecked ? '#34A853' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff',
              }}>
                {isChecked ? '✓' : ''}
              </div>
              <div style={{
                flex: 1, fontSize: 13, color: '#e8f0fe',
                textDecoration: isChecked ? 'line-through' : 'none',
              }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: '#7a9ab8', whiteSpace: 'nowrap' }}>
                {item.mealLabel}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/ShoppingList.test.jsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShoppingList.jsx tests/unit/ShoppingList.test.jsx
git commit -m "feat: add ShoppingList component with checkboxes, progress counter and empty state"
```

---

## Task 6: `MealEditForm` component

**Files:**
- Create: `src/components/MealEditForm.jsx`

No dedicated unit test — the form is a controlled presentational component fully exercised by the integration tests in Task 9. The form is tested through `MealsTab` rendering.

- [ ] **Step 1: Create `src/components/MealEditForm.jsx`**

```jsx
import { useState } from 'react'

// Used for both adding a new meal (mode='add') and editing an existing one (mode='edit').
// props:
//   mode        'add' | 'edit'
//   meal        object | null   — null when mode='add'
//   day         number          — 0-based day index (used when mode='add')
//   slot        string          — meal slot (used when mode='add')
//   onSave      (data) => void  — { dish, assignedTo, ingredients? }
//   onDelete    (mealId) => void — only called in edit mode
//   onClose     () => void
export default function MealEditForm({ mode, meal, day, slot, onSave, onDelete, onClose }) {
  const [dish,       setDish]       = useState(meal?.dish ?? '')
  const [respType,   setRespType]   = useState(meal?.assignedTo?.type ?? 'everyone')
  const [respLabel,  setRespLabel]  = useState(
    meal?.assignedTo?.type !== 'everyone' ? (meal?.assignedTo?.label ?? '') : ''
  )
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? [])
  const [ingrInput,   setIngrInput]   = useState('')

  const RESP_LABELS = { everyone: 'Everyone', family: respLabel, person: respLabel }

  function handleSave() {
    if (!dish.trim()) return
    const label = respType === 'everyone' ? 'Everyone' : respLabel.trim() || respType
    onSave({
      dish: dish.trim(),
      assignedTo: { type: respType, id: null, label },
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
        data-testid="form-resp-type"
        value={respType}
        onChange={e => setRespType(e.target.value)}
        style={{ ...inputStyle }}
      >
        <option value="everyone">👥 Everyone</option>
        <option value="family">🍳 Family</option>
        <option value="person">👤 Individual</option>
      </select>

      {respType !== 'everyone' && (
        <input
          data-testid="form-resp-label"
          value={respLabel}
          onChange={e => setRespLabel(e.target.value)}
          placeholder={respType === 'family' ? 'Family name…' : 'Person name…'}
          style={inputStyle}
        />
      )}

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
            color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '5px 12px', cursor: 'pointer',
          }}
        >
          {mode === 'add' ? 'Add meal' : 'Save'}
        </button>
        {mode === 'edit' && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(meal.mealId)}
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

- [ ] **Step 2: Verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/MealEditForm.jsx
git commit -m "feat: add MealEditForm shared popover for add and edit"
```

---

## Task 7: `MealCell` and `MealGrid` components

**Files:**
- Create: `src/components/MealCell.jsx`
- Create: `src/components/MealGrid.jsx`

These are pure presentational components wired together in `MealsTab`. Tested via the integration tests in Task 9.

- [ ] **Step 1: Create `src/components/MealCell.jsx`**

```jsx
import { useState } from 'react'
import MealCard from './MealCard'
import MealEditForm from './MealEditForm'

export default function MealCell({ day, slot, meals, onEdit, onDelete, onAdd }) {
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
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {showAddForm ? (
        <MealEditForm
          mode="add"
          meal={null}
          day={day}
          slot={slot}
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

- [ ] **Step 2: Create `src/components/MealGrid.jsx`**

```jsx
import MealCell from './MealCell'

const SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner']
const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🥪 Lunch', snacks: '🍎 Snacks', dinner: '🍲 Dinner' }

// computeMealDays: exported for unit testing
export function computeMealDays(startDate, endDate) {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate)
  const end   = endDate?.toDate   ? endDate.toDate()   : new Date(endDate)
  const days  = []
  const cur   = new Date(start)
  let idx = 0
  while (cur <= end) {
    days.push({
      index: idx,
      label: `Day ${idx + 1}`,
      date:  cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })
    cur.setDate(cur.getDate() + 1)
    idx++
  }
  return days
}

export default function MealGrid({ trip, meals, onEdit, onDelete, onAdd }) {
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
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
              width: 80,
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
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAdd={onAdd}
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

- [ ] **Step 3: Verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/MealCell.jsx src/components/MealGrid.jsx
git commit -m "feat: add MealCell and MealGrid components"
```

---

## Task 8: `MealsTab` orchestrator

**Files:**
- Create: `src/components/MealsTab.jsx`

- [ ] **Step 1: Create `src/components/MealsTab.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient } from '../utils/meals'
import { subscribeShoppingItems, toggleShoppingItem } from '../utils/shopping'
import MealGrid from './MealGrid'
import MealEditForm from './MealEditForm'
import ShoppingList from './ShoppingList'

export default function MealsTab({ trip, user }) {
  const [meals,         setMeals]         = useState([])
  const [shopping,      setShopping]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [editingMeal,   setEditingMeal]   = useState(null)   // meal being edited
  const [activeSubTab,  setActiveSubTab]  = useState('grid')

  useEffect(() => {
    const unsub1 = subscribeMeals(trip.tripId, items => {
      setMeals(items)
      setLoading(false)
    })
    const unsub2 = subscribeShoppingItems(trip.tripId, setShopping)
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  // Helpers to build a human-readable mealLabel snapshot
  function mealLabel(meal) {
    const slotName = meal.slot[0].toUpperCase() + meal.slot.slice(1)
    return `Day ${meal.day + 1} ${slotName} · ${meal.dish}`
  }

  async function handleAdd({ dish, assignedTo, day, slot }) {
    await addMeal(trip.tripId, { dish, slot, day, assignedTo })
  }

  async function handleSaveEdit(data) {
    if (!editingMeal) return
    const { ingredients: newIngredients, ...rest } = data
    await updateMeal(trip.tripId, editingMeal.mealId, rest)

    // Sync ingredients: add new ones, remove deleted ones
    const oldIngredients = editingMeal.ingredients ?? []
    const label = mealLabel({ ...editingMeal, dish: rest.dish })
    for (const ing of newIngredients) {
      if (!oldIngredients.includes(ing)) {
        await addIngredient(trip.tripId, editingMeal.mealId, ing, label)
      }
    }
    for (const ing of oldIngredients) {
      if (!newIngredients.includes(ing)) {
        await removeIngredient(trip.tripId, editingMeal.mealId, ing)
      }
    }
    setEditingMeal(null)
  }

  async function handleDelete(mealId) {
    await deleteMeal(trip.tripId, mealId)
    setEditingMeal(null)
  }

  async function handleToggleShopping(itemId, isChecked) {
    await toggleShoppingItem(trip.tripId, itemId, user.uid, isChecked)
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading meals…
      </div>
    )
  }

  const subTabStyle = (id) => ({
    padding: '7px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
    border: activeSubTab === id ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: activeSubTab === id ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeSubTab === id ? '#7eb8f7' : '#7a9ab8',
    fontWeight: activeSubTab === id ? 600 : 400,
  })

  return (
    <div data-testid="meals-tab">
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={subTabStyle('grid')}    onClick={() => setActiveSubTab('grid')}>📅 Meal Grid</div>
        <div style={subTabStyle('shopping')} onClick={() => setActiveSubTab('shopping')}>🛒 Shopping List</div>
      </div>

      {activeSubTab === 'grid' && (
        <div style={{ position: 'relative' }}>
          <MealGrid
            trip={trip}
            meals={meals}
            onEdit={meal => setEditingMeal(meal)}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
          {editingMeal && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
            }} onClick={() => setEditingMeal(null)}>
              <div onClick={e => e.stopPropagation()}>
                <MealEditForm
                  mode="edit"
                  meal={editingMeal}
                  onSave={handleSaveEdit}
                  onDelete={handleDelete}
                  onClose={() => setEditingMeal(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'shopping' && (
        <ShoppingList items={shopping} onToggle={handleToggleShopping} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/MealsTab.jsx
git commit -m "feat: add MealsTab orchestrator with subscribeMeals and subscribeShoppingItems"
```

---

## Task 9: Wire MealsTab into TripPage

**Files:**
- Modify: `src/pages/TripPage.jsx`

- [ ] **Step 1: Add MealsTab import and unlock the Meals tab**

Open `src/pages/TripPage.jsx`. Make three changes:

**a) Add import at the top (after ChecklistTab import):**
```jsx
import MealsTab from '../components/MealsTab'
```

**b) Change `isAvailable` check (line ~65):**
```jsx
const isAvailable = tab === 'Checklist' || tab === 'Meals'
```

**c) Add MealsTab render after ChecklistTab render:**
```jsx
{activeTab === 'Checklist' && (
  <ChecklistTab trip={trip} user={user} />
)}

{activeTab === 'Meals' && (
  <MealsTab trip={trip} user={user} />
)}
```

- [ ] **Step 2: Verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TripPage.jsx
git commit -m "feat: unlock Meals tab in TripPage and mount MealsTab"
```

---

## Task 10: Integration tests

**Files:**
- Modify: `tests/integration/meals.test.jsx`

- [ ] **Step 1: Write integration tests**

Append to `tests/integration/meals.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import MealsTab from '../../src/components/MealsTab'
import * as mealsUtils from '../../src/utils/meals'
import * as shoppingUtils from '../../src/utils/shopping'

const mockTrip = {
  tripId: 'trip1',
  tripType: 'Tent Camping',
  startDate: { toDate: () => new Date('2026-04-10') },
  endDate:   { toDate: () => new Date('2026-04-12') },
}
const mockUser = { uid: 'u1', displayName: 'Test User' }

describe('MealsTab integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // subscribeMeals: call callback with initial empty list, return unsub
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([])
      return vi.fn()
    })

    // subscribeShoppingItems: call callback with empty list
    vi.spyOn(shoppingUtils, 'subscribeShoppingItems').mockImplementation((tripId, cb) => {
      cb([])
      return vi.fn()
    })

    vi.spyOn(mealsUtils, 'addMeal').mockResolvedValue({ id: 'meal-new' })
    vi.spyOn(mealsUtils, 'updateMeal').mockResolvedValue()
    vi.spyOn(mealsUtils, 'deleteMeal').mockResolvedValue()
    vi.spyOn(mealsUtils, 'addIngredient').mockResolvedValue()
    vi.spyOn(mealsUtils, 'removeIngredient').mockResolvedValue()
    vi.spyOn(shoppingUtils, 'toggleShoppingItem').mockResolvedValue()
  })

  it('renders meals-tab with Meal Grid and Shopping List sub-tabs', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('meals-tab')).toBeTruthy()
    expect(screen.getByText('📅 Meal Grid')).toBeTruthy()
    expect(screen.getByText('🛒 Shopping List')).toBeTruthy()
  })

  it('renders grid with correct number of day rows', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByText('Day 1')).toBeTruthy()
    expect(screen.getByText('Day 2')).toBeTruthy()
    expect(screen.getByText('Day 3')).toBeTruthy()
  })

  it('clicking "+ Add meal" shows the add form', async () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getAllByTestId('add-meal-0-breakfast')[0])
    expect(screen.getByTestId('meal-edit-form')).toBeTruthy()
  })

  it('submitting add form calls addMeal with correct args', async () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getAllByTestId('add-meal-0-breakfast')[0])
    fireEvent.change(screen.getByTestId('form-dish'), { target: { value: 'Waffles' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(mealsUtils.addMeal).toHaveBeenCalledWith('trip1', expect.objectContaining({
      dish: 'Waffles', slot: 'breakfast', day: 0,
    }))
  })

  it('clicking a meal card opens edit form', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    expect(screen.getByTestId('meal-edit-form')).toBeTruthy()
  })

  it('saving edit form calls updateMeal', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    fireEvent.change(screen.getByTestId('form-dish'), { target: { value: 'Pancakes Updated' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(mealsUtils.updateMeal).toHaveBeenCalledWith('trip1', 'm1', expect.objectContaining({ dish: 'Pancakes Updated' }))
  })

  it('clicking delete on a meal card calls deleteMeal', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    await act(async () => { fireEvent.click(screen.getByTestId('meal-card-delete')) })
    expect(mealsUtils.deleteMeal).toHaveBeenCalledWith('trip1', 'm1')
  })

  it('shopping list tab renders empty state when no items', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByText('🛒 Shopping List'))
    expect(screen.getByText(/No ingredients added yet/)).toBeTruthy()
  })

  it('toggling a shopping item calls toggleShoppingItem', async () => {
    vi.spyOn(shoppingUtils, 'subscribeShoppingItems').mockImplementation((tripId, cb) => {
      cb([{
        itemId: 'si1', name: 'eggs', mealLabel: 'Day 1 Breakfast · Pancakes',
        checkedBy: null, checkedAt: null,
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByText('🛒 Shopping List'))
    await act(async () => { fireEvent.click(screen.getByTestId('shop-item-si1')) })
    expect(shoppingUtils.toggleShoppingItem).toHaveBeenCalledWith('trip1', 'si1', 'u1', true)
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass including the new integration tests.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/meals.test.jsx
git commit -m "test: add MealsTab integration tests"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Data model (`meals`, `shoppingItems`) — Task 2, 3 ✓
  - `subscribeMeals` / `addMeal` / `updateMeal` / `deleteMeal` / `addIngredient` / `removeIngredient` — Task 2 ✓
  - `subscribeShoppingItems` / `toggleShoppingItem` — Task 3 ✓
  - `MealCard` with badges + ingredient count — Task 4 ✓
  - `ShoppingList` with checkboxes + progress + empty state — Task 5 ✓
  - `MealEditForm` shared add/edit popover — Task 6 ✓
  - `MealCell` + `MealGrid` — Task 7 ✓
  - `MealsTab` orchestrator — Task 8 ✓
  - TripPage integration — Task 9 ✓
  - `computeMealDays` exported from `MealGrid` for unit testing — Task 7 ✓
  - Integration tests — Task 10 ✓
- [x] **No placeholders** — all steps have concrete code
- [x] **Type consistency** — `mealId`, `itemId`, `tripId` used consistently across all tasks; `assignedTo.type/id/label` consistent; `ingredients` always `string[]`
