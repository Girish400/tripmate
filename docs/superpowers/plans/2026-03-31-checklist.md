# TripMate Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time collaborative packing checklist inside TripPage where items are pre-populated from trip-type templates, each item has per-family checkboxes in a tabular layout with lock ownership, and a live progress bar reflects all changes instantly.

**Architecture:** Firestore `checklistItems` subcollection under each trip, with `onSnapshot` for live updates. Each item stores per-family check state as a nested map. Lock enforcement is client-side; Firestore rules enforce trip membership only. Templates are static JS objects keyed by trip type.

**Tech Stack:** React 18, Firebase 10 (Firestore), Vitest, React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/checklist.js` | Create | Firestore ops: subscribe, toggleCheck, toggleLock, setMode, addItem, initChecklistFromTemplate |
| `src/utils/checklistTemplates.js` | Create | Static map of trip type → category items |
| `src/components/ChecklistProgress.jsx` | Create | `computeProgress` helper (exported) + progress bars UI |
| `src/components/ChecklistItemRow.jsx` | Create | Single `<tr>` row: name, per-family cells, lock, mode toggle |
| `src/components/ChecklistCategory.jsx` | Create | Collapsible section: table header + item rows + Add item |
| `src/components/ChecklistTab.jsx` | Create | onSnapshot listener, init template, renders progress + categories |
| `src/pages/TripPage.jsx` | Modify | Replace placeholder tab pills with active tab state; render ChecklistTab |
| `tests/setup.js` | Modify | Add `onSnapshot` + `writeBatch` + `deleteField` to firebase/firestore mock |
| `tests/unit/ChecklistProgress.test.jsx` | Create | Unit tests for `computeProgress` |
| `tests/unit/ChecklistItemRow.test.jsx` | Create | Unit tests for all row states |
| `tests/integration/checklist.test.jsx` | Create | Integration: check→lock flow, mode toggle, add item |

---

## Task 1: Update test mock for Firestore

The existing `tests/setup.js` mock is missing `onSnapshot`, `writeBatch`, and `deleteField`. Add them before writing any checklist code or tests will fail to even import.

**Files:**
- Modify: `tests/setup.js`

- [ ] **Step 1: Add missing Firestore mock fns**

Replace the `vi.mock('firebase/firestore', ...)` block in `tests/setup.js` with:

```js
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((...args) => ({ path: args.join('/') })),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  collection: vi.fn((...args) => ({ path: args.join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  arrayUnion: vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => new Date('2026-03-30')),
  Timestamp: { fromDate: vi.fn(d => d) },
  onSnapshot: vi.fn(() => vi.fn()),   // returns unsubscribe fn
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  deleteField: vi.fn(() => '__DELETE__'),
}))
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd C:/Users/Girish/Desktop/tripmate
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add tests/setup.js
git commit -m "test: add onSnapshot/writeBatch/deleteField to firestore mock"
```

---

## Task 2: `src/utils/checklistTemplates.js`

Static map of trip type → array of `{ category, items[] }`. These are the pre-populated items loaded when a checklist is first opened.

**Files:**
- Create: `src/utils/checklistTemplates.js`

- [ ] **Step 1: Create the templates file**

```js
// src/utils/checklistTemplates.js

export const CATEGORY_ICONS = {
  'Campfire':       '🔥',
  'Food':           '🍽️',
  'Kitchen':        '🍳',
  'Sleeping':       '🛏️',
  'Clothing':       '👕',
  'Medications':    '💊',
  'Toiletries':     '🧴',
  'Miscellaneous':  '🎒',
  'Essentials':     '📋',
  'Documents':      '📄',
  'Beach Gear':     '🏖️',
  'Ski Gear':       '⛷️',
  'Car':            '🚗',
  'Snacks':         '🍿',
  'Electronics':    '💻',
  'Other':          '📦',
}

