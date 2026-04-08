# Checklist Ownership Redesign
**Date:** 2026-04-08  
**Status:** Approved for implementation  
**Approach:** C — Per-user ownership with full names

---

## Overview

Redesign the checklist interaction model so that every action (check, lock, mode toggle) is owned by the specific person who performed it — not just their family group. Full names replace family names everywhere ownership is displayed. The item-level lock button (the 🔒/🔓 prefix in front of the item name) is removed entirely.

---

## Requirements

| # | Requirement |
|---|---|
| 1 | Remove the lock emoji/button that appears in front of each item name |
| 2 | A family member can only check/uncheck items in their family's column |
| 3 | Only the person who checked an item can uncheck it |
| 4 | Only the person who locked a check can unlock it. While locked, no one can check/uncheck |
| 5 | When SHARED is toggled, only the person who toggled it gets check + lock functionality for that item. All others see the result but cannot interact |
| + | When NA is toggled, only the person who toggled it can toggle the mode back. Full name shown on the row and in the mode button |

---

## Data Model Changes

### 4 new Firestore fields — all on existing documents, no schema migration needed

#### On each check entry (`checks[familyId]` and `sharedCheck`)

Two new fields added when a check is locked:

```js
// Before (existing)
checks: {
  "family-abc": {
    checkedBy:   "alice-uid",
    displayName: "Alice Smith",
    lockedAt:    <Timestamp | null>,
  }
}

// After (new fields highlighted)
checks: {
  "family-abc": {
    checkedBy:     "alice-uid",      // existing — who checked
    displayName:   "Alice Smith",    // existing — shown next to checkbox
    lockedAt:      <Timestamp | null>, // existing
    lockedBy:      "bob-uid" | null, // NEW — uid of the person who locked
    lockedByName:  "Bob Smith" | null, // NEW — full name shown on lock icon tooltip / auth check
  }
}
```

Same two new fields apply to `sharedCheck`.

#### On the item document

Two new fields added when mode switches to `shared` or `na`:

```js
// Before (existing)
{
  mode: "shared" | "na" | "per-family",
  // ... other fields
}

// After
{
  mode: "shared" | "na" | "per-family",
  modeOwnerUid:  "alice-uid" | null,   // NEW — null when mode is per-family
  modeOwnerName: "Alice Smith" | null, // NEW — full name for display in toggle button and NA row
}
```

`modeOwnerUid` and `modeOwnerName` are set to `null` when mode returns to `per-family`.

---

## Ownership Rules

| Action | Who can perform it | Who can undo / change it | Display |
|---|---|---|---|
| **Check** | Any member of the assigned family | Only the person who checked (`checkedBy === currentUser.uid`) | `"Alice Smith"` next to checkbox |
| **Uncheck** | Only `checkedBy` person | — | Checkbox disabled for everyone else |
| **Lock check** | Only the person who checked (`checkedBy === currentUser.uid`) | Only the person who locked (`lockedBy === currentUser.uid`) | 🔒 greyed/disabled for all others |
| **Toggle mode → SHARED** | Any family member | Only `modeOwnerUid` person | `"SHARED · Alice Smith 🔀"` |
| **Toggle mode → NA** | Any family member | Only `modeOwnerUid` person | `"NA · Bob Smith 🔀"` + row label |
| **Toggle mode → per-family** | Only `modeOwnerUid` person | — | Clears `modeOwnerUid`, `modeOwnerName` |

---

## Component Changes

### 1. `src/utils/checklist.js`

#### `toggleCheck` — no signature change, behaviour clarified
- Writes `checkedBy`, `displayName` as before
- Initialises `lockedBy: null`, `lockedByName: null` on new check entry

#### `toggleLock` — new signature
```js
// Before
toggleLock(tripId, itemId, mode, familyId, isLocked)

// After
toggleLock(tripId, itemId, mode, familyId, isLocked, uid, displayName)
```
- On lock (`isLocked === false → locking`): writes `lockedAt: serverTimestamp()`, `lockedBy: uid`, `lockedByName: displayName`
- On unlock (`isLocked === true → unlocking`): writes `lockedAt: null`, `lockedBy: null`, `lockedByName: null`

