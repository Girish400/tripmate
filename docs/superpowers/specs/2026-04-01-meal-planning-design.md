# Meal Planning — Design Spec
**Date:** 2026-04-01
**Sub-project:** 3 of 5
**Status:** Approved

---

## 1. Overview

A collaborative meal planner for group trips. Any trip member can add, edit, or delete meals. Meals are organised in a day × meal-slot grid. Each meal item optionally carries an ingredients list that feeds into a shared, checkable shopping list.

---

## 2. Data Model

### `/trips/{tripId}/meals/{mealId}`

```
dish        string              — display name, e.g. "Pancakes & eggs"
slot        'breakfast' | 'lunch' | 'snacks' | 'dinner'
day         number              — 0-based index from trip startDate (Day 1 = 0)
assignedTo  {
              type:  'everyone' | 'family' | 'person'
              id:    string | null   — familyId or uid (null for 'everyone')
              label: string          — snapshot display name, e.g. "Sharma family"
            }
ingredients string[]            — ordered list; empty array = no shopping items
order       number              — Date.now() on creation, for ordering within a cell
createdBy   uid
createdAt   serverTimestamp
```

### `/trips/{tripId}/shoppingItems/{itemId}`

```
name        string              — ingredient name, e.g. "eggs x12"
mealId      string              — parent meal doc ID
mealLabel   string              — snapshot: "Day 2 Dinner · Pasta night"
checkedBy   uid | null
checkedAt   serverTimestamp | null
createdAt   serverTimestamp
```

**Key rules:**
- Shopping items are created/deleted in sync with `meals.ingredients` updates — when an ingredient is added to a meal a shopping item is created; when removed the shopping item is deleted.
- `day` is a 0-based integer. Day 1 displayed = `day === 0`. Number of rows = `trip.endDate - trip.startDate + 1` days.
- No dietary restriction tracking — keep it simple.
- No per-item restriction checks or warnings.

---

## 3. UI

### 3.1 MealsTab

Mounted inside `TripPage` when the "Meals" tab is active (replacing the current "(soon)" placeholder). Receives `trip` and `user` props, mirrors the `ChecklistTab` pattern.

Two sub-views toggled by an inner tab bar:

| Tab | Content |
|-----|---------|
| 📅 Meal Grid | Day × slot grid — primary view |
| 🛒 Shopping List | Flat checkable ingredient list |

### 3.2 Meal Grid (`MealGrid`)

- Table: rows = trip days, columns = Breakfast / Lunch / Snacks / Dinner
- Day rows are computed from `trip.startDate` + `trip.endDate` (inclusive)
- Each cell (`MealCell`) shows stacked `MealCard` components + a `+ Add meal` button at the bottom
- `MealCard` displays: dish name, responsibility badge (colour-coded), ingredient count if > 0
- Clicking a card opens `MealEditForm` (inline popover) for that card
- Hovering a card reveals a ✕ delete button (top-right)

**Responsibility badge colours:**
- 🔵 Everyone — `rgba(66,133,244)` blue
- 🟢 Family — `rgba(52,168,83)` green
- 🟡 Individual — `rgba(251,188,5)` yellow

### 3.3 MealEditForm (popover)

Opens inline over the card. Fields:
- Dish name (text input)
- Responsible (dropdown: Everyone / Family / Individual — family/person name is free-text label for now; future sub-project can wire to real family/member data)
- Ingredients list — each ingredient shown with ✕ to remove; "Add ingredient…" input + "+ Add" button (Enter key also adds)
- **Save**, **Delete** (red), **Cancel** buttons

### 3.4 MealAddForm

Opens when "+ Add meal" is clicked in an empty or non-empty cell. Fields: dish name, responsible dropdown. No ingredients at add-time — user edits the card after creation to add ingredients.

### 3.5 Shopping List (`ShoppingList`)

- Flat list of all ingredients across all meals, ordered by meal day + slot
- Each row: checkbox · ingredient name · source meal label (e.g. "Day 2 Dinner · Pasta night")
- Checking/unchecking is real-time via `onSnapshot`; anyone can check any item
- Checked items get 45% opacity + strikethrough
- Progress counter top-right: "X / Y bought"
- Empty state: "No ingredients added yet. Add ingredients to meal items in the grid."

---

## 4. Components

```
src/components/MealsTab.jsx          — orchestrator (fetches data, manages state)
src/components/MealGrid.jsx          — day × slot table
src/components/MealCell.jsx          — single cell: stacked cards + add button
src/components/MealCard.jsx          — single meal card + edit/delete
src/components/MealEditForm.jsx      — edit/add popover (shared for edit and add)
src/components/ShoppingList.jsx      — flat ingredient list with checkboxes
```

### Responsibilities

| Component | Does |
|-----------|------|
| `MealsTab` | `subscribeMeals` + `subscribeShoppingItems` via `onSnapshot`; computes day count from trip dates; passes handlers down |
| `MealGrid` | Renders table; receives meals grouped by day+slot |
| `MealCell` | Filters meals for its day+slot; renders cards + add button |
| `MealCard` | Displays dish, badge, ingredient count; fires `onEdit` / `onDelete` |
| `MealEditForm` | Controlled form for both add and edit; fires `onSave` / `onDelete` / `onClose` |
| `ShoppingList` | Receives shopping items; fires `onToggle` |

---

## 5. Utility Functions

### `src/utils/meals.js`

```js
subscribeMeals(tripId, callback)          // onSnapshot → sorted by day, slot, order
addMeal(tripId, { dish, slot, day, assignedTo })   // addDoc
updateMeal(tripId, mealId, changes)       // updateDoc
deleteMeal(tripId, mealId)               // deleteDoc
addIngredient(tripId, mealId, name)      // arrayUnion on ingredients + addDoc shoppingItem
removeIngredient(tripId, mealId, name)   // arrayRemove on ingredients + delete shoppingItem
```

### `src/utils/shopping.js`

```js
subscribeShoppingItems(tripId, callback)  // onSnapshot → sorted by mealLabel
toggleShoppingItem(tripId, itemId, uid, isChecked)
  // isChecked=true  → { checkedBy: uid, checkedAt: serverTimestamp() }
  // isChecked=false → { checkedBy: null, checkedAt: null }
```

---

## 6. Integration with TripPage

- `TripPage.jsx`: change `isAvailable = tab === 'Checklist'` to also include `'Meals'`
- Add `{activeTab === 'Meals' && <MealsTab trip={trip} user={user} />}`
- No other pages change

---

## 7. Security Rules

Same pattern as checklist — only trip members can read/write:

```
match /trips/{tripId}/meals/{mealId} {
  allow read, write: if isTripMember(tripId);
}
match /trips/{tripId}/shoppingItems/{itemId} {
  allow read, write: if isTripMember(tripId);
}
```

---

## 8. Testing Strategy

### Unit tests
- `computeMealDays(startDate, endDate)` — returns correct day count and labels
- `MealCard` — renders dish name, badge colour per resp type, ingredient count, hides count when 0
- `ShoppingList` — renders items, checked state, progress counter, empty state

### Integration tests
- Add meal → appears in grid cell in real-time
- Edit meal dish + responsible → card updates
- Delete meal → card removed, its shopping items removed
- Add ingredient → appears in shopping list
- Remove ingredient → disappears from shopping list
- Toggle shopping item → checked state persists

---

## 9. Out of Scope

- Dietary restriction tracking
- Recipe details / cooking instructions
- Meal templates by trip type
- Ingredient categories / aisle grouping on shopping list
- Quantity / unit tracking on ingredients (free text only)