const TENT_CAMPING = [
  {
    category: 'Campfire',
    items: [
      'Tent / Tarp / Pop-up Tent', 'Plastic / Trash Bags', 'Sunscreen / Sunglasses / Hats',
      'Bug Spray / Hand Sanitizer', 'Books', 'Cash / Map', 'Thermo Cooler / Bottles',
      'Outdoor Rug', 'Table Cloth / Cover / Clips', 'Power Bank / Batteries / Cord',
      'Charcoal / Lighter / Grill', 'Broom / Camping Chairs', 'Bucket / Umbrella / Jackets',
      'Extension Cords / Match Sticks', 'Headlights / Flashlights',
      'Cooler / Dry Ice / Water Can', 'Twine', 'Propane / Canister',
      'Rubbermaid Water Cooler', 'Napkins / Paper Towels',
      'Insect / Mosquito Repellent', 'Water Bottles', 'Gas Top', 'Disposable Toilet Paper',
    ],
  },
  {
    category: 'Food',
    items: [
      'Milk', 'Onions / Tomatoes', 'Cucumber', 'Cilantro / Green Peppers',
      'Sweet Corn / Potato', 'Lemon / Garlic', 'Ghee / Cumin / Mustard',
      'Chat Masala', 'Oil / Salt / Butter / Cheese', 'Sugar / Tea Powder',
      'Rice', 'Chilli Powder / Turmeric', 'Apples / Oranges',
      'Strawberry / Banana', 'Bread', 'Paneer / Yogurt',
      'Chutney / Marination', 'Fennel Seeds', 'S\'mores / Snacks',
      'Asparagus', 'Biscuits / Chips / Ketchup',
    ],
  },
  {
    category: 'Kitchen',
    items: [
      'Gas Stove / Top', 'Knife / Forks / Whisk', 'Big Spoon / Spatula',
      'Paper Dishes / Cups', 'Paper Bowls / Plastic Spoons', 'Skewers / Pot Holders',
      'Skillet / Tava / Frying Pan', 'Paper Napkins', 'Dish Soap',
      'Ziploc Bags', 'Can and Bottle Opener', 'Pots / Tea Pot / Iron Skillet',
      'Cutting Board / Peeler', 'Food Storage Containers', 'Sponge / Liquid Detergent',
      'Tea Bags', 'Mixing Bowl / Blender', 'Big and Small Tongs',
      'Canned Beans', 'Aluminum Foil', 'Silver Serving Tray',
    ],
  },
  {
    category: 'Sleeping',
    items: [
      'Sleeping Bag / Blankets / Cot', 'Air Pump', 'Bed Sheets / Pillows',
      'Bath Mat', 'Socks', 'Head Cap / Beanie', 'Lantern', 'Extra Blankets',
      'Handkerchief', 'Pocket Knife', 'Wood Axe / Firewood',
      'S-Hook / Hammock', 'Pen / Notepad', 'Solar Lights',
      'Air Freshener', 'Swimming Costumes', 'Hiking Gear / Shoes',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Towels / Pajamas', 'Sleepers / Flip Flops / Sandals', 'Jackets / Hoodie',
      'Raincoat / Poncho', 'Sweatshirts', 'Ear Plug / Eye Mask',
      'Long Sleeve Shirt', 'Gloves / Mittens', 'Shorts / Tees', 'Undergarments',
    ],
  },
  {
    category: 'Medications',
    items: [
      'First Aid Kit / Band-Aids', 'Tylenol / Pain Reliever', 'Medical ID / Information',
      'Emergency Contact Info', 'Neosporin', 'Hydrogen Peroxide',
      'Zandu Balm / Vicks', 'Biofreeze', 'NyQuil',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Soap / Soap Box', 'Shampoo / Conditioner / Shaving Kit',
      'Comb / Feminine Products', 'Face / Hand Towels',
      'Hand Soap / Deodorant', 'Toothbrush / Toothpaste',
      'Bobby Pins / Hair Pins', 'Moisturizer / Hair Ties',
      'Hand Mirror', 'Toilet Paper / Wipes',
    ],
  },
  {
    category: 'Miscellaneous',
    items: [
      'Car RC Book / Insurance', 'Cards / Dice / Ball / Racket',
      'Car Battery Charger', 'Driving License / Passport',
      'Duct Tape / Scissors', 'Zip Ties / Hammer',
      'Flashlight / Backpack', 'Phone / Wallet / Airtag',
      'Tire Pressure Gauge / Inflator',
    ],
  },
]

const RV_CAMPING = [
  {
    category: 'Campfire',
    items: [
      'RV Hookup Cable / Adapter', 'Leveling Blocks', 'Sewer Dump Hose',
      'Freshwater Hose', 'RV Awning', 'Outdoor Rug', 'Camping Chairs',
      'Propane / Canister', 'Charcoal / Lighter / Grill',
      'Extension Cords', 'Power Bank / Batteries',
      'Headlights / Flashlights', 'Cooler / Water Can',
      'Trash Bags', 'Napkins / Paper Towels',
      'Insect / Mosquito Repellent', 'Water Bottles',
      'Bug Spray / Hand Sanitizer', 'Sunscreen / Sunglasses / Hats',
    ],
  },
  ...TENT_CAMPING.filter(c => c.category !== 'Campfire').map(c =>
    c.category === 'Sleeping'
      ? { ...c, items: c.items.filter(i => i !== 'Tent / Tarp / Pop-up Tent') }
      : c
  ),
]

const BEACH_GLAMPING = [
  {
    category: 'Essentials',
    items: [
      'Passport / ID', 'Cash', 'Credit Card',
      'Smartphone and Charger', 'Health Insurance Card',
      'Accommodation Booking', 'Emergency Contacts',
    ],
  },
  {
    category: 'Beach Gear',
    items: [
      'Sunscreen (SPF 50+)', 'Beach Towels', 'Beach Umbrella',
      'Swimsuits', 'Flip Flops', 'Sunglasses', 'Beach Chairs',
      'Cooler / Ice Chest', 'Sand Toys', 'Snorkel Gear',
      'Life Jackets', 'Beach Bag', 'Waterproof Phone Case',
      'After-Sun Lotion', 'Insect Repellent',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'T-Shirts', 'Shorts / Skirts', 'Dresses / Cover-Ups',
      'Underwear', 'Socks', 'Sandals', 'Hat / Cap',
      'Light Jacket', 'Pajamas',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Shampoo / Conditioner',
      'Soap / Body Wash', 'Deodorant', 'Face Cleanser / Moisturizer',
      'Hair Brush / Comb', 'Feminine Products', 'Medications',
      'First Aid Kit',
    ],
  },
  {
    category: 'Other',
    items: [
      'Books / Kindle', 'Camera and Charger', 'Powerbank',
      'Water Bottles', 'Snacks', 'Bluetooth Speaker',
    ],
  },
]