#### `setMode` — new signature
```js
// Before
setMode(tripId, itemId, newMode)

// After
setMode(tripId, itemId, newMode, uid, displayName)
```
- When `newMode === 'shared'` or `'na'`: writes `modeOwnerUid: uid`, `modeOwnerName: displayName`
- When `newMode === 'per-family'`: writes `modeOwnerUid: null`, `modeOwnerName: null`
- Always clears `checks: {}` and `sharedCheck: null` as before

#### `lockItem` — **deleted**
Remove entirely. Item-level lock is gone.

---

### 2. `src/components/ChecklistItemRow.jsx`

#### Props removed
- `onLockItem` — deleted (no more item-level lock)

#### Item name cell — remove lock button
```jsx
// Before
<td>
  <button onClick={() => onLockItem(item)}>🔒</button>
  {item.name}
</td>

// After
<td>{item.name}</td>   // or strikethrough span when NA
```

#### `familyCanAct` — updated logic
```js
// Before: allowed any family member to uncheck if not locked
const familyCanAct = (familyId) => {
  if (isLocked) return false                     // ← item-level lock, REMOVED
  if (familyId !== currentFamilyId) return false
  const ch = item.checks?.[familyId]
  if (!ch) return true
  if (!ch.lockedAt) return true
  return ch.checkedBy === currentUser.uid
}

// After: uncheck requires same user who checked; lock blocks all
const familyCanAct = (familyId) => {
  if (familyId !== currentFamilyId) return false  // not your column
  const ch = item.checks?.[familyId]
  if (!ch) return true                             // unchecked — anyone in family can check
  if (ch.lockedAt) return false                   // check-locked — nobody can change
  return ch.checkedBy === currentUser.uid          // checked — only checker can uncheck
}
```

#### Per-family lock button — updated auth check
```jsx
// Before
onClick={() => ch.checkedBy === currentUser.uid && onToggleLock(...)}
disabled={ch.checkedBy !== currentUser.uid}

// After — lock: only checker can lock; unlock: only locker can unlock
const canLock   = !ch.lockedAt && ch.checkedBy === currentUser.uid
const canUnlock = !!ch.lockedAt && ch.lockedBy === currentUser.uid
const lockCanAct = canLock || canUnlock

onClick={() => lockCanAct && onToggleLock(item, f.familyId, isCheckLocked)}
disabled={!lockCanAct}
```

#### Shared mode — `sharedCanAct`
```js
// Before
const sharedCanAct = !isLocked && (!sharedCheckLocked || sc.checkedBy === currentUser.uid)

// After
const modeIsOwned  = item.modeOwnerUid === currentUser.uid
const sharedCanCheck  = modeIsOwned && !sc                                  // owner can check
const sharedCanUncheck = modeIsOwned && !!sc && !sc.lockedAt
                        && sc.checkedBy === currentUser.uid                  // checker can uncheck
const sharedCanAct    = sharedCanCheck || sharedCanUncheck

// Lock button on shared check
const sharedCanLock   = !!sc && !sc.lockedAt && sc.checkedBy === currentUser.uid
const sharedCanUnlock = !!sc && !!sc.lockedAt && sc.lockedBy  === currentUser.uid
```

#### NA rows — show full name
```jsx
// Before
{isNA && families.map(f => <td>──</td>)}

// After — single cell spanning all family columns, shows toggler's name
{isNA && (
  <td colSpan={families.length} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
    <span style={{ textDecoration: 'line-through' }}>──&nbsp;NA&nbsp;──</span>
    {item.modeOwnerName && (
      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
        {item.modeOwnerName}
      </span>
    )}
  </td>
)}
```

