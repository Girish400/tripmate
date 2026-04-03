# Expense Tracking — Design Spec
**Date:** 2026-04-03
**Sub-project:** 4 of 5
**Status:** Approved

---

## 1. Overview

A Splitwise-style collaborative expense tracker for group trips. Any trip member can log expenses. The app calculates net balances per family and displays who owes whom. No in-app settlement — balances are informational only.

---

## 2. Decisions

| Decision | Choice |
|---|---|
| Unit of split | Family — equal split among all families |
| Who can add | Any trip member |
| Who can edit/delete | Own expenses only (`createdBy === user.uid`) |
| Balances | Display only, no in-app settlement |
| Currency | Single currency per trip, set on trip doc |
| Labels | Custom, trip-scoped, reusable dropdown |
| Split rule | Always all families, equal shares |

---

## 3. Data Model

### `/trips/{tripId}/expenses/{expenseId}`

```
description       string              — e.g. "Groceries at Walmart"
amount            number              — positive decimal, e.g. 124.50
paidByFamilyId    string              — familyId of the paying family
paidByFamilyName  string              — snapshot label, e.g. "Sharma family"
label             string | null       — trip-scoped label name, e.g. "Food"
createdBy         uid
createdAt         serverTimestamp
```

### `/trips/{tripId}/expenseLabels/{labelId}`

```
name              string              — e.g. "Food"
createdBy         uid
createdAt         serverTimestamp
```

### Trip doc addition

A `currency` field (e.g. `"USD"`) added to the trip doc at creation time. If absent, default to `"USD"`. All expenses in that trip use this currency.

### Balance computation (client-side)

For each expense:
- The paying family contributed `amount` to the pool
- Every family (including the payer) owes `amount / numFamilies`
- Net balance per family = Σ(amounts paid) − Σ(share owed across all expenses)
- Positive = net creditor (is owed money); negative = net debtor (owes money)

`computeBalances(expenses, families)` is a pure function — no Firestore calls.

---

## 4. Architecture

### Approach

Simple expense list + client-computed balances. All expenses loaded via `onSnapshot`; balance math done in the client. No server-side cache or Cloud Functions needed. Consistent with the Meals and Checklist sub-projects.

### File layout

```
src/utils/expenses.js          — Firestore utils + computeBalances
src/components/ExpensesTab.jsx — orchestrator (mirrors MealsTab)
src/components/BalanceSummary.jsx
src/components/ExpenseList.jsx
src/components/ExpenseEditForm.jsx
```

---

## 5. Components

### `ExpensesTab`
- Mounts three `onSnapshot` subscriptions: expenses, expenseLabels, families
- Owns `editingExpense` state (null = closed, `{}` = new, `{...expense}` = editing)
- Passes data down to `BalanceSummary`, `ExpenseList`, `ExpenseEditForm`

### `BalanceSummary`
- One chip per family: family name + net balance
- Green chip for creditors (`balance > 0`), red for debtors (`balance < 0`), neutral for even
- Amounts formatted with `Intl.NumberFormat` using trip currency

### `ExpenseList`
- Flat chronological list (newest first)
- Each row: description, `paidByFamilyName`, label pill, amount
- Edit/delete icons visible only for `createdBy === user.uid`
- Empty state: "No expenses yet — add the first one"

### `ExpenseEditForm`
- Side popover (same visual pattern as `MealEditForm`)
- Fields:
  - Description (text, required)
  - Amount (number, positive, required)
  - Paid by (family dropdown, required)
  - Label (dropdown of existing labels + "Create new label…" option)
- Inline label creation: type name → saved to `expenseLabels` → auto-selected
- Used for both add and edit

---

## 6. Firestore Utilities (`src/utils/expenses.js`)

```
subscribeExpenses(tripId, cb)            — onSnapshot, sorted newest first
addExpense(tripId, data)                 — addDoc
updateExpense(tripId, expenseId, changes)— updateDoc
deleteExpense(tripId, expenseId)         — deleteDoc
subscribeExpenseLabels(tripId, cb)       — onSnapshot, sorted alphabetically
addExpenseLabel(tripId, name, uid)       — addDoc
computeBalances(expenses, families)      — pure function, returns [{familyId, name, balance}]
```

---

## 7. Error Handling & Edge Cases

- **Zero families:** Balance row is empty; add/edit still works. `computeBalances` returns `[]`.
- **One family:** Net balance is always $0. No divide-by-zero — `numFamilies` is at least 1.
- **Amount validation:** Must be a positive number. Description and paid-by are required. Form blocks submit until valid.
- **Label name collision:** Two users creating the same label simultaneously produces two docs with the same name — acceptable at trip scale; no deduplication required.
- **Stale edit:** If an expense is deleted while someone else has it open in the edit form, `updateDoc` will fail; the error is caught and the popover closes gracefully.
- **Currency missing:** If `trip.currency` is undefined, fall back to `"USD"` in display only.

---

## 8. Testing

**`src/utils/expenses.test.js`**
- `computeBalances` — pure function, fully unit-testable:
  - Equal split across 3 families
  - Single family (net always zero)
  - No expenses (all balances zero)
  - Multiple expenses with mixed payers
  - Floating point: amounts that don't divide evenly

**`src/components/ExpensesTab.test.jsx`** (integration, Firestore mocked)
- Renders balance chips from mocked expense + family data
- Add expense: open form → fill fields → submit → expense row appears
- Edit expense: edit/delete icons shown only for own expenses
- Delete expense: row removed from list
- Add new label inline: label available in dropdown for next expense

Uses the existing Firestore mock (`onSnapshot`, `addDoc`, `updateDoc`, `deleteDoc`).