const SKI = [
  {
    category: 'Essentials',
    items: [
      'ID / Passport', 'Cash / Credit Card', 'Ski Pass / Lift Tickets',
      'Accommodation Booking', 'Emergency Contacts', 'Travel Insurance',
    ],
  },
  {
    category: 'Ski Gear',
    items: [
      'Skis / Snowboard', 'Ski Boots', 'Ski Poles',
      'Helmet', 'Goggles', 'Ski Gloves', 'Ski Jacket',
      'Ski Pants', 'Thermal Base Layers', 'Ski Socks',
      'Neck Gaiter / Balaclava', 'Hand Warmers',
      'Ski Lock', 'Boot Bag',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Thermal Underwear', 'Fleece / Sweater', 'Warm Socks',
      'Beanie', 'Waterproof Gloves', 'Winter Coat',
      'Casual Clothes', 'Pajamas', 'Underwear',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Shampoo / Conditioner',
      'Soap / Body Wash', 'Deodorant', 'Lip Balm',
      'Sunscreen (high SPF for snow)', 'Moisturizer / Chapstick',
      'Feminine Products',
    ],
  },
  {
    category: 'Other',
    items: [
      'First Aid Kit', 'Pain Reliever', 'Camera and Charger',
      'Powerbank', 'Snacks / Energy Bars', 'Water Bottle',
      'Guidebook / Trail Map',
    ],
  },
]

const ROAD_TRIP = [
  {
    category: 'Essentials',
    items: [
      'Driver\'s License', 'Car Insurance / Registration',
      'Cash / Credit Card', 'Smartphone and Charger',
      'Car Phone Mount', 'Roadside Emergency Kit',
    ],
  },
  {
    category: 'Car',
    items: [
      'Jumper Cables', 'Spare Tire / Jack', 'Roadside Flares',
      'First Aid Kit', 'Car Tool Kit', 'Trash Bags',
      'Sunshade / Windshield Cover', 'GPS / Downloaded Maps',
      'Tire Pressure Gauge',
    ],
  },
  {
    category: 'Snacks',
    items: [
      'Water Bottles', 'Energy Drinks / Coffee', 'Granola Bars',
      'Chips / Crackers', 'Fruit', 'Sandwiches', 'Candy / Gum',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Comfortable Clothes', 'Pajamas', 'Underwear / Socks',
      'Shoes / Sneakers', 'Light Jacket', 'Sunglasses', 'Hat',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Deodorant', 'Soap / Wipes',
      'Feminine Products', 'Hand Sanitizer', 'Medications',
    ],
  },
  {
    category: 'Other',
    items: [
      'Headphones / AUX Cable', 'Books / Audiobooks', 'Camera',
      'Powerbank', 'Travel Pillow / Blanket', 'Notebook and Pen',
    ],
  },
]

const INTERNATIONAL = [
  {
    category: 'Essentials',
    items: [
      'Passport', 'Visa Documents', 'Travel Insurance Policy',
      'Flight Tickets / Boarding Pass', 'Hotel / Accommodation Booking',
      'International SIM / Phone Plan', 'Foreign Currency / Cash',
      'Credit Card (notify bank)', 'Emergency Contacts',
    ],
  },
  {
    category: 'Documents',
    items: [
      'Passport Copies (2x)', 'Visa Copies', 'Insurance Policy Copy',
      'ESTA / Entry Requirements', 'International Driving Permit',
      'Vaccination Records', 'Travel Itinerary Printout',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Underwear', 'Socks', 'T-Shirts', 'Shirts / Blouses',
      'Pants / Jeans', 'Shorts', 'Dresses / Skirts',
      'Formal Clothes', 'Sweaters / Fleece', 'Swimsuits',
      'Coat / Jacket', 'Rain Coat', 'Formal Shoes',
      'Leisure Shoes', 'Sandals / Flip Flops', 'Hat / Cap',
      'Scarf / Belt', 'Pajamas', 'Laundry Bag',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Dental Floss / Mouthwash',
      'Shampoo / Conditioner', 'Soap / Body Wash',
      'Deodorant', 'Face Cleanser / Moisturizer',
      'Sunscreen', 'Razor / Shaving Kit', 'Makeup / Remover',
      'Perfume / Cologne', 'Feminine Products', 'Medications',
      'First Aid Kit', 'Insect Repellent', 'Hand Sanitizer',
      'Wet Wipes', 'Toilet Paper (travel pack)',
    ],
  },
  {
    category: 'Electronics',
    items: [
      'Smartphone and Charger', 'Universal Power Adapter',
      'Laptop / Tablet and Charger', 'Powerbank',
      'Camera and Charger / Memory Card', 'Headphones / Earbuds',
      'E-reader / Kindle',
    ],
  },
  {
    category: 'Other',
    items: [
      'Guidebook / Maps', 'Travel Lock', 'Luggage Tags',
      'Neck Pillow', 'Sleep Mask', 'Earplugs',
      'Snacks for Flight', 'Tote / Shopping Bag',
      'Umbrella', 'Notebook and Pen',
    ],
  },
]

