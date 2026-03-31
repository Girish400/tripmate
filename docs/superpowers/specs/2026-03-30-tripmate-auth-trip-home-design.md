# TripMate — Auth + Trip Home Design Spec
**Date:** 2026-03-30
**Sub-project:** 1 of N — Authentication & Trip Home Dashboard
**Status:** Approved

---

## Overview

TripMate is a collaborative trip planner for groups (individuals, families, multiple families) going on RV trips, camping, glamping, picnics, beach holidays, ski trips, road trips, and international vacations.

This spec covers **Sub-project 1**: the Gmail login page and the Trip Home dashboard — the foundation all future sub-projects (checklists, expenses, meals, itinerary) will build on.

---

## Section 1: Architecture & Tech Stack

### Firebase Project
- **Project ID:** `camp-cbf1d`
- **Auth Domain:** `camp-cbf1d.firebaseapp.com`
- **Database:** Firestore (structured trip/member/family data)
- **Realtime Database URL:** `https://camp-cbf1d-default-rtdb.firebaseio.com/` (not used in this sub-project)
- **Owner email:** `girishsancheti@gmail.com`

### Tech Stack

| Layer | Choice |
|---|---|
| UI Framework | React 18 + Vite |
| Routing | React Router v6 with `HashRouter` (GitHub Pages compatible) |
| Auth | Firebase Auth — Google provider (Gmail only) |
| Database | Firestore |
| Hosting | GitHub Pages via `gh-pages` npm package |
| CI/CD | Jenkins pipeline |
| Testing | Vitest + React Testing Library + Firebase Emulator Suite |
| Config | `.env` file with `VITE_` prefixed vars, `.gitignored` |

### Folder Structure

```
tripmate/
├── index.html                          # Root entry point (Vite + GitHub Pages)
├── src/
│   ├── main.jsx                        # React app mount point
│   ├── firebase.js                     # Firebase init from .env vars
│   ├── App.jsx                         # Router + auth state listener + route guard
│   ├── pages/
│   │   ├── LoginPage.jsx               # Immersive Gmail login screen
│   │   ├── HomePage.jsx                # Trip dashboard (0 / 2+ trips logic)
│   │   ├── JoinPage.jsx                # Join trip via invite code/link
│   │   └── TripPage.jsx                # Single trip planning page (stub, Sub-project 2+)
│   └── components/
│       ├── Navbar.jsx                  # Top bar: logo, Gmail photo, name, email, Sign Out
│       ├── TripCard.jsx                # Reusable trip card component
│       └── NewTripModal.jsx            # Create new trip form/modal
│
├── tests/
│   ├── unit/
│   │   ├── firebase.test.js            # Auth init, persistence config
│   │   ├── TripCard.test.jsx           # Card renders correct data, badges, states
│   │   ├── NewTripModal.test.jsx       # Form validation, date rules
│   │   ├── Navbar.test.jsx             # Gmail photo, sign out, back button
│   │   └── HomePage.test.jsx           # Empty state, card grid, completed collapse
│   ├── integration/
│   │   ├── auth.test.jsx               # Login flow, 0/1/2+ trips redirect logic
│   │   └── tripFlow.test.jsx           # Create → invite → join → family → member doc
│   └── setup.js                        # Vitest + RTL global setup, emulator config
│
├── ci/
│   ├── Jenkinsfile                     # Pipeline: install → lint → test → build → deploy
│   └── jenkins-setup.md               # How to configure the Jenkins job
│
├── docs/
│   ├── github-pages-hosting.md         # Step-by-step GitHub Pages setup guide
│   ├── firebase-setup.md               # Firebase project + Firestore security rules
│   └── superpowers/
│       └── specs/
│           └── 2026-03-30-tripmate-auth-trip-home-design.md  # This file
│
├── .env                                # Firebase config (NEVER commit — gitignored)
├── .env.example                        # Safe template committed to repo
├── .gitignore
├── CLAUDE.md                           # AI assistant context for this project
├── MEMORY.md                           # Persistent memory index
├── README.md                           # Project overview + quick start
├── package.json
└── vite.config.js
```

### Auth Persistence & Safari ITP
Firebase Auth uses `browserLocalPersistence` (backed by `indexedDB`) set explicitly via `setPersistence()`. This survives Safari's Intelligent Tracking Prevention (ITP), aggressive cookie policies, and private browsing — unlike `localStorage` or cookie-based sessions.

---

## Section 2: Data Model (Firestore)

### Collections

