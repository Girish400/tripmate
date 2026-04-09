# Spec: Meals, Expenses & Itinerary — Lock/Unlock + Auto-Populate
**Date:** 2026-04-08
**Status:** Approved

---

## Overview

Five related enhancements across the Meals, Expenses, and Itinerary tabs:

1. Meal form "Responsible" field — replace free-form text with auto-populated flat dropdown
2. Expense cards — add lock/unlock button; hide edit/delete when locked
3. Expense form — remove "Paid by" dropdown; auto-set from current user's family
4. Meal cards — add lock/unlock button; disable edit/delete when locked
5. Itinerary activity cards — add lock/unlock button; hide edit/delete when locked

---

## 1 · Meal Assignment — Auto-Populated Dropdown

### Current behaviour
`MealEditForm` shows a type selector (`everyone / family / person`) plus a free-form text input for the label. `id` is always stored as `null`. Families and members are not loaded in `MealsTab`.

### New behaviour
Replace the two-step selector + text input with a single flat `<select>` dropdown. The dropdown is built from real family and member data and defaults to the current user's own name.

### Dropdown option order (flat list, Option B)
1. `👤 <user.displayName> (you)` — value: `{ type: 'person', id: user.uid, label: user.displayName }`
2. `👨‍👩‍👧 <userFamily.name> (your fam)` — value: `{ type: 'family', id: userFamilyId, label: familyName }`
3. `🌍 Everyone` — value: `{ type: 'everyone', id: null, label: 'Everyone' }`
4. Other families: `👨‍👩‍👧 <name>` — value: `{ type: 'family', id: familyId, label: name }`
5. Other members: `👤 <displayName>` — value: `{ type: 'person', id: uid, label: displayName }`

### Data shape change
`assignedTo.id` is now populated (previously always `null`):
```
assignedTo: { type: 'person'|'family'|'everyone', id: uid|familyId|null, label: string }
```
Existing docs with `id: null` continue to render correctly via `label`.

### Files changed
| File | Change |
|---|---|
| `src/components/MealsTab.jsx` | Load families + members via `getTripFamilies` + `getTripMembers`; pass `families`, `members`, `user` to `MealEditForm` |
| `src/components/MealEditForm.jsx` | Replace type-select + text-input with flat `<select>`; derive `assignedTo` object from selected option |

---

## 2 · Expense Lock / Unlock

### Lock semantics
- Only the **creator** (`createdBy === user.uid`) can lock their own expense.
- Only the **locker** (`lockedBy === user.uid`) can unlock. In practice locker = creator since only creator can lock.
- When locked: edit and delete buttons hidden for **all users**.
- The lock button is shown only to the creator. Non-creators never see a lock button.

### Firestore fields added to each expense doc
```
lockedAt:     serverTimestamp | null
lockedBy:     uid | null
lockedByName: string | null
```
`addExpense` initialises all three to `null`.

### New utility function
```js
// src/utils/expenses.js
toggleExpenseLock(tripId, expenseId, isLocked, uid, displayName)
// isLocked=false → lock: writes lockedAt=serverTimestamp(), lockedBy=uid, lockedByName=displayName
// isLocked=true  → unlock: writes lockedAt=null, lockedBy=null, lockedByName=null
```

### UI changes — `ExpenseList`
- Lock button shown when `isOwn` (creator).
  - If `!isLocked` → shows `🔓 Lock` button (enabled).
  - If `isLocked && lockedBy === user.uid` → shows `🔒 Unlock` button (enabled).
  - If `isLocked && lockedBy !== user.uid` → no lock button (other user locked it — impossible per semantics, but safe fallback).
- Edit (`✏️`) and Delete (`🗑`) buttons: shown only when `isOwn && !isLocked`.
- When locked, display a small `🔒 Locked by <lockedByName>` label beneath description.

### Files changed
| File | Change |
|---|---|
| `src/utils/expenses.js` | Add `toggleExpenseLock`; update `addExpense` to initialise lock fields |
| `src/components/ExpenseList.jsx` | Add lock button logic; conditionally hide edit/delete |
| `src/components/ExpensesTab.jsx` | Add `handleToggleExpenseLock` handler; pass to `ExpenseList` |

---

## 3 · Expense "Paid By" — Auto-Set, No Dropdown

### Current behaviour
`ExpenseEditForm` shows a `<select>` with all trip families. User must pick one.

### New behaviour
"Paid by" is read-only, auto-set to the current user's family at mount. No dropdown rendered.

### Implementation
- `ExpensesTab` already loads families. It now also calls `getTripMembers` to find the user's `familyId`.
- The resolved `{ paidByFamilyId, paidByFamilyName }` pair is passed as a prop to `ExpenseEditForm`.
- `ExpenseEditForm` displays the family name as static text (not an input). Both values are sent in `onSave` as before.
- For **edit** mode: keep the original `paidByFamilyId` and `paidByFamilyName` from the existing expense doc (do not override with current user).