// Keys must match tripType values used in NewTripModal / getTripEmoji
export const TEMPLATES = {
  'Tent Camping':          TENT_CAMPING,
  'RV':                    RV_CAMPING,
  'Glamping':              BEACH_GLAMPING,
  'Beach':                 BEACH_GLAMPING,
  'Ski/Snow':              SKI,
  'Road Trip':             ROAD_TRIP,
  'International Vacation': INTERNATIONAL,
  'Picnic':                TENT_CAMPING,  // fallback
  'Day Trip':              ROAD_TRIP,     // fallback
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/checklistTemplates.js
git commit -m "feat: add checklist templates for all trip types"
```

---

## Task 3: `src/utils/checklist.js`

All Firestore operations for the checklist. No UI code here.

**Files:**
- Create: `src/utils/checklist.js`

- [ ] **Step 1: Create the file**

```js
// src/utils/checklist.js
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
    // Sort by order ascending
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(items)
  })
}

/**
 * Check or uncheck a checkbox.
 * mode: 'per-family' | 'shared'
 * familyId: required for per-family, null for shared
 * isChecked: current state (true = currently checked, will uncheck)
 */
export async function toggleCheck(tripId, itemId, mode, familyId, uid, displayName, isChecked) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  if (mode === 'shared') {
    await updateDoc(ref, {
      sharedCheck: isChecked
        ? deleteField()
        : { checkedBy: uid, displayName, lockedAt: null },
    })
  } else {
    await updateDoc(ref, {
      [`checks.${familyId}`]: isChecked
        ? deleteField()
        : { checkedBy: uid, displayName, lockedAt: null },
    })
  }
}

/**
 * Toggle lock on a checked item.
 * Only call this when checks[familyId].checkedBy === uid (enforced client-side).
 * isLocked: current state (true = currently locked, will unlock)
 */
export async function toggleLock(tripId, itemId, mode, familyId, isLocked) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const field = mode === 'shared'
    ? 'sharedCheck.lockedAt'
    : `checks.${familyId}.lockedAt`
  await updateDoc(ref, {
    [field]: isLocked ? null : serverTimestamp(),
  })
}

/**
 * Cycle item mode: per-family → shared → na → per-family.
 * Clears all check state atomically when mode changes.
 */
export async function setMode(tripId, itemId, newMode) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  await updateDoc(ref, {
    mode: newMode,
    checks: {},
    sharedCheck: null,
  })
}

/** Add a custom item to a category. */
export async function addItem(tripId, category, name) {
  const ref = collection(db, 'trips', tripId, 'checklistItems')
  await addDoc(ref, {
    name,
    category,
    mode: 'per-family',
    order: Date.now(),
    isCustom: true,
    checks: {},
    sharedCheck: null,
  })
}

