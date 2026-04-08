# Checklist Ownership Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace family-level checklist ownership with per-user ownership — track who checked, locked, and toggled mode by uid + displayName; show full names in the NA row and mode button; remove the item-level lock button.

**Architecture:** Four surgical changes across the utility layer (`checklist.js`), two orchestrator components (`ChecklistTab`, `ChecklistCategory`), and the row renderer (`ChecklistItemRow`). TDD throughout — integration tests verify `ChecklistTab` wires the right args to utilities; unit tests verify `ChecklistItemRow` renders and disables controls correctly.

**Tech Stack:** React 18, Firebase Firestore (`updateDoc`, `serverTimestamp`, `deleteField`), Vitest + React Testing Library

---

## File Map

| File | Change |
|---|---|
| `src/utils/checklist.js` | Update `toggleCheck`, `toggleLock`, `setMode` signatures; delete `lockItem` |
| `src/components/ChecklistTab.jsx` | Update handlers; remove `handleLockItem` |
| `src/components/ChecklistCategory.jsx` | Remove `onLockItem` prop |
| `src/components/ChecklistItemRow.jsx` | Full ownership logic rewrite; remove item-level lock button |
| `tests/integration/checklist.test.jsx` | Update spies + call-arg assertions for new signatures |
| `tests/unit/ChecklistItemRow.test.jsx` | Full test rewrite for new ownership rules |

---

## Task 1 — Update `checklist.js`: new signatures + delete `lockItem`

**Files:**
- Modify: `src/utils/checklist.js`
- Modify: `tests/integration/checklist.test.jsx` (update spies and assertions first)

### Why this order matters
The integration test currently spies on `lockItem`. If `lockItem` is deleted from the source before the spy is removed, `vi.spyOn` will throw "Cannot spy the lockItem property". Remove the spy first in the same commit.

---

- [ ] **Step 1: Update the integration test `beforeEach` — remove `lockItem` spy, update `toggleLock` and `setMode` call assertions**

Replace the entire file `tests/integration/checklist.test.jsx` with:

