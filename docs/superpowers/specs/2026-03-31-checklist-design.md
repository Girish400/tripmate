# TripMate Checklist — Design Spec

**Date:** 2026-03-31
**Sub-project:** 2 — Checklist
**Status:** Approved

---

## Overview

A collaborative, real-time packing checklist for group trips. Items are pre-populated from trip type templates. Each item has a mode (per-family / shared / NA), per-family checkboxes in a tabular layout, a lock mechanic for ownership, and a live progress bar.

---

## 1. Data Model

### Firestore Path

```
trips/{tripId}/checklistItems/{itemId}
```

### Document Shape

```js
{
  name:     string,           // "Tent / Tarp"
  category: string,           // "Sleeping"
  mode:     'per-family' | 'shared' | 'na',
  order:    number,
  isCustom: boolean,          // false = template item, true = user-added

  // Per-family mode — keyed by familyId
  checks: {
    [familyId]: {
      checkedBy:   string,    // uid
      displayName: string,    // "Girish"
      lockedAt:    Timestamp | null   // null = checked but not locked
    }
  },

  // Shared mode — single check for the whole trip
  sharedCheck: {
    checkedBy:   string,
    displayName: string,
    lockedAt:    Timestamp | null
  } | null
}
```

### Real-time Strategy

A single `onSnapshot` listener on the `checklistItems` subcollection covers all documents. Any write — check, lock, mode change, new item — fires immediately to all connected clients. Listener is set up in `ChecklistTab.jsx` and cleaned up on unmount.

---

## 2. Lock Mechanic

1. Any family member checks their family's checkbox → check saved, **lock button + member name appear**
2. Member clicks lock → `lockedAt` timestamp is set
3. **Locked item:** only the original checker (`checkedBy === viewer.uid`) can uncheck or unlock
4. **Checked but unlocked:** any member of that family can uncheck

| Viewer | Can check | Can uncheck (unlocked) | Can unlock + uncheck (locked) |
|---|---|---|---|
| Own family member | ✅ | ✅ | Only if `checkedBy === viewer.uid` |
| Other family's member | ❌ | ❌ | ❌ |

---

## 3. Mode Toggle

Any trip member can click 🔀 to cycle an item through: `per-family → shared → na → per-family`

Changing mode **clears all checks and sharedCheck** atomically. NA items show strikethrough name and `──` in all family cells.

---

## 4. UI Layout

### Progress Section (top of Checklist tab)

```
Overall Progress  ████████████░░░░  68% packed

Family Sharma     ████████░░  80%
Family Patel      █████░░░░░  50%
Family Mehta      ████░░░░░░  40%
```

- Overall: `(total checked boxes) / (total applicable boxes) * 100`
- Per-family: `(boxes checked by family X) / (applicable boxes for X) * 100`
- NA items excluded from denominator
- Shared items count as 1 box regardless of family count

### Category Section (collapsible)

```
🔥 Campfire                                  8/12 ▼

  Item                  Sharma    Patel    Mehta    Mode
  ──────────────────────────────────────────────────────
  Tent / Tarp           ☐         ☐        ☐        🔀
  Charcoal / Lighter    ☑🔒Girish  —        —       [SHARED] 🔀
  Propane / Canister    ──        ──       ──       [NA] 🔀
  Sleeping Bag          ☐         ☑🔓Raj   ☐        🔀
                                              + Add item
```

### Item Row States

| State | Display |
|---|---|
| Per-family, unchecked | Empty checkbox per family column |
| Checked, unlocked | ☑ + 🔓 + name, any family member can uncheck |
| Checked, locked | ☑ + 🔒 + name, only checker can uncheck |
| Shared, checked + locked | Single ☑ 🔒 name spanning row, other cells show `—` |
| NA | Strikethrough name, `──` in all cells |

### Column Rules

- **Item column** — fixed left, ~40% width
- **Family columns** — one per family, equal width, header = family name
- **Mode column** — rightmost, always visible, shows label + 🔀

---

## 5. Template Coverage by Trip Type

| Trip Type | Categories |
|---|---|
| Tent Camping | Campfire, Food, Kitchen, Sleeping, Clothing, Medications, Toiletries, Miscellaneous |
| RV Camping | Same as tent + RV-specific swaps (hookups, leveling blocks, dump hose; no tent) |
| Beach / Glamping | Essentials, Clothing, Toiletries, Beach Gear, Other |
| Ski | Essentials, Ski Gear, Clothing (winter), Toiletries, Other |
| Road Trip | Essentials, Car, Snacks, Clothing, Toiletries, Other |
| International | Essentials, Documents, Clothing, Toiletries, Electronics, Other |

Template items sourced from:
- Tent Camping CSV (`Final - Camping CheckList - Tent Camping.csv`)
- Travel packing list screenshot (international / beach / road trip)
- RV-specific items adapted from tent camping template