### Files changed
| File | Change |
|---|---|
| `src/components/ExpensesTab.jsx` | Load members; resolve user's family; pass `userFamilyId` + `userFamilyName` to `ExpenseEditForm` |
| `src/components/ExpenseEditForm.jsx` | Remove `paidBy` `<select>`; accept `userFamilyId`/`userFamilyName` props; show read-only text in add mode; keep original values in edit mode |

---

## 4 · Meal Lock / Unlock

### Lock semantics (same pattern as expenses)
- Only the **creator** of the meal can lock it.
- Only the **locker** can unlock.
- When locked: edit and delete disabled/hidden for all users; clicking the card does nothing.

### Firestore fields added to each meal doc
```
createdBy:    uid               ← new (was missing from addMeal)
lockedAt:     serverTimestamp | null
lockedBy:     uid | null
lockedByName: string | null
```
`addMeal` is updated to store all four. Existing docs without `createdBy` treat `isOwn` as `false` (safe fallback — no lock button shown).

### New utility function
```js
// src/utils/meals.js
toggleMealLock(tripId, mealId, isLocked, uid, displayName)
```

### UI changes — `MealCard`
- Receives `user` prop (new).
- Lock button shown only to creator (`meal.createdBy === user.uid`).
  - Unlocked → `🔓` button; locked (by self) → `🔒` button.
- When locked: `onEdit` and `onDelete` are no-ops; delete `✕` button hidden.
- Card `onClick` checks `!isLocked` before calling `onEdit`.
- Small `🔒 <lockedByName>` label shown when locked.

### Files changed
| File | Change |
|---|---|
| `src/utils/meals.js` | Add `toggleMealLock`; update `addMeal` to store `createdBy` + lock fields |
| `src/components/MealCard.jsx` | Accept `user` prop; add lock button; guard edit/delete on lock state |
| `src/components/MealGrid.jsx` | Pass `user` down to `MealCard` |
| `src/components/MealsTab.jsx` | Add `handleToggleMealLock` handler; pass `user` to `MealGrid` |

---

## 5 · Itinerary Activity Lock / Unlock

### Lock semantics
Same as expenses and meals — creator locks, locker unlocks, locked hides edit/delete for all.

### Firestore fields added to each activity doc
```
lockedAt:     serverTimestamp | null
lockedBy:     uid | null
lockedByName: string | null
```
`addActivity` is updated to initialise these. `createdBy` already exists.

### New utility function
```js
// src/utils/itinerary.js
toggleActivityLock(tripId, activityId, isLocked, uid, displayName)
```

### UI changes — `ActivityCard` (activity type only, not meal-type cards)
- Lock button shown only to creator (`item.createdBy === user.uid`).
  - Unlocked → `🔓`; locked by self → `🔒`.
- When locked: edit and delete buttons hidden for all.
- Small `🔒 <lockedByName>` label shown when locked.
- `user` prop already present on `ActivityCard`.

### Files changed
| File | Change |
|---|---|
| `src/utils/itinerary.js` | Add `toggleActivityLock`; update `addActivity` to initialise lock fields |
| `src/components/ActivityCard.jsx` | Add lock button; guard edit/delete on lock state |
| `src/components/ItineraryTab.jsx` | Add `handleToggleActivityLock` handler; pass to `ActivityCard` |

---

## Shared Lock Utility Pattern

All three `toggleXxxLock` functions follow the same contract:

```js
async function toggleXxxLock(tripId, docId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'xxxCollection', docId)
  if (isLocked) {
    await updateDoc(ref, { lockedAt: null, lockedBy: null, lockedByName: null })
  } else {
    await updateDoc(ref, { lockedAt: serverTimestamp(), lockedBy: uid, lockedByName: displayName })
  }
}
```

---

## Data Model Summary

| Collection | New fields |
|---|---|
| `trips/{id}/expenses/{id}` | `lockedAt`, `lockedBy`, `lockedByName` |
| `trips/{id}/meals/{id}` | `createdBy`, `lockedAt`, `lockedBy`, `lockedByName` |
| `trips/{id}/activities/{id}` | `lockedAt`, `lockedBy`, `lockedByName` |

All new fields initialised to `null` on create. Existing docs without these fields degrade gracefully (`isLocked = false`, lock button not shown for docs without `createdBy`).

---

## Testing

### Unit tests (Vitest + RTL)
- `MealEditForm` — dropdown renders correct options in flat order; defaults to user's name; saves correct `assignedTo` shape
- `ExpenseEditForm` — no `<select>` for paid-by; shows auto-set family name; saves with correct `paidByFamilyId`
- `ExpenseList` — lock button visible to creator; hidden to non-creator; edit/delete hidden when locked; `toggleExpenseLock` called with correct args
- `MealCard` — lock button visible to creator; edit/delete hidden when locked; card click no-op when locked
- `ActivityCard` — lock button visible to creator; edit/delete hidden when locked

### Utility unit tests
- `toggleExpenseLock` / `toggleMealLock` / `toggleActivityLock` — lock writes correct fields; unlock writes nulls
- `addMeal` — now stores `createdBy` + null lock fields

### Integration tests
- Full flow: add meal → lock → verify edit disabled → unlock → verify edit re-enabled
- Full flow: add expense → lock → verify edit/delete hidden → unlock → visible again