```jsx
// tests/integration/checklist.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChecklistTab from '../../src/components/ChecklistTab'
import * as checklistUtils from '../../src/utils/checklist'
import * as firestoreUtils from '../../src/utils/firestore'

const trip = {
  tripId: 'trip1', tripType: 'Tent Camping',
  name: 'Rocky Mountains', destination: 'CO',
}
const user = { uid: 'u1', displayName: 'Girish' }

const families = [
  { familyId: 'fA', name: 'Sharma', memberIds: ['u1'] },
  { familyId: 'fB', name: 'Patel',  memberIds: ['u2'] },
]
const members = [
  { uid: 'u1', displayName: 'Girish', familyId: 'fA' },
  { uid: 'u2', displayName: 'Raj',    familyId: 'fB' },
]

const makeItem = (overrides = {}) => ({
  itemId: 'i1', name: 'Tent', category: 'Sleeping',
  mode: 'per-family', order: 0, isCustom: false,
  checks: {}, sharedCheck: null,
  modeOwnerUid: null, modeOwnerName: null,
  ...overrides,
})

beforeEach(() => {
  vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(families)
  vi.spyOn(firestoreUtils, 'getTripMembers').mockResolvedValue(members)
  vi.spyOn(checklistUtils, 'initChecklistFromTemplate').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleCheck').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleLock').mockResolvedValue()
  // lockItem spy REMOVED — function deleted from checklist.js
  vi.spyOn(checklistUtils, 'setMode').mockResolvedValue()
  vi.spyOn(checklistUtils, 'addItem').mockResolvedValue()
})

describe('ChecklistTab integration', () => {
  it('renders checklist items from snapshot', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => expect(screen.getByText('Tent')).toBeTruthy())
  })

  it('calls toggleCheck when own family checkbox clicked', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('Tent'))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(checklistUtils.toggleCheck).toHaveBeenCalledWith(
      'trip1', 'i1', 'per-family', 'fA', 'u1', 'Girish', false
    )
  })

  // toggleLock now receives uid + displayName as 6th and 7th args
  it('calls toggleLock with uid and displayName when lock button clicked by owner', async () => {
    const checkedItem = makeItem({
      checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } },
    })
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([checkedItem])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByTestId('check-lock-btn'))
    fireEvent.click(screen.getByTestId('check-lock-btn'))
    expect(checklistUtils.toggleLock).toHaveBeenCalledWith(
      'trip1', 'i1', 'per-family', 'fA', false, 'u1', 'Girish'
    )
  })

  // setMode now receives uid + displayName as 4th and 5th args
  it('calls setMode with uid and displayName when mode toggle clicked', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByTestId('mode-toggle'))
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(checklistUtils.setMode).toHaveBeenCalledWith(
      'trip1', 'i1', 'shared', 'u1', 'Girish'
    )
  })

  it('calls addItem when Add item form submitted', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('+ Add item'))
    fireEvent.click(screen.getByText('+ Add item'))
    const input = screen.getByPlaceholderText('Item name…')
    fireEvent.change(input, { target: { value: 'Hammock' } })
    fireEvent.click(screen.getByText('Add'))
    expect(checklistUtils.addItem).toHaveBeenCalledWith('trip1', 'Sleeping', 'Hammock')
  })

  it('shows loading state before snapshot fires', () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation(() => vi.fn())
    render(<ChecklistTab trip={trip} user={user} />)
    expect(screen.getByText(/Loading checklist/)).toBeTruthy()
  })

  it('unsubscribes from onSnapshot on unmount', async () => {
    const unsub = vi.fn()
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return unsub
    })
    const { unmount } = render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('Tent'))
    unmount()
    expect(unsub).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run integration tests — expect 2 failures (toggleLock and setMode call args)**

```
cd C:/Users/Girish/Desktop/tripmate
npx vitest run tests/integration/checklist.test.jsx --reporter=verbose
```

Expected: `calls toggleLock with uid and displayName` FAIL, `calls setMode with uid and displayName` FAIL. All other tests pass.

---

- [ ] **Step 3: Rewrite `src/utils/checklist.js` with updated signatures**

Replace the entire file:

```js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  onSnapshot, writeBatch, deleteField, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { TEMPLATES } from './checklistTemplates'

/** Subscribe to live checklist updates. Returns unsubscribe function. */
export function subscribeChecklist(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'checklistItems')
  return onSnapshot(ref, snap => {
    const items = snap.docs.map(d => ({ itemId: d.id, ...d.data() }))
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(items)
  })
}

/**
 * Check or uncheck a checkbox.
 * Initialises lockedBy/lockedByName to null on new check entries.
 */
export async function toggleCheck(tripId, itemId, mode, familyId, uid, displayName, isChecked) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const newEntry = { checkedBy: uid, displayName, lockedAt: null, lockedBy: null, lockedByName: null }
  if (mode === 'shared') {
    await updateDoc(ref, { sharedCheck: isChecked ? deleteField() : newEntry })
  } else {
    await updateDoc(ref, {
      [`checks.${familyId}`]: isChecked ? deleteField() : newEntry,
    })
  }
}

/**
 * Toggle lock on a checked item.
 * On lock: writes lockedAt, lockedBy, lockedByName.
 * On unlock: clears all three fields.
 * Caller must verify ownership before calling.
 */
export async function toggleLock(tripId, itemId, mode, familyId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const prefix = mode === 'shared' ? 'sharedCheck' : `checks.${familyId}`
  if (isLocked) {
    await updateDoc(ref, {
      [`${prefix}.lockedAt`]:     null,
      [`${prefix}.lockedBy`]:     null,
      [`${prefix}.lockedByName`]: null,
    })
  } else {
    await updateDoc(ref, {
      [`${prefix}.lockedAt`]:     serverTimestamp(),
      [`${prefix}.lockedBy`]:     uid,
      [`${prefix}.lockedByName`]: displayName,
    })
  }
}

/**
 * Cycle item mode: per-family → shared → na → per-family.
 * Stores modeOwnerUid/modeOwnerName when switching to shared or na.
 * Clears those fields when reverting to per-family.
 * Clears all check state atomically on every mode change.
 */