/**
 * Pre-populate checklist from template. No-op if items already exist.
 * Call once when ChecklistTab first mounts for a trip.
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
        name,
        category,
        mode: 'per-family',
        order: order++,
        isCustom: false,
        checks: {},
        sharedCheck: null,
      })
    })
  })

  await batch.commit()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/checklist.js
git commit -m "feat: add checklist Firestore utility functions"
```

---

## Task 4: `ChecklistProgress` — progress bars + `computeProgress`

Build the progress calculation logic and the UI component. Export `computeProgress` so it can be unit-tested without rendering.

**Files:**
- Create: `src/components/ChecklistProgress.jsx`
- Create: `tests/unit/ChecklistProgress.test.jsx`

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/ChecklistProgress.test.jsx
import { describe, it, expect } from 'vitest'
import { computeProgress } from '../../src/components/ChecklistProgress'

const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]

describe('computeProgress', () => {
  it('returns 0% when nothing checked', () => {
    const items = [{ mode: 'per-family', checks: {}, sharedCheck: null }]
    const result = computeProgress(items, families)
    expect(result.overall).toBe(0)
    expect(result.perFamily[0].percent).toBe(0)
    expect(result.perFamily[1].percent).toBe(0)
  })

  it('excludes NA items — noItems true when all NA', () => {
    const items = [{ mode: 'na', checks: {}, sharedCheck: null }]
    const result = computeProgress(items, families)
    expect(result.noItems).toBe(true)
    expect(result.overall).toBe(0)
    expect(result.total).toBe(0)
  })

  it('counts shared item as 1 box regardless of family count', () => {
    const items = [{
      mode: 'shared', checks: {},
      sharedCheck: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null },
    }]
    const result = computeProgress(items, families)
    expect(result.total).toBe(1)
    expect(result.checked).toBe(1)
    expect(result.overall).toBe(100)
  })

  it('counts per-family item as N boxes (one per family)', () => {
    const items = [{
      mode: 'per-family',
      checks: { fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null } },
      sharedCheck: null,
    }]
    const result = computeProgress(items, families)
    expect(result.total).toBe(2)
    expect(result.checked).toBe(1)
    expect(result.overall).toBe(50)
  })

  it('per-family bars reflect each family independently', () => {
    const items = [{
      mode: 'per-family',
      checks: {
        fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null },
      },
      sharedCheck: null,
    }]
    const result = computeProgress(items, families)
    expect(result.perFamily[0].percent).toBe(100)
    expect(result.perFamily[1].percent).toBe(0)
  })

  it('mixed shared + per-family items computed correctly', () => {
    const items = [
      { mode: 'per-family', checks: { fA: { checkedBy: 'u1', displayName: 'G', lockedAt: null } }, sharedCheck: null },
      { mode: 'shared', checks: {}, sharedCheck: null },
    ]
    const result = computeProgress(items, families)
    // total = 2 (per-family fA) + 1 (per-family fB) + 1 (shared) = 4
    // checked = 1 (fA) + 0 (fB) + 0 (shared) = 1
    expect(result.total).toBe(4)
    expect(result.checked).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/ChecklistProgress.test.jsx 2>&1 | tail -15
```

Expected: FAIL — `computeProgress` is not defined.

- [ ] **Step 3: Create `ChecklistProgress.jsx`**

```jsx
// src/components/ChecklistProgress.jsx

/** Pure function — exported for unit testing */
export function computeProgress(items, families) {
  let total = 0
  let checked = 0
  const familyStats = {}
  families.forEach(f => { familyStats[f.familyId] = { total: 0, checked: 0 } })

  items.forEach(item => {
    if (item.mode === 'na') return
    if (item.mode === 'shared') {
      total++
      if (item.sharedCheck) checked++
    } else {
      families.forEach(f => {
        familyStats[f.familyId].total++
        total++
        if (item.checks?.[f.familyId]) {
          familyStats[f.familyId].checked++
          checked++
        }
      })
    }
  })

  return {
    overall: total === 0 ? 0 : Math.round((checked / total) * 100),
    checked,
    total,
    noItems: total === 0,
    perFamily: families.map(f => ({
      familyId: f.familyId,
      name: f.name,
      percent: familyStats[f.familyId].total === 0
        ? 0
        : Math.round((familyStats[f.familyId].checked / familyStats[f.familyId].total) * 100),
      checked: familyStats[f.familyId].checked,
      total: familyStats[f.familyId].total,
    })),
  }
}

