# Day-wise Itinerary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a day-tabbed itinerary view where trip members can add activities per day, and planned meals are automatically interleaved into each day's timeline.

**Architecture:** Four new files (`itinerary.js`, `ActivityCard.jsx`, `ActivityEditForm.jsx`, `ItineraryTab.jsx`) follow the same patterns as the existing Expenses and Meals tabs — `onSnapshot` subscriptions in the orchestrator, pure client-side merging, no Cloud Functions. Activities store an ISO date string (`"YYYY-MM-DD"`) instead of a day index for calendar resilience. Meals are merged from the existing `subscribeMeals` subscription using `SLOT_TIMES` for sort order.

**Tech Stack:** React 18, Firebase Firestore (`onSnapshot`, `addDoc`, `updateDoc`, `deleteDoc`), Vitest + React Testing Library, inline CSS with CSS variables.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/itinerary.js` | Create | Firestore CRUD for activities |
| `src/components/ActivityCard.jsx` | Create | Single card: activity or meal variant |
| `src/components/ActivityEditForm.jsx` | Create | Add/edit popover for activities |
| `src/components/ItineraryTab.jsx` | Create | Orchestrator: subscriptions, merge, day tabs |
| `src/pages/TripPage.jsx` | Modify | Unlock Itinerary tab, mount `ItineraryTab` |
| `tests/unit/itinerary.test.js` | Create | Unit tests for Firestore utils |
| `tests/unit/ActivityCard.test.jsx` | Create | Unit tests for ActivityCard |
| `tests/unit/ActivityEditForm.test.jsx` | Create | Unit tests for ActivityEditForm |
| `tests/integration/itinerary.test.jsx` | Create | Integration tests for ItineraryTab |

---

## Task 1: Firestore Utilities

**Files:**
- Create: `src/utils/itinerary.js`
- Create: `tests/unit/itinerary.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/itinerary.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import {
  subscribeActivities, addActivity, updateActivity, deleteActivity,
} from '../../src/utils/itinerary'

const TRIP_ID = 'trip1'

describe('itinerary Firestore utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeActivities calls onSnapshot on the activities collection', () => {
    const cb = vi.fn()
    subscribeActivities(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('subscribeActivities sorts activities by time ascending', () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, fn) => {
      fn({
        docs: [
          { id: 'a2', data: () => ({ title: 'Dinner', time: '19:00', date: '2026-04-05', icon: '🍽️', createdBy: 'u1' }) },
          { id: 'a1', data: () => ({ title: 'Hike',   time: '09:00', date: '2026-04-05', icon: '🥾', createdBy: 'u1' }) },
        ],
      })
      return vi.fn()
    })
    const cb = vi.fn()
    subscribeActivities(TRIP_ID, cb)
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ activityId: 'a1', time: '09:00' }),
      expect.objectContaining({ activityId: 'a2', time: '19:00' }),
    ])
  })

  it('addActivity calls addDoc with correct fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'act1' })
    await addActivity(TRIP_ID, {
      title: 'Hike', time: '09:00', date: '2026-04-05',
      location: 'Blue Ridge', notes: '', assignedTo: null, icon: '🥾', createdBy: 'u1',
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Hike', time: '09:00', date: '2026-04-05',
        icon: '🥾', createdBy: 'u1', createdAt: expect.anything(),
      })
    )
  })

  it('updateActivity calls updateDoc', async () => {
    await updateActivity(TRIP_ID, 'act1', { title: 'Updated hike' })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { title: 'Updated hike' }
    )
  })

  it('deleteActivity calls deleteDoc', async () => {
    await deleteActivity(TRIP_ID, 'act1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/itinerary.test.js
```

Expected: FAIL — `Cannot find module '../../src/utils/itinerary'`

- [ ] **Step 3: Implement `src/utils/itinerary.js`**

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
    createdAt: serverTimestamp(),
  })
}

export async function updateActivity(tripId, activityId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'activities', activityId), changes)
}

export async function deleteActivity(tripId, activityId) {
  return deleteDoc(doc(db, 'trips', tripId, 'activities', activityId))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/itinerary.test.js
```

Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/itinerary.js tests/unit/itinerary.test.js
git commit -m "feat: add itinerary Firestore utils with unit tests"
```

---

## Task 2: ActivityCard Component

**Files:**
- Create: `src/components/ActivityCard.jsx`
- Create: `tests/unit/ActivityCard.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/ActivityCard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityCard from '../../src/components/ActivityCard'

const mockUser = { uid: 'u1' }

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
  createdBy: 'u1',
}

const mockMeal = {
  mealId: 'm1',
  dish: 'Pancakes',
  slot: 'breakfast',
  assignedTo: { type: 'everyone', label: 'Everyone' },
}

describe('ActivityCard — activity variant', () => {
  it('renders with data-testid activity-card-{activityId}', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
  })

  it('shows icon, title, and formatted time', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('🥾')).toBeTruthy()
    expect(screen.getByText('Hike to waterfall')).toBeTruthy()
    expect(screen.getByText(/9:00 AM/)).toBeTruthy()
  })

  it('shows location when present', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Blue Ridge Trail/)).toBeTruthy()
  })

  it('shows edit and delete buttons for own activity', () => {
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    expect(screen.getByTestId('delete-btn-a1')).toBeTruthy()
  })

  it('hides edit and delete buttons for another user\'s activity', () => {
    const otherActivity = { ...mockActivity, createdBy: 'u2' }
    render(<ActivityCard item={otherActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByTestId('edit-btn-a1')).toBeNull()
    expect(screen.queryByTestId('delete-btn-a1')).toBeNull()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(onEdit).toHaveBeenCalledWith(mockActivity)
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ActivityCard item={mockActivity} type="activity" user={mockUser} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('delete-btn-a1'))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })
})