```
firestore/
├── users/{userId}
├── trips/{tripId}
│   ├── members/{memberId}
│   └── families/{familyId}
└── inviteCodes/{code}
```

### `users/{userId}`
Mirrors Firebase Auth profile, upserted on every login.

```js
{
  uid:         "firebase-auth-uid",
  displayName: "Girish Kumar",
  email:       "girishsancheti@gmail.com",
  photoURL:    "https://lh3.googleusercontent.com/...",
  createdAt:   Timestamp
}
```

### `trips/{tripId}`

```js
{
  tripId:      "auto-generated",
  name:        "Rocky Mountains Camping",
  destination: "Colorado, USA",
  tripType:    "Tent Camping",           // preset or custom string
  startDate:   Timestamp,
  endDate:     Timestamp,
  hostId:      "firebase-auth-uid",
  memberIds:   ["uid1", "uid2", ...],    // used in Firestore Security Rules
  inviteCode:  "RTX924",                // 6-char unique uppercase code
  createdAt:   Timestamp
}
```

**Trip status is always derived — never stored:**
- `startDate <= today <= endDate` → **Active**
- `startDate > today` → **Upcoming**
- `endDate < today` → **Completed**

### `trips/{tripId}/members/{memberId}`
Document ID = user's UID (enables direct lookup `members/{uid}` without querying).

```js
{
  uid:         "firebase-auth-uid",
  displayName: "Jane Smith",
  email:       "jane@gmail.com",
  photoURL:    "https://...",
  role:        "member",                // "host" | "member"
  familyId:    "family-doc-id",
  joinedAt:    Timestamp
}
```

### `trips/{tripId}/families/{familyId}`

```js
{
  familyId:   "auto-generated",
  name:       "Smith Family",
  createdBy:  "firebase-auth-uid",
  memberIds:  ["uid1", "uid2"],
  createdAt:  Timestamp
}
```

### `inviteCodes/{code}`
Separate lookup index — fast single-read trip resolution without scanning the trips collection.

```js
{
  code:    "RTX924",
  tripId:  "trips-doc-id",
  hostId:  "firebase-auth-uid"
}
```

### Firestore Security Rules Summary

| Operation | Condition |
|---|---|
| Read trip | User UID is in `trip.memberIds` |
| Update/delete trip | User UID equals `trip.hostId` |
| Create member doc | User is authenticated (joining) |
| Read/write members & families | User UID is in parent `trip.memberIds` |
| Read inviteCode | Any authenticated user |

---

## Section 3: Screen Flow & Navigation Logic

### Routes (`HashRouter`)

```
/#/                  → LoginPage       (unauthenticated only)
/#/home              → HomePage        (authenticated — 0 trips: empty state, 2+ trips: card grid)
/#/trip/:tripId      → TripPage        (authenticated)
/#/join/:inviteCode  → JoinPage        (authenticated, joining via link)
```

### Auth Guard — App Load Sequence

```
App loads
  │
  ├─ No user → redirect to /#/
  │
  └─ User logged in → fetch trips where memberIds contains user.uid
        │
        ├─ 0 active/upcoming trips → /#/home  (empty state)
        │
        ├─ 1 active/upcoming trip  → /#/trip/:tripId  (skip dashboard — app load only, not on manual navigation)
        │
        └─ 2+ active/upcoming trips → /#/home  (card grid)
```

### Login Flow

```
LoginPage
  → "Login with Gmail" clicked
  → signInWithPopup (Google provider)
      └─ Safari detected → signInWithRedirect + getRedirectResult() on load
  → Success: upsert users/{uid} in Firestore
  → Check sessionStorage for pending invite code
      ├─ Found → redirect to /#/join/:code
      └─ Not found → trip count check → route accordingly
```

### New Trip Creation Flow

```
"+ New Trip" clicked → NewTripModal opens
  Fields: Trip Name · Destination · Trip Type · Start Date · End Date · Family Name
  Date validation:
    • Start date ≥ today
    • End date > start date
    • Minimum duration: 1 day
  On submit:
    1. Generate unique 6-char invite code (collision-check against inviteCodes)
    2. Write trips/{tripId}
    3. Write inviteCodes/{code}
    4. Write trips/{tripId}/members/{hostUid}  (role: "host")
    5. Write trips/{tripId}/families/{familyId}  (host's family name)
    6. Add hostUid to memberIds array
  → Redirect to /#/trip/:tripId
```

### Invite / Join Flow