export default function ChecklistProgress({ items, families }) {
  const { overall, checked, total, noItems, perFamily } = computeProgress(items, families)

  const ProgressBar = ({ percent, label, sub }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: sub ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: sub ? 11 : 13 }}>
          {label}
        </span>
        <span style={{ color: sub ? 'var(--text-muted)' : '#fff', fontSize: sub ? 11 : 13, fontWeight: sub ? 400 : 600 }}>
          {percent}%
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: sub ? 5 : 8, overflow: 'hidden' }}>
        <div style={{
          width: `${percent}%`, height: '100%', borderRadius: 6,
          background: sub
            ? 'linear-gradient(90deg, #4285F4, #34A853)'
            : 'linear-gradient(90deg, #34A853, #4ade80)',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )

  if (noItems) {
    return (
      <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        No items yet — checklist will load shortly.
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: 16, marginBottom: 20,
    }}>
      <ProgressBar
        percent={overall}
        label={`Overall Progress — ${checked} / ${total} packed`}
        sub={false}
      />
      {families.length > 1 && (
        <div style={{ marginTop: 12 }}>
          {perFamily.map(f => (
            <ProgressBar key={f.familyId} percent={f.percent} label={`Family ${f.name}`} sub />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/ChecklistProgress.test.jsx 2>&1 | tail -15
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChecklistProgress.jsx tests/unit/ChecklistProgress.test.jsx
git commit -m "feat: add ChecklistProgress component with computeProgress"
```

---

## Task 5: `ChecklistItemRow` — single table row

Each row handles: item name, per-family checkboxes with lock states, shared mode, NA mode, and mode toggle.

**Files:**
- Create: `src/components/ChecklistItemRow.jsx`
- Create: `tests/unit/ChecklistItemRow.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/ChecklistItemRow.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChecklistItemRow from '../../src/components/ChecklistItemRow'

const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]
const currentUser = { uid: 'u1', displayName: 'Girish' }
const currentFamilyId = 'fA'

const wrap = (item, overrides = {}) => {
  const props = {
    item: { itemId: 'i1', name: 'Tent', category: 'Sleeping', mode: 'per-family', checks: {}, sharedCheck: null, ...item },
    families,
    currentUser,
    currentFamilyId,
    onToggleCheck: vi.fn(),
    onToggleLock: vi.fn(),
    onSetMode: vi.fn(),
    ...overrides,
  }
  return render(<table><tbody><ChecklistItemRow {...props} /></tbody></table>)
}

describe('ChecklistItemRow', () => {
  it('renders item name', () => {
    wrap()
    expect(screen.getByText('Tent')).toBeTruthy()
  })

  it('own family checkbox enabled, other family disabled', () => {
    wrap()
    const checkboxes = screen.getAllByRole('checkbox')
    // fA is currentFamilyId — enabled; fB disabled
    expect(checkboxes[0].disabled).toBe(false)
    expect(checkboxes[1].disabled).toBe(true)
  })

  it('shows unlock icon + name after checking', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } } })
    expect(screen.getByText('🔓')).toBeTruthy()
    expect(screen.getByText('Girish')).toBeTruthy()
  })

  it('shows lock icon when item is locked', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date() } } })
    expect(screen.getByText('🔒')).toBeTruthy()
  })

  it('disables checkbox when locked by a different user', () => {
    wrap({ checks: { fA: { checkedBy: 'u999', displayName: 'Other', lockedAt: new Date() } } })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(true)
  })

  it('NA mode renders strikethrough and dashes in family cells', () => {
    wrap({ mode: 'na' })
    expect(screen.getByTestId('item-name-na')).toBeTruthy()
    const dashes = screen.getAllByText('──')
    expect(dashes.length).toBe(families.length)
  })

  it('shared mode renders single checkbox, no per-family columns', () => {
    wrap({ mode: 'shared' })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(1)
  })

  it('calls onToggleCheck when own family checkbox clicked', () => {
    const onToggleCheck = vi.fn()
    wrap({}, { onToggleCheck })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggleCheck).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'fA',
      false
    )
  })

  it('calls onSetMode with next mode when mode button clicked', () => {
    const onSetMode = vi.fn()
    wrap({}, { onSetMode })
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(onSetMode).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'shared'
    )
  })

  it('calls onToggleLock when lock button clicked by owner', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByText('🔓'))
    expect(onToggleLock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'fA',
      false
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/ChecklistItemRow.test.jsx 2>&1 | tail -15
```

Expected: FAIL — `ChecklistItemRow` is not defined.

- [ ] **Step 3: Create `ChecklistItemRow.jsx`**

```jsx
// src/components/ChecklistItemRow.jsx

const MODE_NEXT = { 'per-family': 'shared', 'shared': 'na', 'na': 'per-family' }
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

  // ── Shared check helpers ──────────────────────────────────────
  const sc           = item.sharedCheck
  const sharedChecked = !!sc
  const sharedLocked  = sharedChecked && !!sc.lockedAt
  const sharedCanAct  = !sharedLocked || sc.checkedBy === currentUser.uid

  // ── Per-family check helpers ──────────────────────────────────
  const familyCanAct = (familyId) => {
    if (familyId !== currentFamilyId) return false
    const ch = item.checks?.[familyId]
    if (!ch) return true
    if (!ch.lockedAt) return true
    return ch.checkedBy === currentUser.uid
  }

  return (
    <tr>
      {/* Item name */}
      <td style={cell({ color: isNA ? 'var(--text-dim)' : 'var(--text-primary)', fontSize: 13 })}>
        {isNA
          ? <span data-testid="item-name-na" style={{ textDecoration: 'line-through' }}>{item.name}</span>
          : item.name
        }
      </td>

      {/* Family columns */}
      {isNA && families.map(f => (
        <td key={f.familyId} style={cell({ color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 })}>
          ──
        </td>
      ))}

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
                  onClick={() => sc.checkedBy === currentUser.uid && onToggleLock(item, null, sharedLocked)}
                  disabled={sc.checkedBy !== currentUser.uid}
                  style={{ background: 'none', border: 'none', cursor: sc.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 14 }}
                >
                  {sharedLocked ? '🔒' : '🔓'}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sc.displayName}</span>
              </>
            )}
          </div>
        </td>
      )}

      {!isNA && !isShared && families.map(f => {
        const ch        = item.checks?.[f.familyId]
        const isChecked = !!ch
        const isLocked  = isChecked && !!ch.lockedAt
        const canAct    = familyCanAct(f.familyId)

        return (
          <td key={f.familyId} style={cell({ textAlign: 'center' })}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!canAct && !(!isChecked && f.familyId !== currentFamilyId ? true : false) ? !canAct : !canAct}
                onChange={() => canAct && onToggleCheck(item, f.familyId, isChecked)}
                style={{ width: 16, height: 16, cursor: canAct ? 'pointer' : 'not-allowed' }}
              />
              {isChecked && (
                <>
                  <button
                    onClick={() => ch.checkedBy === currentUser.uid && onToggleLock(item, f.familyId, isLocked)}
                    disabled={ch.checkedBy !== currentUser.uid}
                    style={{ background: 'none', border: 'none', cursor: ch.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 13 }}
                  >
                    {isLocked ? '🔒' : '🔓'}
                  </button>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{ch.displayName}</span>
                </>
              )}
            </div>
          </td>
        )
      })}

      {/* Mode toggle */}
      <td style={cell({ textAlign: 'right', whiteSpace: 'nowrap' })}>
        <button
          data-testid="mode-toggle"
          onClick={() => onSetMode(item, MODE_NEXT[item.mode])}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
            color: isNA ? 'var(--text-dim)' : isShared ? '#4285F4' : 'var(--text-muted)',
            fontSize: 10, cursor: 'pointer',
          }}
        >
          {MODE_LABEL[item.mode]} 🔀
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 4: Fix the disabled logic (simplify)**