describe('ActivityCard — meal variant', () => {
  it('renders with data-testid meal-card-itinerary-{mealId}', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('shows slot name and dish', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Breakfast/)).toBeTruthy()
    expect(screen.getByText(/Pancakes/)).toBeTruthy()
  })

  it('shows "from Meals tab" label', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/from Meals tab/)).toBeTruthy()
  })

  it('has no edit or delete buttons', () => {
    render(<ActivityCard item={mockMeal} type="meal" user={mockUser} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('✏️')).toBeNull()
    expect(screen.queryByText('🗑')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/ActivityCard.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/components/ActivityCard'`

- [ ] **Step 3: Implement `src/components/ActivityCard.jsx`**

```jsx
function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function ActivityCard({ item, type, user, onEdit, onDelete }) {
  if (type === 'meal') {
    const slotLabel = item.slot[0].toUpperCase() + item.slot.slice(1)
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

  const isOwn = item.createdBy === user?.uid
  return (
    <div
      data-testid={`activity-card-${item.activityId}`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '10px 12px',
      }}
    >
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
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/ActivityCard.test.jsx
```

Expected: 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityCard.jsx tests/unit/ActivityCard.test.jsx
git commit -m "feat: add ActivityCard component with unit tests"
```

---

## Task 3: ActivityEditForm Component

**Files:**
- Create: `src/components/ActivityEditForm.jsx`
- Create: `tests/unit/ActivityEditForm.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/ActivityEditForm.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ActivityEditForm from '../../src/components/ActivityEditForm'

const mockFamilies = [
  { familyId: 'fA', name: 'Sharma family' },
  { familyId: 'fB', name: 'Johnson family' },
]

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
}

describe('ActivityEditForm', () => {
  it('renders with data-testid activity-edit-form', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('activity-edit-form')).toBeTruthy()
  })

  it('save button is disabled when title is empty', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    const saveBtn = screen.getByTestId('form-save')
    expect(saveBtn.style.opacity).toBe('0.5')
  })

  it('save button enables when title and time are filled', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),  { target: { value: '09:00' } })
    expect(screen.getByTestId('form-save').style.opacity).toBe('1')
  })

  it('calls onSave with correct fields when submitted', async () => {
    const onSave = vi.fn()
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('form-title'),    { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),     { target: { value: '09:00' } })
    fireEvent.change(screen.getByTestId('form-location'), { target: { value: 'Trail' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Hike',
      time: '09:00',
      location: 'Trail',
      icon: expect.any(String),
    }))
  })

  it('pre-fills fields when editing an existing activity', () => {
    render(<ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('form-title').value).toBe('Hike to waterfall')
    expect(screen.getByTestId('form-time').value).toBe('09:00')
    expect(screen.getByTestId('form-location').value).toBe('Blue Ridge Trail')
  })

  it('shows delete button only in edit mode', () => {
    const { rerender } = render(
      <ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.queryByTestId('form-delete')).toBeNull()

    rerender(
      <ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByTestId('form-delete')).toBeTruthy()
  })

  it('calls onDelete with activityId when delete clicked', async () => {
    const onDelete = vi.fn()
    render(<ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />)
    await act(async () => { fireEvent.click(screen.getByTestId('form-delete')) })
    expect(onDelete).toHaveBeenCalledWith('a1')
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders icon picker buttons', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('icon-btn-🥾')).toBeTruthy()
    expect(screen.getByTestId('icon-btn-🚗')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/ActivityEditForm.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/components/ActivityEditForm'`

- [ ] **Step 3: Implement `src/components/ActivityEditForm.jsx`**

```jsx
import { useState } from 'react'

const PRESET_ICONS = ['🥾', '🚗', '🏖', '⛺', '🎿', '🏊', '🎢', '🎭', '🛍', '🎵', '🏔', '🏕']

export default function ActivityEditForm({ activity, families, onSave, onDelete, onClose }) {
  const isEdit = !!activity?.activityId

  const [icon,       setIcon]       = useState(activity?.icon       ?? PRESET_ICONS[0])
  const [title,      setTitle]      = useState(activity?.title      ?? '')
  const [time,       setTime]       = useState(activity?.time       ?? '')
  const [location,   setLocation]   = useState(activity?.location   ?? '')
  const [notes,      setNotes]      = useState(activity?.notes      ?? '')
  const [assignedTo, setAssignedTo] = useState(activity?.assignedTo ?? '')

  const isValid = title.trim() && time

  async function handleSave() {
    if (!isValid) return
    await onSave({
      icon,
      title: title.trim(),
      time,
      location: location.trim() || null,
      notes: notes.trim() || null,
      assignedTo: assignedTo || null,
    })
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 10, color: '#7a9ab8', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.4px',
  }

  return (
    <div
      data-testid="activity-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={labelStyle}>Icon</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PRESET_ICONS.map(emoji => (
          <button
            key={emoji}
            data-testid={`icon-btn-${emoji}`}
            onClick={() => setIcon(emoji)}
            style={{
              background: icon === emoji ? 'rgba(66,133,244,0.3)' : 'rgba(255,255,255,0.06)',
              border: icon === emoji ? '1px solid rgba(66,133,244,0.6)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '4px 6px', cursor: 'pointer', fontSize: 16,
            }}
          >{emoji}</button>
        ))}
      </div>

      <div style={labelStyle}>Title</div>
      <input
        data-testid="form-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Hike to waterfall"
        style={inputStyle}
        autoFocus
      />

      <div style={labelStyle}>Time</div>
      <input
        data-testid="form-time"
        type="time"
        value={time}
        onChange={e => setTime(e.target.value)}
        style={inputStyle}
      />

      <div style={labelStyle}>Location <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <input
        data-testid="form-location"
        value={location}
        onChange={e => setLocation(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Blue Ridge Trail"
        style={inputStyle}
      />

      <div style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <textarea
        data-testid="form-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Any details…"
        rows={2}
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      <div style={labelStyle}>Assigned to <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <select
        data-testid="form-assigned-to"
        value={assignedTo}
        onChange={e => setAssignedTo(e.target.value)}
        style={inputStyle}
      >
        <option value="">No assignment</option>
        {families.map(f => (
          <option key={f.familyId} value={f.familyId}>{f.name}</option>
        ))}
      </select>

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
          {isEdit ? 'Save' : 'Add activity'}
        </button>
        {isEdit && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(activity.activityId)}
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/ActivityEditForm.test.jsx
```

Expected: 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityEditForm.jsx tests/unit/ActivityEditForm.test.jsx
git commit -m "feat: add ActivityEditForm component with unit tests"
```

---

## Task 4: ItineraryTab Orchestrator

**Files:**
- Create: `src/components/ItineraryTab.jsx`
- Create: `tests/integration/itinerary.test.jsx`

- [ ] **Step 1: Write failing integration tests**

Create `tests/integration/itinerary.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ItineraryTab from '../../src/components/ItineraryTab'
import * as itineraryUtils from '../../src/utils/itinerary'
import * as mealsUtils from '../../src/utils/meals'
import * as firestoreUtils from '../../src/utils/firestore'

// Trip: Apr 5–7, 2026 (3 days). Today (2026-04-03) is before start → defaults to Day 1.
const mockTrip = {
  tripId: 'trip1',
  startDate: new Date(2026, 3, 5),  // Apr 5
  endDate:   new Date(2026, 3, 7),  // Apr 7
}
const mockUser = { uid: 'u1', displayName: 'Test User' }

const mockActivities = [
  { activityId: 'a1', title: 'Hike', time: '09:00', date: '2026-04-05', icon: '🥾', location: 'Trail', notes: null, assignedTo: null, createdBy: 'u1' },
  { activityId: 'a2', title: 'Museum', time: '14:00', date: '2026-04-06', icon: '🎭', location: null, notes: null, assignedTo: null, createdBy: 'u2' },
]

// Meal on day 0 = Apr 5
const mockMeals = [
  { mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0, assignedTo: { type: 'everyone', label: 'Everyone' }, ingredients: [] },
]

const mockFamilies = [
  { familyId: 'fA', name: 'Sharma family' },
]

describe('ItineraryTab integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue([])
    vi.spyOn(itineraryUtils, 'addActivity').mockResolvedValue({ id: 'new-act' })
    vi.spyOn(itineraryUtils, 'updateActivity').mockResolvedValue()
    vi.spyOn(itineraryUtils, 'deleteActivity').mockResolvedValue()
  })

  it('renders itinerary-tab', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('itinerary-tab')).toBeTruthy()
  })

  it('renders day tabs for each trip day', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('day-tab-2026-04-05')).toBeTruthy()
    expect(screen.getByTestId('day-tab-2026-04-06')).toBeTruthy()
    expect(screen.getByTestId('day-tab-2026-04-07')).toBeTruthy()
  })

  it('defaults to Day 1 when today is outside the trip range', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Day 1 tab should be active (blue style applied)
    const tab = screen.getByTestId('day-tab-2026-04-05')
    expect(tab.style.background).toContain('rgba(66,133,244')
  })

  it('shows empty state when no activities for the selected day', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByText(/No activities planned/)).toBeTruthy()
  })

  it('shows activity card for the selected day', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Day 1 selected by default — a1 is on Apr 5
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
    // a2 is on Apr 6 — should not appear
    expect(screen.queryByTestId('activity-card-a2')).toBeNull()
  })

  it('shows meal card for the selected day interleaved', () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb(mockMeals)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Meal on day 0 = Apr 5 = Day 1 (selected by default)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('does not show meals for other days', () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb(mockMeals)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Switch to Day 2 (Apr 6) — meal m1 is on Apr 5, should disappear
    fireEvent.click(screen.getByTestId('day-tab-2026-04-06'))
    expect(screen.queryByTestId('meal-card-itinerary-m1')).toBeNull()
  })

  it('opens add form when "+ Add Activity" is clicked', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('add-activity-btn'))
    expect(screen.getByTestId('activity-edit-form')).toBeTruthy()
  })

  it('calls addActivity with correct date when form submitted', async () => {
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-activity-btn'))
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),  { target: { value: '09:00' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(itineraryUtils.addActivity).toHaveBeenCalledWith('trip1', expect.objectContaining({
      title: 'Hike',
      time: '09:00',
      date: '2026-04-05',
      createdBy: 'u1',
    }))
  })

  it('shows edit/delete buttons only for own activities', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // a1 belongs to u1 — buttons visible
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    // Switch to Day 2 to see a2 (belongs to u2)
    fireEvent.click(screen.getByTestId('day-tab-2026-04-06'))
    expect(screen.queryByTestId('edit-btn-a2')).toBeNull()
  })

  it('calls deleteActivity when delete button clicked', async () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    await act(async () => { fireEvent.click(screen.getByTestId('delete-btn-a1')) })
    expect(itineraryUtils.deleteActivity).toHaveBeenCalledWith('trip1', 'a1')
  })

  it('clicking edit opens form pre-filled with activity data', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(screen.getByTestId('form-title').value).toBe('Hike')
    expect(screen.getByTestId('form-time').value).toBe('09:00')
  })

  it('calls updateActivity when edit form saved', async () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike Updated' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(itineraryUtils.updateActivity).toHaveBeenCalledWith('trip1', 'a1', expect.objectContaining({
      title: 'Hike Updated',
    }))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/integration/itinerary.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/components/ItineraryTab'`

