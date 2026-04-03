# Day-wise Itinerary — Design Spec
**Date:** 2026-04-03
**Sub-project:** 5 of 5
**Status:** Approved

---

## 1. Overview

A day-by-day itinerary planner for group trips. Any member can add activities to any day. Planned meals from the Meals tab are automatically interleaved into each day's view, giving a unified picture of the full day without duplicating data entry.

---

## 2. Decisions

| Decision | Choice |
|---|---|
| Layout | Day tabs — one tab per trip day |
| Activity fields | Title, time (required), location, notes, assigned family, icon |
| Icon | Preset emoji picker (~12 options) |
| Date storage | ISO date string `"YYYY-MM-DD"` (not day index) |
| Meal integration | Interleaved read-only, blue-tinted cards sorted by time |
| Who can add | Any trip member |
| Who can edit/delete | Own activities only (`createdBy === user.uid`) |
| Default tab | Today's date if within trip range, else Day 1 |

---

## 3. Data Model

### `/trips/{tripId}/activities/{activityId}`

```
title         string          — e.g. "Hike to waterfall"
date          string          — ISO date "2026-04-05"
time          string          — "HH:MM" 24h, e.g. "09:00" (required)
location      string | null   — e.g. "Blue Ridge Trail"
notes         string | null   — free text
assignedTo    string | null   — familyId
icon          string          — emoji char, e.g. "🥾"
createdBy     uid
createdAt     serverTimestamp
```

### Meals interop

Meals already exist under `/trips/{tripId}/meals/{mealId}` with a `day` integer (0-based). The itinerary tab converts each meal's `day` to a calendar date as `startDate + day` and merges them into the interleaved list. No changes to the Meals data model.

### Day tabs

Generated at render time from `trip.startDate` → `trip.endDate`. No Firestore collection needed for days.

---

## 4. Architecture

### Approach

Same pattern as MealsTab and ExpensesTab: `onSnapshot` subscriptions in the orchestrator, pure client-side merging and sorting, no Cloud Functions. Activities use actual ISO date strings so the tab is resilient to trip date changes.

### File layout

```
src/utils/itinerary.js            — Firestore CRUD utils
src/components/ItineraryTab.jsx   — orchestrator
src/components/ActivityCard.jsx   — single card (activity or meal variant)
src/components/ActivityEditForm.jsx — add/edit popover
```

---

## 5. Components

### `ItineraryTab`
- Subscribes to `activities` (own subscription) and `meals` (re-uses `subscribeMeals`)
- `selectedDate` state: defaults to today if within trip range, else first day
- For the selected date: filters activities by `date === selectedDate`, maps meals where `day === dayIndex` to their calendar date, merges and sorts the combined list by `time` (HH:MM string comparison)
- Renders day tab strip, merged activity list, and "+ Add Activity" button
- Loading state while data loads

### `ActivityCard`
- `type` prop: `"activity"` or `"meal"`
- **Activity variant:** dark card — icon, title, time, location, assigned family; edit/delete icons visible only for `createdBy === user.uid`
- **Meal variant:** blue-tinted card — meal slot + dish name + "from Meals tab" label; always read-only
- Shared component keeps the interleaved list visually consistent

### `ActivityEditForm`
- Side popover (same visual pattern as `MealEditForm` / `ExpenseEditForm`)
- Fields: icon picker (grid of ~12 preset emojis), title (required), time (required), location (optional), notes (optional), assigned family dropdown (optional, populated from trip families)
- Delete button shown in edit mode for own activities only
- Used for both add and edit

---

## 6. Firestore Utilities (`src/utils/itinerary.js`)

```
subscribeActivities(tripId, cb)              — onSnapshot, sorted by time asc
addActivity(tripId, data)                    — addDoc
updateActivity(tripId, activityId, changes)  — updateDoc
deleteActivity(tripId, activityId)           — deleteDoc
```

All four follow the same pattern as `src/utils/expenses.js`.

---

## 7. Error Handling & Edge Cases

- **No activities for a day:** Empty state — "No activities planned for this day — add the first one"
- **No meals for a day:** Meals simply absent from the merged list, no error shown
- **Single-day trip:** One tab, works normally
- **Time conflict:** Two activities at the same time are allowed — sorted stably by `createdAt`
- **Stale edit:** If an activity is deleted while open in the form, `updateDoc` fails — caught, form closes gracefully (same pattern as Expenses)
- **Trip date change:** Activities retain their ISO date string; tabs regenerate from new trip dates. Activities on dates now outside the trip range become unreachable but are not deleted.

---

## 8. Testing

### `src/utils/itinerary.test.js`
- `subscribeActivities` returns activities sorted by `time` ascending
- `addActivity`, `updateActivity`, `deleteActivity` call the correct Firestore methods with the correct arguments

### `src/components/ItineraryTab.test.jsx` (integration, Firestore mocked)
- Renders day tabs matching trip start/end dates
- Defaults to Day 1 when today is outside the trip range
- Activities for the selected day appear; other days' activities do not
- Meals for the selected day appear as read-only blue cards, interleaved by time
- Add activity: open form → fill required fields → submit → card appears in list
- Edit/delete icons shown only for own activities (`createdBy === user.uid`)
- Delete: card removed from list

Uses the same Firestore mock setup as `ExpensesTab.test.jsx` and `MealsTab.test.jsx`.