The disabled expression in the `!isNA && !isShared` branch is unnecessarily complex. Replace just that `disabled` prop with:

```jsx
disabled={!canAct}
```

The `<input>` tag should be:

```jsx
<input
  type="checkbox"
  checked={isChecked}
  disabled={!canAct}
  onChange={() => canAct && onToggleCheck(item, f.familyId, isChecked)}
  style={{ width: 16, height: 16, cursor: canAct ? 'pointer' : 'not-allowed' }}
/>
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- tests/unit/ChecklistItemRow.test.jsx 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChecklistItemRow.jsx tests/unit/ChecklistItemRow.test.jsx
git commit -m "feat: add ChecklistItemRow with lock mechanic and mode toggle"
```

---

## Task 6: `ChecklistCategory` — collapsible table section

Renders one category with a collapsible table header, all its item rows, and an "+ Add item" input.

**Files:**
- Create: `src/components/ChecklistCategory.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/ChecklistCategory.jsx
import { useState } from 'react'
import ChecklistItemRow from './ChecklistItemRow'
import { CATEGORY_ICONS } from '../utils/checklistTemplates'

export default function ChecklistCategory({
  category, items, families,
  currentUser, currentFamilyId,
  onToggleCheck, onToggleLock, onSetMode, onAddItem,
}) {
  const [expanded, setExpanded]     = useState(true)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')

  const icon          = CATEGORY_ICONS[category] ?? '📦'
  const totalInCat    = items.filter(i => i.mode !== 'na').length
  const checkedInCat  = items.filter(i => {
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
      {/* Category header */}
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
            {/* Column headers */}
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

          {/* Add item row */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {addingItem ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); if (e.key === 'Escape') setAddingItem(false) }}
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

- [ ] **Step 2: Commit**

```bash
git add src/components/ChecklistCategory.jsx
git commit -m "feat: add ChecklistCategory collapsible table component"
```

---

## Task 7: `ChecklistTab` — orchestrator

Owns the `onSnapshot` subscription, template initialization, families fetch, and wires everything together.

**Files:**
- Create: `src/components/ChecklistTab.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/ChecklistTab.jsx
import { useEffect, useState } from 'react'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import {
  subscribeChecklist, toggleCheck, toggleLock,
  setMode, addItem, initChecklistFromTemplate,
} from '../utils/checklist'
import ChecklistProgress from './ChecklistProgress'
import ChecklistCategory from './ChecklistCategory'