- [ ] **Step 3: Implement `src/components/ItineraryTab.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { subscribeActivities, addActivity, updateActivity, deleteActivity } from '../utils/itinerary'
import { subscribeMeals } from '../utils/meals'
import { getTripFamilies } from '../utils/firestore'
import ActivityCard from './ActivityCard'
import ActivityEditForm from './ActivityEditForm'

// Default times used for sorting meals by slot within the day
const SLOT_TIMES = { breakfast: '07:00', lunch: '12:00', snacks: '15:00', dinner: '19:00' }

function toLocalDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toISODate(localDate) {
  return [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, '0'),
    String(localDate.getDate()).padStart(2, '0'),
  ].join('-')
}

function tripDays(trip) {
  const start = toLocalDate(trip.startDate)
  const end   = toLocalDate(trip.endDate)
  const days  = []
  const cur   = new Date(start)
  while (cur <= end) {
    days.push(toISODate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function defaultSelectedDate(days) {
  const todayISO = toISODate(new Date())
  return days.includes(todayISO) ? todayISO : days[0]
}

function formatTabLabel(isoDate, index) {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Day ${index + 1} · ${formatted}`
}

function getMealDate(meal, trip) {
  const start = toLocalDate(trip.startDate)
  const mealDate = new Date(start)
  mealDate.setDate(mealDate.getDate() + meal.day)
  return toISODate(mealDate)
}