`initChecklistFromTemplate(tripId, tripType, families)` is called once when the Checklist tab is first opened for a trip with an empty checklist.

---

## 6. Components & File Map

### New Files

| File | Responsibility |
|---|---|
| `src/components/ChecklistTab.jsx` | `onSnapshot` listener, renders progress + category sections |
| `src/components/ChecklistProgress.jsx` | Overall bar + per-family bars |
| `src/components/ChecklistCategory.jsx` | Collapsible section: table header + item rows + Add item |
| `src/components/ChecklistItemRow.jsx` | Single row: name, family cells, lock state, mode toggle |
| `src/utils/checklist.js` | Firestore ops: `subscribeChecklist`, `toggleCheck`, `toggleLock`, `setMode`, `addItem` |
| `src/utils/checklistTemplates.js` | Trip type → pre-populated items map |
| `tests/unit/ChecklistItemRow.test.jsx` | All row states (unchecked, locked, shared, NA) |
| `tests/unit/ChecklistProgress.test.jsx` | Progress % calculations |
| `tests/integration/checklist.test.jsx` | Check → lock flow, mode toggle, add item, concurrent writes |

### Modified Files

| File | Change |
|---|---|
| `src/pages/TripPage.jsx` | Active tab state; render `<ChecklistTab>` when Checklist tab is active |
| `src/utils/checklist.js` | Add `initChecklistFromTemplate(tripId, tripType, families)` — called once on first Checklist tab open |

### Component Data Flow

```
TripPage
  └── ChecklistTab  (onSnapshot → items[])
        ├── ChecklistProgress  (items[], families[])
        └── ChecklistCategory[]  (items filtered by category)
              └── ChecklistItemRow[]  (item, families, currentUser, currentFamily)
                    ├── per-family cells  → toggleCheck / toggleLock
                    └── mode toggle       → setMode (resets checks)
```

### Key `checklist.js` API

```js
subscribeChecklist(tripId, callback)
  // onSnapshot on checklistItems — returns unsubscribe fn

toggleCheck(tripId, itemId, familyId, uid, displayName)
  // sets or clears checks[familyId]; clears lockedAt on uncheck

toggleLock(tripId, itemId, familyId, uid)
  // sets lockedAt only if checks[familyId].checkedBy === uid

setMode(tripId, itemId, newMode)
  // updates mode, clears checks and sharedCheck atomically

addItem(tripId, category, name)
  // creates new doc with isCustom: true, mode: 'per-family'

initChecklistFromTemplate(tripId, tripType, families)
  // batch-writes template items; no-op if checklistItems already exist for this trip
```

---

## 7. Firestore Security Rules

```js
match /trips/{tripId}/checklistItems/{itemId} {
  allow read:   if isTripMember(tripId);
  allow create: if isTripMember(tripId);
  // Any trip member may update: check/lock state, mode changes (which clear checks),
  // or the name of a custom item. Full helper implementations go in the plan.
  allow update: if isTripMember(tripId);
  allow delete: if false;  // NA mode replaces deletion
}

function isTripMember(tripId) {
  return request.auth != null
    && exists(/databases/$(database)/documents/trips/$(tripId)/members/$(request.auth.uid));
}
// Note: fine-grained lock enforcement (only checker can unlock) is enforced client-side;
// Firestore rules enforce trip membership only, keeping rules simple and maintainable.
```

---

## 8. Testing Strategy

### Unit — `ChecklistItemRow`

| Scenario | Assertion |
|---|---|
| Per-family item, viewer is Family A | Family A checkbox clickable, B/C disabled |
| Checked by viewer, unlocked | Lock button visible, uncheck allowed |
| Checked + locked by viewer | Unlock + uncheck allowed |
| Checked + locked by someone else | Row read-only for current user |
| Shared item | Single checkbox, no family columns |
| NA item | Strikethrough name, all cells `──` |

### Unit — `ChecklistProgress`

| Scenario | Assertion |
|---|---|
| 0 items checked | 0% overall and per family |
| All NA items | Shows "No items" — no NaN from 0 denominator |
| Mixed shared + per-family | Shared counts as 1, per-family as N |
| One family fully packed | Per-family bars reflect independently |

### Integration — `checklist.test.jsx`

| Scenario | Assertion |
|---|---|
| Check → lock flow | Firestore updated, UI reflects live |
| Locked item | Other family's checkbox disabled |
| Mode toggle shared → NA | Checks cleared, UI resets |
| Add custom item | Appears at bottom of category, `isCustom: true` |
| Two families check simultaneously | Both reflected without overwriting |

---

## 9. Edge Cases

| Edge case | Handling |
|---|---|
| Trip has 1 family | No column headers, single checkbox per item |
| Family with 0 members | Column hidden |
| Mode changed while item is checked | Checks cleared atomically with mode write |
| User refreshes mid-session | `onSnapshot` rehydrates full state immediately |
| Offline edit | Firestore optimistic local write, syncs on reconnect |