export async function setMode(tripId, itemId, newMode, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const isOwned = newMode === 'shared' || newMode === 'na'
  await updateDoc(ref, {
    mode: newMode,
    checks: {},
    sharedCheck: null,
    modeOwnerUid:  isOwned ? uid  : null,
    modeOwnerName: isOwned ? displayName : null,
  })
}

/** Add a custom item to a category. */
export async function addItem(tripId, category, name) {
  const ref = collection(db, 'trips', tripId, 'checklistItems')
  await addDoc(ref, {
    name, category,
    mode: 'per-family',
    order: Date.now(),
    isCustom: true,
    checks: {},
    sharedCheck: null,
    modeOwnerUid: null,
    modeOwnerName: null,
  })
}

/**
 * Pre-populate checklist from template. No-op if items already exist.
 */
export async function initChecklistFromTemplate(tripId, tripType) {
  const ref = collection(db, 'trips', tripId, 'checklistItems')
  const existing = await getDocs(ref)
  if (!existing.empty) return

  const template = TEMPLATES[tripType] ?? TEMPLATES['Tent Camping']
  const batch = writeBatch(db)
  let order = 0

  template.forEach(({ category, items }) => {
    items.forEach(name => {
      const itemRef = doc(ref)
      batch.set(itemRef, {
        name, category,
        mode: 'per-family',
        order: order++,
        isCustom: false,
        checks: {},
        sharedCheck: null,
        modeOwnerUid: null,
        modeOwnerName: null,
      })
    })
  })

  await batch.commit()
}
```

- [ ] **Step 4: Run integration tests — all should pass**

```
npx vitest run tests/integration/checklist.test.jsx --reporter=verbose
```

Expected: 7 passed, 0 failed.

- [ ] **Step 5: Commit**

```
cd C:/Users/Girish/Desktop/tripmate
git add src/utils/checklist.js tests/integration/checklist.test.jsx
git commit -m "feat: add per-user ownership to checklist utils (toggleLock, setMode, toggleCheck)"
```

---

## Task 2 — Update `ChecklistTab.jsx` and `ChecklistCategory.jsx`

**Files:**
- Modify: `src/components/ChecklistTab.jsx`
- Modify: `src/components/ChecklistCategory.jsx`

These pass args down to the utils. Now that utils expect `uid + displayName`, the handlers must supply them.

---

- [ ] **Step 1: Replace `src/components/ChecklistTab.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import {
  subscribeChecklist, toggleCheck, toggleLock,
  setMode, addItem, initChecklistFromTemplate,
} from '../utils/checklist'
import ChecklistProgress from './ChecklistProgress'
import ChecklistCategory from './ChecklistCategory'