function buildMergedList(activities, meals, selectedDate, trip) {
  const dayActivities = activities
    .filter(a => a.date === selectedDate)
    .map(a => ({ ...a, _type: 'activity' }))

  const dayMeals = meals
    .filter(m => getMealDate(m, trip) === selectedDate)
    .map(m => ({ ...m, _type: 'meal', _sortTime: SLOT_TIMES[m.slot] ?? '12:00' }))

  return [...dayActivities, ...dayMeals].sort((a, b) => {
    const tA = a._type === 'activity' ? a.time : a._sortTime
    const tB = b._type === 'activity' ? b.time : b._sortTime
    return tA.localeCompare(tB)
  })
}

export default function ItineraryTab({ trip, user }) {
  const [activities,      setActivities]      = useState([])
  const [meals,           setMeals]           = useState([])
  const [families,        setFamilies]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [editingActivity, setEditingActivity] = useState(null)

  const days = tripDays(trip)
  const [selectedDate, setSelectedDate] = useState(() => defaultSelectedDate(days))

  useEffect(() => {
    const unsub1 = subscribeActivities(trip.tripId, items => {
      setActivities(items)
      setLoading(false)
    })
    const unsub2 = subscribeMeals(trip.tripId, setMeals)
    getTripFamilies(trip.tripId).then(setFamilies).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  async function handleSave(data) {
    try {
      if (editingActivity?.activityId) {
        await updateActivity(trip.tripId, editingActivity.activityId, data)
      } else {
        await addActivity(trip.tripId, { ...data, date: selectedDate, createdBy: user.uid })
      }
      setEditingActivity(null)
    } catch (err) {
      console.error('Failed to save activity:', err)
    }
  }

  async function handleDelete(activityId) {
    try {
      await deleteActivity(trip.tripId, activityId)
    } finally {
      setEditingActivity(null)
    }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading itinerary…
      </div>
    )
  }

  const mergedList = buildMergedList(activities, meals, selectedDate, trip)

  const tabStyle = (date) => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    border: selectedDate === date ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: selectedDate === date ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
    color: selectedDate === date ? '#7eb8f7' : '#7a9ab8',
    fontWeight: selectedDate === date ? 600 : 400,
  })

  return (
    <div data-testid="itinerary-tab">
      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {days.map((date, i) => (
          <div
            key={date}
            data-testid={`day-tab-${date}`}
            onClick={() => setSelectedDate(date)}
            style={tabStyle(date)}
          >
            {formatTabLabel(date, i)}
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          data-testid="add-activity-btn"
          onClick={() => setEditingActivity({})}
          style={{
            background: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.4)',
            borderRadius: 8, padding: '7px 14px', color: '#6ed48a',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add Activity
        </button>
      </div>

      {/* Activity list */}
      {mergedList.length === 0 ? (
        <div style={{ color: '#7a9ab8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
          No activities planned for this day — add the first one
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mergedList.map(item =>
            item._type === 'meal' ? (
              <ActivityCard
                key={`meal-${item.mealId}`}
                item={item}
                type="meal"
                user={user}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ) : (
              <ActivityCard
                key={`activity-${item.activityId}`}
                item={item}
                type="activity"
                user={user}
                onEdit={act => setEditingActivity(act)}
                onDelete={handleDelete}
              />
            )
          )}
        </div>
      )}

      {/* Edit form modal */}
      {editingActivity !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingActivity(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ActivityEditForm
              activity={editingActivity?.activityId ? editingActivity : null}
              families={families}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setEditingActivity(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/integration/itinerary.test.jsx
```

Expected: 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ItineraryTab.jsx tests/integration/itinerary.test.jsx
git commit -m "feat: add ItineraryTab orchestrator with integration tests"
```

---

## Task 5: Unlock Itinerary Tab in TripPage

**Files:**
- Modify: `src/pages/TripPage.jsx`

- [ ] **Step 1: Add import and unlock the tab**

In `src/pages/TripPage.jsx`, add the import after the ExpensesTab import (line 11):

```jsx
import ItineraryTab from '../components/ItineraryTab'
```

Change the `isAvailable` logic (line 67) from:

```jsx
const isAvailable = tab === 'Checklist' || tab === 'Meals' || tab === 'Expenses'
```

to:

```jsx
const isAvailable = true
```

Add the `ItineraryTab` mount below the `ExpensesTab` block (after line 99):

```jsx
{activeTab === 'Itinerary' && (
  <ItineraryTab trip={trip} user={user} />
)}
```

- [ ] **Step 2: Run the full test suite to verify nothing broke**

```bash
npx vitest run
```

Expected: All tests pass (no regressions)

- [ ] **Step 3: Commit**

```bash
git add src/pages/TripPage.jsx
git commit -m "feat: unlock Itinerary tab in TripPage and mount ItineraryTab"
```

---

## Done

All five tasks complete. The Itinerary tab is live with:
- Day tabs derived from trip dates, defaulting to today or Day 1
- Activities stored as ISO date strings, add/edit/delete with ownership guard
- Meals from the Meals tab interleaved by slot time, read-only
- TDD coverage across unit and integration tests