#### Mode toggle button — show full name when owned
```jsx
// Before
<button onClick={() => !isLocked && onSetMode(item, MODE_NEXT[item.mode])}>
  {MODE_LABEL[item.mode]} 🔀
</button>

// After
const modeOwned     = !!item.modeOwnerUid
const modeIsMe      = item.modeOwnerUid === currentUser.uid
const modeCanToggle = !modeOwned || modeIsMe   // per-family: anyone; shared/na: only owner

const modeLabel = (item.mode === 'shared' || item.mode === 'na') && item.modeOwnerName
  ? `${MODE_LABEL[item.mode]} · ${item.modeOwnerName}`
  : MODE_LABEL[item.mode]

<button
  onClick={() => modeCanToggle && onSetMode(item, MODE_NEXT[item.mode])}
  disabled={!modeCanToggle}
>
  {modeLabel} 🔀
</button>
```

---

### 3. `src/components/ChecklistTab.jsx`

#### `handleToggleLock` — pass uid and displayName
```js
// Before
const handleToggleLock = (item, familyId, isLocked) => {
  toggleLock(trip.tripId, item.itemId, item.mode, familyId, isLocked)
}

// After
const handleToggleLock = (item, familyId, isLocked) => {
  toggleLock(trip.tripId, item.itemId, item.mode, familyId, isLocked, user.uid, user.displayName)
}
```

#### `handleSetMode` — pass uid and displayName
```js
// Before
const handleSetMode = (item, newMode) => {
  setMode(trip.tripId, item.itemId, newMode)
}

// After
const handleSetMode = (item, newMode) => {
  setMode(trip.tripId, item.itemId, newMode, user.uid, user.displayName)
}
```

#### Remove `handleLockItem` and `onLockItem` prop
```js
// Delete entirely:
const handleLockItem = (item) => { lockItem(trip.tripId, item.itemId, !!item.locked) }

// Remove from ChecklistCategory props:
// onLockItem={handleLockItem}   ← delete this line
```

---

### 4. `src/components/ChecklistCategory.jsx`

- Remove `onLockItem` from props and from the pass-through to `ChecklistItemRow`

---

## Visual Summary

```
Per-family row (2 families, logged in as Alice Smith):

 Item Name        │ Smith (you)                     │ Jones            │ Mode
─────────────────────────────────────────────────────────────────────────────────
 Sunscreen        │ ☑ 🔓 Alice Smith                │ ☐ (disabled)     │ ↔ 🔀
 Tent             │ ☑ 🔒 Bob Smith  (disabled)      │ ☐ (disabled)     │ ↔ 🔀
                  │   ↑ Bob locked — Alice can't    │                  │
                  │     unlock                      │                  │
─────────────────────────────────────────────────────────────────────────────────

Shared row (Alice toggled SHARED):

 Item Name        │ Everyone         │ Mode
───────────────────────────────────────────────────────────────
 Camp Firewood    │ ☑ 🔓 Alice Smith │ SHARED · Alice Smith 🔀
───────────────────────────────────────────────────────────────

NA row (Bob toggled NA):

 Item Name        │ ── NA ── Bob Smith              │ NA · Bob Smith 🔀
  (strikethrough) │ (spans all family columns)      │ (disabled for Alice)
```

---

## Files Changed

| File | Change type |
|---|---|
| `src/utils/checklist.js` | Update `toggleLock`, `setMode` signatures; delete `lockItem` |
| `src/components/ChecklistItemRow.jsx` | Remove item-lock button; update all ownership logic; NA full name; mode button full name |
| `src/components/ChecklistTab.jsx` | Update handler signatures; remove `handleLockItem` |
| `src/components/ChecklistCategory.jsx` | Remove `onLockItem` prop pass-through |
| `tests/unit/ChecklistItemRow.test.jsx` | Update/add tests for new ownership rules |
| `tests/integration/checklist.test.jsx` | Update/add integration tests for `toggleLock`, `setMode` |

---

## Out of Scope

- Firestore security rules (enforcement is client-side only, consistent with current app)
- Migrating existing locked items in production (new fields default to `null` / absent — existing items degrade gracefully: no locker name shown, unlock allowed by checker as before)
- Removing the `locked` (item-level) field from existing Firestore documents — field is ignored, not deleted