export default function ChecklistTab({ trip, user }) {
  const [items,           setItems]           = useState([])
  const [families,        setFamilies]        = useState([])
  const [currentFamilyId, setCurrentFamilyId] = useState(null)
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      getTripFamilies(trip.tripId),
      getTripMembers(trip.tripId),
    ]).then(([fams, members]) => {
      setFamilies(fams.filter(f => f.memberIds?.length > 0))
      const me = members.find(m => m.uid === user.uid)
      setCurrentFamilyId(me?.familyId ?? null)
    })
  }, [trip.tripId, user.uid])

  useEffect(() => {
    const unsub = subscribeChecklist(trip.tripId, async (liveItems) => {
      setItems(liveItems)
      if (liveItems.length === 0) {
        await initChecklistFromTemplate(trip.tripId, trip.tripType)
      }
      setLoading(false)
    })
    return unsub
  }, [trip.tripId, trip.tripType])

  const categories = []
  const seen = new Set()
  items.forEach(item => {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      categories.push(item.category)
    }
  })

  const handleToggleCheck = (item, familyId, isChecked) => {
    toggleCheck(trip.tripId, item.itemId, item.mode, familyId, user.uid, user.displayName, isChecked)
  }

  // Now passes user.uid + user.displayName so checklist.js can write lockedBy/lockedByName
  const handleToggleLock = (item, familyId, isLocked) => {
    toggleLock(trip.tripId, item.itemId, item.mode, familyId, isLocked, user.uid, user.displayName)
  }

  // Now passes user.uid + user.displayName so checklist.js can write modeOwnerUid/modeOwnerName
  const handleSetMode = (item, newMode) => {
    setMode(trip.tripId, item.itemId, newMode, user.uid, user.displayName)
  }

  const handleAddItem = (category, name) => {
    addItem(trip.tripId, category, name)
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading checklist…
      </div>
    )
  }

  return (
    <div data-testid="checklist-tab">
      <ChecklistProgress items={items} families={families} />
      {categories.map(cat => (
        <ChecklistCategory
          key={cat}
          category={cat}
          items={items.filter(i => i.category === cat)}
          families={families}
          currentUser={user}
          currentFamilyId={currentFamilyId}
          onToggleCheck={handleToggleCheck}
          onToggleLock={handleToggleLock}
          onSetMode={handleSetMode}
          onAddItem={handleAddItem}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/components/ChecklistCategory.jsx`**

Remove `onLockItem` from props and from the `ChecklistItemRow` pass-through:

```jsx
import { useState } from 'react'
import ChecklistItemRow from './ChecklistItemRow'
import { CATEGORY_ICONS } from '../utils/checklistTemplates'

export default function ChecklistCategory({
  category, items, families,
  currentUser, currentFamilyId,
  onToggleCheck, onToggleLock, onSetMode, onAddItem,
}) {
  const [expanded, setExpanded]       = useState(true)
  const [addingItem, setAddingItem]   = useState(false)
  const [newItemName, setNewItemName] = useState('')

  const icon         = CATEGORY_ICONS[category] ?? '📦'
  const totalInCat   = items.filter(i => i.mode !== 'na').length
  const checkedInCat = items.filter(i => {
    if (i.mode === 'na') return false
    if (i.mode === 'shared') return !!i.sharedCheck
    return families.some(f => !!i.checks?.[f.familyId])
  }).length

  const handleAddItem = async () => {
    const name = newItemName.trim()
    if (!name) return
    await onAddItem(category, name)
    setNewItemName('')
    setAddingItem(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: expanded ? '10px 10px 0 0' : 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
          {icon} {category}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {checkedInCat}/{totalInCat} {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderTop: 'none', borderRadius: '0 0 10px 10px',
          overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, width: '40%' }}>
                  Item
                </th>
                {families.map(f => (
                  <th key={f.familyId} style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                    {f.name}
                  </th>
                ))}
                <th style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                  Mode
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ChecklistItemRow
                  key={item.itemId}
                  item={item}
                  families={families}
                  currentUser={currentUser}
                  currentFamilyId={currentFamilyId}
                  onToggleCheck={onToggleCheck}
                  onToggleLock={onToggleLock}
                  onSetMode={onSetMode}
                />
              ))}
            </tbody>
          </table>

          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {addingItem ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddItem()
                    if (e.key === 'Escape') setAddingItem(false)
                  }}
                  placeholder="Item name…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 7, padding: '6px 10px',
                    color: '#fff', fontSize: 13,
                  }}
                />
                <button onClick={handleAddItem} style={{ background: 'rgba(52,168,83,0.2)', border: '1px solid rgba(52,168,83,0.4)', borderRadius: 7, padding: '6px 12px', color: '#6ed48a', fontSize: 12, cursor: 'pointer' }}>
                  Add
                </button>
                <button onClick={() => setAddingItem(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: '2px 0' }}
              >
                + Add item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run integration tests — all still pass**

```
npx vitest run tests/integration/checklist.test.jsx --reporter=verbose
```

Expected: 7 passed, 0 failed.

- [ ] **Step 4: Commit**

```
git add src/components/ChecklistTab.jsx src/components/ChecklistCategory.jsx
git commit -m "refactor: wire per-user uid+displayName through ChecklistTab handlers; remove lockItem"
```

---

## Task 3 — Write failing unit tests for `ChecklistItemRow`