```
Host clicks "✉️ Invite" on trip card
  → Popup shows:
      • Invite link: https://<username>.github.io/tripmate/#/join/RTX924
      • "Copy Link" button
      • Raw code (small): "or share code: RTX924"

New user opens invite link → /#/join/RTX924
  → Not logged in → LoginPage (stores code in sessionStorage)
  → After login → /#/join/RTX924
  → Lookup inviteCodes/RTX924 → get tripId
  → Already a member? → redirect to /#/trip/:tripId
  → New member → show Join screen:
      • Trip preview (name, destination, dates, host, member count)
      • Family selection:
          ○ Radio list of existing families
          ○ "Create a new family" → text input
      • "Join Trip" → write member doc, update memberIds, update family memberIds
  → Redirect to /#/trip/:tripId
```

### "My Trips" Back Navigation

```
TripPage → Navbar "← My Trips"
  ├─ User has 2+ trips → /#/home
  └─ User has 1 trip   → /#/home  (empty state shown, "Create trip" prompt)
```

---

## Section 4: Component Breakdown & UI Behaviour

### `LoginPage.jsx`
- Full-viewport immersive background: night sky gradient, stars, moon, mountain silhouettes, campfire glow
- Floating emojis: 🏕️ 🚐 ⛺ 🌲 🔥 🌄 🎒 🗺️
- Frosted glass card (centre): `backdrop-filter: blur(16px)`, dark semi-transparent background
- Card contents: 🏕️ icon · "TripMate" · tagline "Plan together. Adventure together." · divider · "Login with Gmail" button · "Gmail accounts only · Secure sign-in" note
- Auth loading state: subtle spinner inside card, no layout shift
- Responsive: card 90% width mobile, 320px fixed desktop

### `Navbar.jsx`
| Position | Element |
|---|---|
| Left | 🏕️ TripMate logo |
| Left (TripPage only) | "← My Trips" back button |
| Centre (TripPage only) | Trip name (truncated 24 chars) |
| Right | Gmail photo (34px circle) + display name + email + "Sign Out" button |

Gmail photo falls back to a coloured initial avatar if `photoURL` fails to load.

### `HomePage.jsx` — Three States

**Empty state (0 trips)**
- Centred illustration + "No trips yet — ready to plan your first adventure?"
- Large `+ Create Trip` button

**Single active/upcoming trip**
- Never rendered — `App.jsx` redirects to `/#/trip/:tripId` before this mounts

**Full dashboard (2+ trips)**
- Section header: "Active & Upcoming Trips" + count + `+ New Trip` button (top right)
- Responsive card grid: 3 col desktop → 2 col tablet → 1 col mobile
- Collapsed "Completed Trips" section at bottom (▶ chevron + count badge, expands on click)

### `TripCard.jsx`
Props: `trip`, `currentUserId`

| Element | Detail |
|---|---|
| Role badge | HOST (blue) or MEMBER (green) — top-right corner |
| Trip emoji | Derived from `tripType`: 🚐 RV · ⛺ Tent · 🏕️ Glamping · 🏖️ Beach · ⛷️ Ski · 🚗 Road Trip · ✈️ Vacation · 🧺 Picnic · 🚶 Day Trip · 📍 Custom |
| Name | Bold, truncated at 20 chars |
| Destination | `📍 Colorado, USA` |
| Dates | `🗓 Jun 15 – Jun 22, 2026` |
| Type label | Small coloured label |
| Member count | `👥 5 members` |
| Status pill | Active (green dot) / Upcoming (blue dot) / Completed (grey) |
| Actions (active/upcoming) | "Open Trip" + "✉️ Invite" |
| Actions (completed) | "View Summary" only |

Completed cards rendered at 60% opacity, no Invite button.

### `NewTripModal.jsx`
Slide-up on mobile, centred modal on desktop.

Fields (in order):
1. **Trip Name** — text, required
2. **Destination** — text, required
3. **Trip Type** — dropdown: RV / Tent Camping / Glamping / Picnic / Day Trip / Beach / Ski/Snow / International Vacation / Road Trip / Custom
   - "Custom" selected → free-text input appears below