export default function ChecklistTab({ trip, user }) {
  const [items,    setItems]    = useState([])
  const [families, setFamilies] = useState([])
  const [currentFamilyId, setCurrentFamilyId] = useState(null)
  const [loading,  setLoading]  = useState(true)

  // Fetch families + current user's familyId once
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

  // Subscribe to live checklist updates
  useEffect(() => {
    const unsub = subscribeChecklist(trip.tripId, async (liveItems) => {
      setItems(liveItems)
      if (liveItems.length === 0) {
        // First open — initialize from template
        await initChecklistFromTemplate(trip.tripId, trip.tripType)
      }
      setLoading(false)
    })
    return unsub
  }, [trip.tripId, trip.tripType])

  // Group items by category preserving order
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

  const handleToggleLock = (item, familyId, isLocked) => {
    toggleLock(trip.tripId, item.itemId, item.mode, familyId, isLocked)
  }

  const handleSetMode = (item, newMode) => {
    setMode(trip.tripId, item.itemId, newMode)
  }

  const handleAddItem = (category, name) => {
    addItem(trip.tripId, category, name)
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>Loading checklist…</div>
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

- [ ] **Step 2: Commit**

```bash
git add src/components/ChecklistTab.jsx
git commit -m "feat: add ChecklistTab with live onSnapshot and template init"
```

---

## Task 8: Wire `ChecklistTab` into `TripPage`

Replace the four placeholder "coming soon" tabs with real clickable tabs. Render `<ChecklistTab>` when Checklist is active.

**Files:**
- Modify: `src/pages/TripPage.jsx`

- [ ] **Step 1: Read current TripPage**

Read `src/pages/TripPage.jsx` to locate the placeholder tabs block (around line 60–72).

- [ ] **Step 2: Add import + activeTab state**

At the top of `TripPage.jsx`, add the import:

```jsx
import ChecklistTab from '../components/ChecklistTab'
```

Inside the `TripPage` component, add state after the existing `useState` lines:

```jsx
const [activeTab, setActiveTab] = useState('Checklist')
```

- [ ] **Step 3: Replace placeholder tabs block**

Find and replace this block:

```jsx
{/* Placeholder tabs */}
<div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
  {['Checklist', 'Expenses', 'Meals', 'Itinerary'].map(tab => (
    <div key={tab} style={{
      background:'rgba(255,255,255,0.06)',
      border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:8, padding:'7px 14px',
      color:'#7a9ab8', fontSize:12, cursor:'not-allowed',
    }}>
      {tab} <span style={{ fontSize:9, opacity:0.6 }}>(coming soon)</span>
    </div>
  ))}
</div>
```

With:

```jsx
{/* Tabs */}
<div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
  {['Checklist', 'Expenses', 'Meals', 'Itinerary'].map(tab => {
    const isActive = activeTab === tab
    const isAvailable = tab === 'Checklist'
    return (
      <div
        key={tab}
        onClick={() => isAvailable && setActiveTab(tab)}
        style={{
          background: isActive ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.06)',
          border: isActive ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius:8, padding:'7px 14px',
          color: isActive ? '#7eb8f7' : '#7a9ab8',
          fontSize:12,
          cursor: isAvailable ? 'pointer' : 'not-allowed',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {tab}{!isAvailable && <span style={{ fontSize:9, opacity:0.6, marginLeft:4 }}>(soon)</span>}
      </div>
    )
  })}
</div>

{/* Tab content */}
{activeTab === 'Checklist' && (
  <ChecklistTab trip={trip} user={user} />
)}
```

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
npm test 2>&1 | tail -25
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TripPage.jsx
git commit -m "feat: wire ChecklistTab into TripPage with active tab state"
```

---

## Task 9: Integration tests

**Files:**
- Create: `tests/integration/checklist.test.jsx`

- [ ] **Step 1: Create integration tests**

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
  { familyId: 'fB', name: 'Patel', memberIds: ['u2'] },
]

const members = [
  { uid: 'u1', displayName: 'Girish', familyId: 'fA' },
  { uid: 'u2', displayName: 'Raj', familyId: 'fB' },
]

const makeItem = (overrides = {}) => ({
  itemId: 'i1', name: 'Tent', category: 'Sleeping',
  mode: 'per-family', order: 0, isCustom: false,
  checks: {}, sharedCheck: null, ...overrides,
})

beforeEach(() => {
  vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(families)
  vi.spyOn(firestoreUtils, 'getTripMembers').mockResolvedValue(members)
  vi.spyOn(checklistUtils, 'initChecklistFromTemplate').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleCheck').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleLock').mockResolvedValue()
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

  it('calls toggleLock when lock button clicked by owner', async () => {
    const checkedItem = makeItem({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } } })
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([checkedItem])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('🔓'))

    fireEvent.click(screen.getByText('🔓'))
    expect(checklistUtils.toggleLock).toHaveBeenCalledWith(
      'trip1', 'i1', 'per-family', 'fA', false
    )
  })

  it('calls setMode and clears checks on mode toggle', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByTestId('mode-toggle'))

    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(checklistUtils.setMode).toHaveBeenCalledWith('trip1', 'i1', 'shared')
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
    expect(checklistUtils.addItem).toHaveBeenCalledWith('Sleeping', 'Hammock')
  })

  it('shows loading state before snapshot arrives', () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation(() => vi.fn()) // never fires
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

- [ ] **Step 2: Run integration tests**

```bash
npm test -- tests/integration/checklist.test.jsx 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Final commit**

```bash
git add tests/integration/checklist.test.jsx
git commit -m "test: add ChecklistTab integration tests"
```

---

## Firestore Security Rules

After implementation is complete, add this rule to your Firebase console (Firestore → Rules):

```js
match /trips/{tripId}/checklistItems/{itemId} {
  allow read:   if isTripMember(tripId);
  allow create: if isTripMember(tripId);
  allow update: if isTripMember(tripId);
  allow delete: if false;
}

function isTripMember(tripId) {
  return request.auth != null
    && exists(/databases/$(database)/documents/trips/$(tripId)/members/$(request.auth.uid));
}
```

---

## Self-Review Checklist

- [x] `subscribeChecklist` returns unsubscribe fn → tested in integration Task 9
- [x] `toggleCheck` handles both per-family and shared modes
- [x] `toggleLock` writes `lockedAt` via serverTimestamp or null
- [x] `setMode` clears `checks` and `sharedCheck` atomically
- [x] `addItem` sets `isCustom: true`
- [x] `initChecklistFromTemplate` is no-op when items exist
- [x] `computeProgress` excludes NA items, counts shared as 1, per-family as N
- [x] Progress `noItems` guard prevents NaN at 0 denominator
- [x] `ChecklistItemRow` disables other-family checkboxes
- [x] Lock button only active for `checkedBy === currentUser.uid`
- [x] Mode cycle: per-family → shared → na → per-family
- [x] `ChecklistCategory` shows collapsible table with column headers per family
- [x] `ChecklistTab` cleans up `onSnapshot` on unmount
- [x] TripPage tab state defaults to Checklist, other tabs show "(soon)"
- [x] Template covers all 9 trip types (with 2 fallbacks for Picnic/Day Trip)