**Files:**
- Modify: `tests/unit/ChecklistItemRow.test.jsx`

Write all new tests first. They will fail because `ChecklistItemRow` still has the old logic.

---

- [ ] **Step 1: Replace `tests/unit/ChecklistItemRow.test.jsx` with the full new test suite**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChecklistItemRow from '../../src/components/ChecklistItemRow'

const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]
const currentUser     = { uid: 'u1', displayName: 'Girish' }
const currentFamilyId = 'fA'

// Helper: render a ChecklistItemRow inside a table (required by browser for valid HTML)
const wrap = (itemOverrides = {}, propOverrides = {}) => {
  const props = {
    item: {
      itemId: 'i1', name: 'Tent', category: 'Sleeping',
      mode: 'per-family', checks: {}, sharedCheck: null,
      modeOwnerUid: null, modeOwnerName: null,
      ...itemOverrides,
    },
    families,
    currentUser,
    currentFamilyId,
    onToggleCheck: vi.fn(),
    onToggleLock:  vi.fn(),
    onSetMode:     vi.fn(),
    ...propOverrides,
  }
  return render(<table><tbody><ChecklistItemRow {...props} /></tbody></table>)
}

describe('ChecklistItemRow', () => {

  // ── Basic rendering ───────────────────────────────────────────

  it('renders item name', () => {
    wrap()
    expect(screen.getByText('Tent')).toBeTruthy()
  })

  it('does NOT render an item-level lock prefix button (req 1)', () => {
    wrap()
    // The old item-level lock button had title="Lock item" / "Unlock item"
    expect(screen.queryByTitle('Lock item')).toBeNull()
    expect(screen.queryByTitle('Unlock item')).toBeNull()
  })

  // ── Per-family column restrictions (req 2) ────────────────────

  it('own family checkbox is enabled, other family checkbox is disabled', () => {
    wrap()
    const cbs = screen.getAllByRole('checkbox')
    expect(cbs[0].disabled).toBe(false)  // fA = currentFamilyId
    expect(cbs[1].disabled).toBe(true)   // fB = other family
  })

  // ── Uncheck ownership (req 3) ─────────────────────────────────

  it('own-family checkbox enabled when currentUser is the checker', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } } })
    const cbs = screen.getAllByRole('checkbox')
    expect(cbs[0].disabled).toBe(false)
  })

  it('own-family checkbox disabled when a DIFFERENT user in same family checked it (req 3)', () => {
    wrap({ checks: { fA: { checkedBy: 'u999', displayName: 'Other', lockedAt: null, lockedBy: null, lockedByName: null } } })
    const cbs = screen.getAllByRole('checkbox')
    expect(cbs[0].disabled).toBe(true)
  })

  // ── Lock / unlock ownership (req 4) ──────────────────────────

  it('check-lock-btn shows 🔓 when check is unlocked', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } } })
    expect(screen.getByTestId('check-lock-btn').textContent).toBe('🔓')
  })

  it('check-lock-btn shows 🔒 when check is locked', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Girish' } } })
    expect(screen.getByTestId('check-lock-btn').textContent).toBe('🔒')
  })

  it('checkbox disabled when check is locked regardless of who locked it', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Girish' } } })
    expect(screen.getAllByRole('checkbox')[0].disabled).toBe(true)
  })

  it('check-lock-btn enabled when currentUser is the locker (req 4)', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Girish' } } })
    expect(screen.getByTestId('check-lock-btn').disabled).toBe(false)
  })

  it('check-lock-btn disabled when a DIFFERENT user locked it (req 4)', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date(), lockedBy: 'u2', lockedByName: 'Bob' } } })
    expect(screen.getByTestId('check-lock-btn').disabled).toBe(true)
  })

  it('check-lock-btn enabled for locking when currentUser is the checker and not yet locked', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } } })
    expect(screen.getByTestId('check-lock-btn').disabled).toBe(false)
  })

  it('check-lock-btn disabled for locking when a different user checked (only checker can lock)', () => {
    wrap({ checks: { fA: { checkedBy: 'u999', displayName: 'Other', lockedAt: null, lockedBy: null, lockedByName: null } } })
    expect(screen.getByTestId('check-lock-btn').disabled).toBe(true)
  })

  it('shows checker displayName next to checkbox', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } } })
    expect(screen.getByText('Girish')).toBeTruthy()
  })

  // ── NA mode (req + new: full name on row and button) ─────────

  it('NA mode renders item name with strikethrough testid', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByTestId('item-name-na')).toBeTruthy()
  })

  it('NA mode shows modeOwnerName (full name) on the row', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByText('Girish')).toBeTruthy()
  })

  it('NA mode button label contains full name', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByTestId('mode-toggle').textContent).toContain('NA · Girish')
  })

  it('NA mode button is enabled for the owner', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(false)
  })

  it('NA mode button is disabled for a non-owner', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u999', modeOwnerName: 'Someone Else' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(true)
  })

  // ── Shared mode (req 5) ───────────────────────────────────────

  it('shared mode renders exactly one checkbox (spanning all families)', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getAllByRole('checkbox').length).toBe(1)
  })

  it('shared mode checkbox enabled for the modeOwner (req 5)', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByRole('checkbox').disabled).toBe(false)
  })

  it('shared mode checkbox disabled for a non-owner (req 5)', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u999', modeOwnerName: 'Other' })
    expect(screen.getByRole('checkbox').disabled).toBe(true)
  })

  it('shared mode button label contains full name', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Girish' })
    expect(screen.getByTestId('mode-toggle').textContent).toContain('SHARED · Girish')
  })

  // ── Mode toggle button — general ──────────────────────────────

  it('per-family mode button label is ↔ 🔀', () => {
    wrap()
    expect(screen.getByTestId('mode-toggle').textContent).toBe('↔ 🔀')
  })

  it('mode button enabled when no owner (per-family mode, anyone can toggle)', () => {
    wrap()
    expect(screen.getByTestId('mode-toggle').disabled).toBe(false)
  })

  it('mode button disabled when owned by another user', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u999', modeOwnerName: 'Other' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(true)
  })

  // ── Callback firing ───────────────────────────────────────────

  it('calls onToggleCheck with familyId and current checked state when own checkbox clicked', () => {
    const onToggleCheck = vi.fn()
    wrap({}, { onToggleCheck })
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onToggleCheck).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'fA', false
    )
  })

  it('calls onToggleLock when check-lock-btn clicked by the checker (locking)', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null, lockedBy: null, lockedByName: null } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByTestId('check-lock-btn'))
    expect(onToggleLock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'fA', false
    )
  })

  it('does NOT call onToggleLock when check-lock-btn clicked by a non-locker', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date(), lockedBy: 'u2', lockedByName: 'Bob' } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByTestId('check-lock-btn'))
    expect(onToggleLock).not.toHaveBeenCalled()
  })

  it('calls onSetMode with next mode when mode button clicked by an owner', () => {
    const onSetMode = vi.fn()
    wrap({}, { onSetMode })
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(onSetMode).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'shared'
    )
  })

  it('does NOT call onSetMode when mode button is disabled (non-owner)', () => {
    const onSetMode = vi.fn()
    wrap({ mode: 'shared', modeOwnerUid: 'u999', modeOwnerName: 'Other' }, { onSetMode })
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(onSetMode).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run unit tests — expect multiple failures**

```
npx vitest run tests/unit/ChecklistItemRow.test.jsx --reporter=verbose
```

Expected: Several tests FAIL — notably the "does NOT render item-level lock prefix button", "own-family checkbox disabled when DIFFERENT user checked", "check-lock-btn disabled when different user locked", NA full name tests, shared ownership tests.

---

## Task 4 — Rewrite `ChecklistItemRow.jsx` to make all tests pass

**Files:**
- Modify: `src/components/ChecklistItemRow.jsx`

---

- [ ] **Step 1: Replace `src/components/ChecklistItemRow.jsx` with the new ownership implementation**

```jsx
// src/components/ChecklistItemRow.jsx

const MODE_NEXT  = { 'per-family': 'shared', 'shared': 'na', 'na': 'per-family' }
const MODE_LABEL = { 'per-family': '↔', 'shared': 'SHARED', 'na': 'NA' }

const cell = (extra = {}) => ({
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  verticalAlign: 'middle',
  ...extra,
})

export default function ChecklistItemRow({
  item, families, currentUser, currentFamilyId,
  onToggleCheck, onToggleLock, onSetMode,
}) {
  const isNA     = item.mode === 'na'
  const isShared = item.mode === 'shared'

  // ── Mode ownership ────────────────────────────────────────────
  // modeOwnerUid is null for per-family (anyone can toggle).
  // For shared/na it is set to the uid of whoever toggled.
  const modeOwned     = !!item.modeOwnerUid
  const modeIsMe      = item.modeOwnerUid === currentUser.uid
  const modeCanToggle = !modeOwned || modeIsMe
  const modeLabel     = (isShared || isNA) && item.modeOwnerName
    ? `${MODE_LABEL[item.mode]} · ${item.modeOwnerName}`
    : MODE_LABEL[item.mode]

  // ── Shared check helpers ──────────────────────────────────────
  const sc               = item.sharedCheck
  const sharedChecked    = !!sc
  const sharedCheckLocked = sharedChecked && !!sc.lockedAt
  // Only the mode owner can interact with the shared checkbox.
  // Unchecking: owner AND must be the same person who checked (they always are in practice).
  const sharedCanAct = modeIsMe && !sc?.lockedAt && (!sc || sc.checkedBy === currentUser.uid)
  // Lock: only the checker (= owner) can lock while unlocked.
  // Unlock: only the person who locked can unlock (fall back to checker for legacy data without lockedBy).
  const sharedCanLock    = !!sc && !sc.lockedAt && sc.checkedBy === currentUser.uid
  const sharedCanUnlock  = !!sc && !!sc.lockedAt && (sc.lockedBy ?? sc.checkedBy) === currentUser.uid
  const sharedLockCanAct = sharedCanLock || sharedCanUnlock

  // ── Per-family check helpers ──────────────────────────────────
  // familyCanAct: can the current user interact with a given family's checkbox?
  //   - Not your column → no.
  //   - Unchecked → yes (any family member can check).
  //   - Locked → no (nobody can change a locked check).
  //   - Checked + unlocked → only the person who checked can uncheck (req 3).
  const familyCanAct = (familyId) => {
    if (familyId !== currentFamilyId) return false
    const ch = item.checks?.[familyId]
    if (!ch) return true
    if (ch.lockedAt) return false
    return ch.checkedBy === currentUser.uid
  }

  return (
    <tr>
      {/* Item name — item-level lock button removed (req 1) */}
      <td style={cell({ color: isNA ? 'var(--text-dim)' : 'var(--text-primary)', fontSize: 13 })}>
        {isNA
          ? <span data-testid="item-name-na" style={{ textDecoration: 'line-through' }}>{item.name}</span>
          : item.name
        }
      </td>

      {/* NA: single cell spanning all family columns, shows toggler's full name */}
      {isNA && (
        <td colSpan={families.length} style={cell({ color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 })}>
          <span style={{ textDecoration: 'line-through' }}>── NA ──</span>
          {item.modeOwnerName && (
            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
              {item.modeOwnerName}
            </span>
          )}
        </td>
      )}

      {/* Shared: single checkbox spanning all family columns */}
      {isShared && (
        <td colSpan={families.length} style={cell({ textAlign: 'center' })}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={sharedChecked}
              disabled={!sharedCanAct}
              onChange={() => onToggleCheck(item, null, sharedChecked)}
              style={{ width: 16, height: 16, cursor: sharedCanAct ? 'pointer' : 'not-allowed' }}
            />
            {sharedChecked && (
              <>
                <button
                  data-testid="check-lock-btn"
                  onClick={() => sharedLockCanAct && onToggleLock(item, null, sharedCheckLocked)}
                  disabled={!sharedLockCanAct}
                  style={{
                    background: 'none', border: 'none', fontSize: 14,
                    cursor: sharedLockCanAct ? 'pointer' : 'default',
                  }}
                >
                  {sharedCheckLocked ? '🔒' : '🔓'}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sc.displayName}</span>
              </>
            )}
          </div>
        </td>
      )}

      {/* Per-family: one checkbox per family */}
      {!isNA && !isShared && families.map(f => {
        const ch            = item.checks?.[f.familyId]
        const isChecked     = !!ch
        const isCheckLocked = isChecked && !!ch.lockedAt
        const canAct        = familyCanAct(f.familyId)
        // Lock: only the checker can lock an unlocked check.
        // Unlock: only the locker can unlock (fall back to checker for legacy data).
        const canLock    = isChecked && !ch.lockedAt && ch.checkedBy === currentUser.uid
        const canUnlock  = isChecked && !!ch.lockedAt && (ch.lockedBy ?? ch.checkedBy) === currentUser.uid
        const lockCanAct = canLock || canUnlock

        return (
          <td key={f.familyId} style={cell({ textAlign: 'center' })}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!canAct}
                onChange={() => canAct && onToggleCheck(item, f.familyId, isChecked)}
                style={{ width: 16, height: 16, cursor: canAct ? 'pointer' : 'not-allowed' }}
              />
              {isChecked && (
                <>
                  <button
                    data-testid="check-lock-btn"
                    onClick={() => lockCanAct && onToggleLock(item, f.familyId, isCheckLocked)}
                    disabled={!lockCanAct}
                    style={{
                      background: 'none', border: 'none', fontSize: 13,
                      cursor: lockCanAct ? 'pointer' : 'default',
                    }}
                  >
                    {isCheckLocked ? '🔒' : '🔓'}
                  </button>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {ch.displayName}
                  </span>
                </>
              )}
            </div>
          </td>
        )
      })}

      {/* Mode toggle — shows full name when owned; disabled for non-owners */}
      <td style={cell({ textAlign: 'right', whiteSpace: 'nowrap' })}>
        <button
          data-testid="mode-toggle"
          onClick={() => modeCanToggle && onSetMode(item, MODE_NEXT[item.mode])}
          disabled={!modeCanToggle}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
            color: isNA ? 'var(--text-dim)' : isShared ? '#4285F4' : 'var(--text-muted)',
            fontSize: 10,
            cursor: modeCanToggle ? 'pointer' : 'not-allowed',
            opacity: modeCanToggle ? 1 : 0.5,
          }}
        >
          {modeLabel} 🔀
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Run unit tests — all should pass**

```
npx vitest run tests/unit/ChecklistItemRow.test.jsx --reporter=verbose
```

Expected: 30 passed, 0 failed.

- [ ] **Step 3: Run full test suite to confirm no regressions**

```
npx vitest run tests/unit tests/integration --reporter=verbose
```

Expected: All tests pass. Note: any test that previously asserted on `screen.getAllByText('🔓').length >= 2` (expecting both the item-level lock and the check-level lock) will now pass with just the check-level lock remaining.

- [ ] **Step 4: Commit**

```
git add src/components/ChecklistItemRow.jsx tests/unit/ChecklistItemRow.test.jsx
git commit -m "feat: per-user checklist ownership — remove item lock, full names on NA/shared/mode button"
```

---

## Final Verification

- [ ] **Run the complete test suite one last time**

```
npx vitest run --reporter=verbose 2>&1 | tail -10
```

Expected output ends with: `Test Files  X passed` and `Tests  Y passed` — 0 failed.

- [ ] **Confirm these specific behaviours are tested:**
  - `onLockItem` / `lockItem` no longer referenced anywhere ✓
  - `toggleLock` called with 7 args (tripId, itemId, mode, familyId, isLocked, uid, displayName) ✓
  - `setMode` called with 5 args (tripId, itemId, newMode, uid, displayName) ✓
  - Different-user-same-family cannot uncheck (req 3) ✓
  - Different user cannot unlock (req 4) ✓
  - Non-owner cannot interact with shared checkbox (req 5) ✓
  - NA row and mode button show full name ✓