4. **Start Date** — date picker, `min = today`
5. **End Date** — date picker, `min = startDate + 1 day`
6. **Your Family Name** — text (creates the host's family group)

"Create Trip 🚀" submit button — disabled until all fields valid. Shows spinner on submit.

### `JoinPage.jsx`
- Reads invite code from URL → fetches trip from Firestore
- Shows trip preview card
- Family radio list: existing families + "Create a new family" option
- "Join Trip" button → writes docs → redirects to trip

### `TripPage.jsx` (stub for Sub-project 2)
- Navbar with "← My Trips" + trip name
- Trip details banner (destination, dates, type, member count)
- Placeholder tabs: Checklist · Expenses · Meals · Itinerary
- Member list panel grouped by family

---

## Section 5: Testing, CI/CD & Deployment

### Unit Tests (`tests/unit/` · Vitest + RTL)

| File | Covers |
|---|---|
| `firebase.test.js` | Auth init, `browserLocalPersistence` set, Google provider configured |
| `TripCard.test.jsx` | Renders all fields, HOST/MEMBER badge, completed opacity, Invite absent on completed |
| `NewTripModal.test.jsx` | Required fields, past date blocked, end before start blocked, Custom input appears, submit disabled when invalid |
| `Navbar.test.jsx` | Gmail photo renders, fallback avatar, Sign Out calls `signOut()`, back button on TripPage only |
| `HomePage.test.jsx` | Empty state message, card grid for 2+ trips, completed section collapsed by default |

### Integration Tests (`tests/integration/` · Firebase Emulator Suite)

| File | Covers |
|---|---|
| `auth.test.jsx` | Login → 0/1/2+ trip routing, Safari redirect flow, unauthenticated route guard |
| `tripFlow.test.jsx` | Create trip → invite code generated → join via code → family selection → member doc written → appears in Active trips |

### Jenkins Pipeline (`ci/Jenkinsfile`)

Stages: **Checkout → Install (`npm ci`) → Lint → Unit Tests → Integration Tests → Build → Deploy**

Firebase credentials are stored as Jenkins Credentials (never in source). The `.env` is generated at build time from Jenkins secrets injected as environment variables.

### GitHub Pages Deployment — Step-by-Step

#### One-time setup

1. Create GitHub repo named `tripmate`

2. Set base path in `vite.config.js`:
   ```js
   export default defineConfig({ base: '/tripmate/' })
   ```

3. Install deploy package:
   ```bash
   npm install --save-dev gh-pages
   ```

4. Add to `package.json` scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

5. Create `.env` at project root (never commit):
   ```
   VITE_FIREBASE_API_KEY=AIzaSyBLGsNTiudr0Z8fGc2xc4hK4Nl96_vwPHc
   VITE_FIREBASE_AUTH_DOMAIN=camp-cbf1d.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=camp-cbf1d
   VITE_FIREBASE_STORAGE_BUCKET=camp-cbf1d.firebasestorage.app
   VITE_FIREBASE_MSG_SENDER_ID=879899618290
   VITE_FIREBASE_APP_ID=1:879899618290:web:c71c1626e5a5fa0a96596b
   VITE_FIREBASE_MEASUREMENT_ID=G-9R2C1174BG
   ```

6. Create `.env.example` (safe to commit):
   ```
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MSG_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

7. Add to `.gitignore`:
   ```
   .env
   dist/
   node_modules/
   .superpowers/
   ```

8. In Firebase Console → Authentication → Authorized domains → add:
   `<your-github-username>.github.io`

9. In Google Cloud Console → Credentials → API key restrictions → add:
   `https://<your-github-username>.github.io`

10. In GitHub repo → Settings → Pages → Source: `gh-pages` branch → `/ (root)`

#### Every deploy
```bash
npm run deploy
```
Builds `dist/` and pushes to `gh-pages` branch automatically.

**Live URL:** `https://<username>.github.io/tripmate`

### `README.md` Contents
- Project overview + screenshot
- Prerequisites: Node 18+, Firebase project, GitHub account
- Quick start: `npm install` → copy `.env.example` → `.env` → fill values → `npm run dev`
- Deploy: `npm run deploy`
- Run tests: `npm run test`
- Links: `docs/firebase-setup.md`, `ci/jenkins-setup.md`

---

## Roles & Permissions Summary

| Action | Host | Member |
|---|---|---|
| Edit trip settings | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Delete trip | ✅ | ❌ |
| Share/Invite others | ✅ | ✅ |
| Contribute to checklists/expenses/meals | ✅ | ✅ |
| Create a new trip | ✅ (own trips) | ✅ (own trips) |

---

## Out of Scope (Future Sub-projects)

- Checklist feature
- Expense tracking (Splitwise-style)
- Meal planning
- Day-wise itinerary
- Push notifications
- Trip cover photos / maps integration
- Weather integration
