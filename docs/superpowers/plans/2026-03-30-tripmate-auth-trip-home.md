# TripMate Auth + Trip Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Gmail login page, trip home dashboard, invite/join flow, and all supporting infrastructure for TripMate Sub-project 1.

**Architecture:** React 18 + Vite SPA with HashRouter (GitHub Pages compatible), Firebase Auth (Google/Gmail only) with `browserLocalPersistence` for Safari ITP resilience, Firestore for trip/member/family data. Auth guard in App.jsx routes users based on trip count on app load.

**Tech Stack:** React 18, Vite, React Router v6 (HashRouter), Firebase 10 (Auth + Firestore), Vitest, React Testing Library, gh-pages, ESLint

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Vite entry point |
| `vite.config.js` | Vite + Vitest config, base path `/tripmate/` |
| `src/main.jsx` | React DOM mount |
| `src/firebase.js` | Firebase init, auth, db, googleProvider, persistence |
| `src/App.jsx` | HashRouter, routes, auth guard, initial redirect logic |
| `src/styles/global.css` | CSS variables, dark theme, base resets |
| `src/utils/trips.js` | `getTripStatus`, `getTripEmoji`, `getUserTrips`, `generateUniqueCode` |
| `src/utils/auth.js` | `upsertUser`, `isSafari` |
| `src/utils/firestore.js` | `createTrip`, `joinTrip`, `getTripByCode`, `isAlreadyMember`, `getTripFamilies` |
| `src/pages/LoginPage.jsx` | Immersive login UI, signInWithPopup + Safari redirect fallback |
| `src/pages/HomePage.jsx` | Empty state / card grid / completed section |
| `src/pages/JoinPage.jsx` | Join via invite code, family selection |
| `src/pages/TripPage.jsx` | Stub: banner + placeholder tabs + member list |
| `src/components/Navbar.jsx` | Top bar: logo, Gmail photo, name, email, Sign Out, back button |
| `src/components/TripCard.jsx` | Trip card with role badge, status pill, actions |
| `src/components/NewTripModal.jsx` | Create trip form with validation |
| `tests/setup.js` | Vitest + RTL global setup, Firebase mocks |
| `tests/unit/firebase.test.js` | Firebase init + persistence |
| `tests/unit/TripCard.test.jsx` | Card rendering + states |
| `tests/unit/NewTripModal.test.jsx` | Form validation |
| `tests/unit/Navbar.test.jsx` | Navbar elements + sign out |
| `tests/unit/HomePage.test.jsx` | Three states |
| `tests/integration/auth.test.jsx` | Login + routing by trip count |
| `tests/integration/tripFlow.test.jsx` | Create → invite → join flow |
| `ci/Jenkinsfile` | CI/CD pipeline |
| `ci/jenkins-setup.md` | Jenkins configuration guide |
| `docs/github-pages-hosting.md` | Deployment guide |
| `docs/firebase-setup.md` | Firebase + Firestore rules guide |
| `CLAUDE.md` | AI context for this project |
| `MEMORY.md` | Memory index |
| `README.md` | Project overview + quick start |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `index.html`
- Create: `vite.config.js`
- Create: `package.json`
- Create: `.env`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/main.jsx`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
cd C:/Users/Girish/Desktop/tripmate
npm create vite@latest . -- --template react
```

Expected: Vite project files created in `tripmate/`

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install firebase react-router-dom
```

Expected: `firebase` and `react-router-dom` appear in `package.json` dependencies.

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom gh-pages eslint @eslint/js eslint-plugin-react
```

- [ ] **Step 4: Replace `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/tripmate/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: { reporter: ['text', 'lcov'] },
  },
})
```

- [ ] **Step 5: Update `package.json` scripts**

Replace the `scripts` block with:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist",
  "test": "vitest",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint src --ext .js,.jsx"
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.env
.superpowers/
coverage/
```

- [ ] **Step 7: Create `.env`**

```
VITE_FIREBASE_API_KEY=AIzaSyBLGsNTiudr0Z8fGc2xc4hK4Nl96_vwPHc
VITE_FIREBASE_AUTH_DOMAIN=camp-cbf1d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=camp-cbf1d
VITE_FIREBASE_STORAGE_BUCKET=camp-cbf1d.firebasestorage.app
VITE_FIREBASE_MSG_SENDER_ID=879899618290
VITE_FIREBASE_APP_ID=1:879899618290:web:c71c1626e5a5fa0a96596b
VITE_FIREBASE_MEASUREMENT_ID=G-9R2C1174BG
```

- [ ] **Step 8: Create `.env.example`**

```
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MSG_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

- [ ] **Step 9: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="TripMate — Plan together. Adventure together." />
    <title>TripMate</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 11: Create `src/styles/global.css`**

```css
:root {
  --bg-primary: #0a1018;
  --bg-secondary: #0d1520;
  --text-primary: #ffffff;
  --text-secondary: #a8c8e8;
  --text-muted: #7a9ab8;
  --text-dim: #556677;
  --accent-blue: #4285F4;
  --accent-green: #34A853;
  --border-subtle: rgba(255,255,255,0.08);
  --border-card: rgba(255,255,255,0.1);
  --radius-card: 14px;
  --radius-btn: 9px;
  --shadow-card: 0 4px 20px rgba(0,0,0,0.3);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 100vh;
}
.loading-screen {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 12: Verify project runs**

```bash
npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173/tripmate/`

- [ ] **Step 13: Commit**

```bash
git init
git add index.html vite.config.js package.json package-lock.json .env.example .gitignore src/main.jsx src/styles/global.css
git commit -m "feat: scaffold Vite + React project with toolchain"
```

---

## Task 2: Test Infrastructure

**Files:**
- Create: `tests/setup.js`

- [ ] **Step 1: Create `tests/setup.js`**

```js
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  persistenceReady: Promise.resolve(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(function() { return {} }),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn(),
  browserLocalPersistence: 'LOCAL',
  setPersistence: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  arrayUnion: vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => new Date('2026-03-30')),
  Timestamp: { fromDate: vi.fn(d => d) },
}))
```

- [ ] **Step 2: Verify test infrastructure**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | head -20
```

Expected: Vitest starts (no test files found yet — that's fine, exit 0 or warning only)

- [ ] **Step 3: Commit**

```bash
git add tests/setup.js
git commit -m "feat: add Vitest + RTL test infrastructure with Firebase mocks"
```

---

## Task 3: Firebase Module

**Files:**
- Create: `src/firebase.js`
- Create: `tests/unit/firebase.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/firebase.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'

describe('firebase module', () => {
  it('exports auth, db, googleProvider, and persistenceReady', async () => {
    const mod = await import('../../src/firebase')
    expect(mod.auth).toBeDefined()
    expect(mod.db).toBeDefined()
    expect(mod.googleProvider).toBeDefined()
    expect(mod.persistenceReady).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- firebase.test.js
```

Expected: FAIL — module not found or exports missing

- [ ] **Step 3: Create `src/firebase.js`**

```js
import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider,
  browserLocalPersistence, setPersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Force indexedDB persistence — survives Safari ITP and cookie restrictions
export const persistenceReady = setPersistence(auth, browserLocalPersistence)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- firebase.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/firebase.js tests/unit/firebase.test.js
git commit -m "feat: add Firebase module with browserLocalPersistence for Safari ITP"
```

---

## Task 4: Utility Functions

**Files:**
- Create: `src/utils/trips.js`
- Create: `src/utils/auth.js`
- Create: `src/utils/firestore.js`

- [ ] **Step 1: Create `src/utils/trips.js`**

```js
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export function getTripStatus(trip) {
  const now = new Date()
  const start = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate)
  const end   = trip.endDate?.toDate   ? trip.endDate.toDate()   : new Date(trip.endDate)
  if (end < now)   return 'completed'
  if (start > now) return 'upcoming'
  return 'active'
}

export function getTripEmoji(tripType) {
  const map = {
    'RV': '🚐',
    'Tent Camping': '⛺',
    'Glamping': '🏕️',
    'Picnic': '🧺',
    'Day Trip': '🚶',
    'Beach': '🏖️',
    'Ski/Snow': '⛷️',
    'International Vacation': '✈️',
    'Road Trip': '🚗',
  }
  return map[tripType] || '📍'
}

export async function getUserTrips(uid) {
  const q = query(collection(db, 'trips'), where('memberIds', 'array-contains', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ tripId: d.id, ...d.data() }))
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function generateUniqueCode(db) {
  const { getDoc, doc } = await import('firebase/firestore')
  let code = generateInviteCode()
  let snap = await getDoc(doc(db, 'inviteCodes', code))
  while (snap.exists()) {
    code = generateInviteCode()
    snap = await getDoc(doc(db, 'inviteCodes', code))
  }
  return code
}
```

- [ ] **Step 2: Create `src/utils/auth.js`**

```js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function upsertUser(firebaseUser) {
  await setDoc(
    doc(db, 'users', firebaseUser.uid),
    {
      uid:         firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email:       firebaseUser.email,
      photoURL:    firebaseUser.photoURL,
      createdAt:   serverTimestamp(),
    },
    { merge: true }
  )
}

export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}
```

- [ ] **Step 3: Create `src/utils/firestore.js`**

```js
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, arrayUnion, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { generateUniqueCode } from './trips'

export async function createTrip({ name, destination, tripType, startDate, endDate, familyName, host }) {
  const inviteCode = await generateUniqueCode(db)

  const tripRef = await addDoc(collection(db, 'trips'), {
    name, destination, tripType,
    startDate: Timestamp.fromDate(new Date(startDate)),
    endDate:   Timestamp.fromDate(new Date(endDate)),
    hostId:    host.uid,
    memberIds: [host.uid],
    inviteCode,
    createdAt: serverTimestamp(),
  })
  const tripId = tripRef.id

  await setDoc(doc(db, 'inviteCodes', inviteCode), {
    code: inviteCode, tripId, hostId: host.uid,
  })

  const familyRef = await addDoc(collection(db, 'trips', tripId, 'families'), {
    name: familyName, createdBy: host.uid,
    memberIds: [host.uid], createdAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'trips', tripId, 'members', host.uid), {
    uid: host.uid, displayName: host.displayName,
    email: host.email, photoURL: host.photoURL,
    role: 'host', familyId: familyRef.id,
    joinedAt: serverTimestamp(),
  })

  return tripId
}

export async function joinTrip({ tripId, uid, displayName, email, photoURL, familyId, newFamilyName }) {
  let resolvedFamilyId = familyId

  if (!familyId && newFamilyName) {
    const familyRef = await addDoc(collection(db, 'trips', tripId, 'families'), {
      name: newFamilyName, createdBy: uid,
      memberIds: [uid], createdAt: serverTimestamp(),
    })
    resolvedFamilyId = familyRef.id
  } else {
    await updateDoc(doc(db, 'trips', tripId, 'families', familyId), {
      memberIds: arrayUnion(uid),
    })
  }

  await setDoc(doc(db, 'trips', tripId, 'members', uid), {
    uid, displayName, email, photoURL,
    role: 'member', familyId: resolvedFamilyId,
    joinedAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'trips', tripId), { memberIds: arrayUnion(uid) })
}

export async function getTripByCode(inviteCode) {
  const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode))
  if (!codeSnap.exists()) return null
  const { tripId } = codeSnap.data()
  const tripSnap = await getDoc(doc(db, 'trips', tripId))
  if (!tripSnap.exists()) return null
  return { tripId, ...tripSnap.data() }
}

export async function isAlreadyMember(tripId, uid) {
  const snap = await getDoc(doc(db, 'trips', tripId, 'members', uid))
  return snap.exists()
}

export async function getTripFamilies(tripId) {
  const snap = await getDocs(collection(db, 'trips', tripId, 'families'))
  return snap.docs.map(d => ({ familyId: d.id, ...d.data() }))
}

export async function getTripMembers(tripId) {
  const snap = await getDocs(collection(db, 'trips', tripId, 'members'))
  return snap.docs.map(d => ({ memberId: d.id, ...d.data() }))
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/
git commit -m "feat: add trip utilities (status, emoji, CRUD, invite code generation)"
```

---

## Task 5: App.jsx — Router + Auth Guard

**Files:**
- Create: `src/App.jsx`
- Create: `tests/unit/App.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/App.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { onAuthStateChanged } from 'firebase/auth'
import App from '../../src/App'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
}))

describe('App auth guard', () => {
  it('shows loading screen while auth resolves', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})
    render(<App />)
    expect(document.querySelector('.loading-screen')).toBeTruthy()
  })

  it('redirects to login when no user', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb(null)
      return () => {}
    })
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy()
    })
  })

  it('redirects to /home when user has 0 trips', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => {
      cb({ uid: 'user1', displayName: 'Test', email: 't@gmail.com', photoURL: '' })
      return () => {}
    })
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- App.test.jsx
```

Expected: FAIL — App not found

- [ ] **Step 3: Create `src/App.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { getUserTrips, getTripStatus } from './utils/trips'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TripPage from './pages/TripPage'
import JoinPage from './pages/JoinPage'

function AuthRedirect({ user }) {
  const navigate = useNavigate()

  useEffect(() => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode')
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode')
      navigate(`/join/${pendingCode}`, { replace: true })
      return
    }
    getUserTrips(user.uid).then(trips => {
      const active = trips.filter(t => getTripStatus(t) !== 'completed')
      if (active.length === 1) {
        navigate(`/trip/${active[0].tripId}`, { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    })
  }, [user.uid, navigate])

  return <div className="loading-screen" />
}

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthState({ loading: false, user })
    })
    return unsub
  }, [])

  if (authState.loading) return <div className="loading-screen" aria-label="Loading" />

  const { user } = authState

  return (
    <HashRouter>
      <Routes>
        <Route path="/"
          element={user ? <AuthRedirect user={user} /> : <LoginPage />}
        />
        <Route path="/home"
          element={user ? <HomePage user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="/trip/:tripId"
          element={user ? <TripPage user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="/join/:inviteCode"
          element={<JoinPage user={user} />}
        />
        <Route path="*"
          element={<Navigate to={user ? '/home' : '/'} replace />}
        />
      </Routes>
    </HashRouter>
  )
}
```

- [ ] **Step 4: Create stub pages so App compiles**

Create `src/pages/LoginPage.jsx`:
```jsx
export default function LoginPage() {
  return <div data-testid="login-page">Login</div>
}
```

Create `src/pages/HomePage.jsx`:
```jsx
export default function HomePage({ user }) {
  return <div data-testid="home-page">Home</div>
}
```

Create `src/pages/TripPage.jsx`:
```jsx
export default function TripPage({ user }) {
  return <div data-testid="trip-page">Trip</div>
}
```

Create `src/pages/JoinPage.jsx`:
```jsx
export default function JoinPage({ user }) {
  return <div data-testid="join-page">Join</div>
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- App.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/pages/
git commit -m "feat: add App router with auth guard and 0/1/2+ trip redirect logic"
```

---

## Task 6: Navbar Component

**Files:**
- Modify: `src/components/Navbar.jsx`
- Create: `tests/unit/Navbar.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/Navbar.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import Navbar from '../../src/components/Navbar'

const mockUser = {
  uid: 'u1', displayName: 'Girish Kumar',
  email: 'girish@gmail.com', photoURL: 'https://photo.url/img.jpg',
}

function renderNavbar(props = {}) {
  return render(
    <MemoryRouter initialEntries={[props.path || '/home']}>
      <Routes>
        <Route path="*" element={<Navbar user={mockUser} {...props} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  it('shows display name and email', () => {
    renderNavbar()
    expect(screen.getByText('Girish Kumar')).toBeTruthy()
    expect(screen.getByText('girish@gmail.com')).toBeTruthy()
  })

  it('shows Gmail photo', () => {
    renderNavbar()
    const img = screen.getByAltText('Girish Kumar')
    expect(img.src).toContain('photo.url')
  })

  it('shows fallback initial avatar when photo fails', () => {
    render(
      <MemoryRouter><Navbar user={{ ...mockUser, photoURL: null }} /></MemoryRouter>
    )
    expect(screen.getByText('G')).toBeTruthy()
  })

  it('calls signOut on Sign Out click', async () => {
    vi.mocked(signOut).mockResolvedValue()
    renderNavbar()
    fireEvent.click(screen.getByText('Sign Out'))
    expect(signOut).toHaveBeenCalled()
  })

  it('shows My Trips back button when showBack is true', () => {
    renderNavbar({ showBack: true, tripName: 'Rocky Mountains' })
    expect(screen.getByText('← My Trips')).toBeTruthy()
    expect(screen.getByText('Rocky Mountains')).toBeTruthy()
  })

  it('hides My Trips back button by default', () => {
    renderNavbar()
    expect(screen.queryByText('← My Trips')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- Navbar.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create `src/components/Navbar.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function Navbar({ user, showBack = false, tripName = '' }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut(auth).then(() => navigate('/'))
  }

  const initial = user.displayName?.[0]?.toUpperCase() || '?'

  return (
    <nav style={{
      background: '#0a1018',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBack && (
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'none', border: 'none', color: '#a8c8e8',
              fontSize: 13, cursor: 'pointer', padding: '4px 8px',
              borderRadius: 6, marginRight: 4,
            }}
          >
            ← My Trips
          </button>
        )}
        <span style={{ fontSize: 20 }}>🏕️</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
          TripMate
        </span>
        {showBack && tripName && (
          <span style={{
            color: '#a8c8e8', fontSize: 13,
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tripName.length > 24 ? tripName.slice(0, 24) + '…' : tripName}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{user.displayName}</div>
          <div style={{ color: '#a8c8e8', fontSize: 10 }}>{user.email}</div>
        </div>

        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4285F4,#34A853)',
          display: user.photoURL ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 13,
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          {initial}
        </div>

        <button onClick={handleSignOut} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 7, padding: '5px 10px',
          color: '#cdd9f0', fontSize: 11, cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- Navbar.test.jsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.jsx tests/unit/Navbar.test.jsx
git commit -m "feat: add Navbar with Gmail photo, fallback avatar, sign out, back button"
```

---

## Task 7: TripCard Component

**Files:**
- Create: `src/components/TripCard.jsx`
- Create: `tests/unit/TripCard.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/TripCard.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripCard from '../../src/components/TripCard'

vi.mock('../../src/utils/trips', () => ({
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))

const baseTrip = {
  tripId: 'trip1', name: 'Rocky Mountains',
  destination: 'Colorado, USA', tripType: 'Tent Camping',
  startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
  memberIds: ['u1', 'u2', 'u3'], hostId: 'u1',
  inviteCode: 'RTX924',
}

describe('TripCard', () => {
  it('renders trip name, destination, type, member count', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('Rocky Mountains')).toBeTruthy()
    expect(screen.getByText(/Colorado/)).toBeTruthy()
    expect(screen.getByText(/Tent Camping/)).toBeTruthy()
    expect(screen.getByText(/3 members/)).toBeTruthy()
  })

  it('shows HOST badge for trip creator', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('HOST')).toBeTruthy()
  })

  it('shows MEMBER badge for non-host', () => {
    render(<TripCard trip={baseTrip} currentUserId="u2" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText('MEMBER')).toBeTruthy()
  })

  it('shows Invite button for active/upcoming trips', () => {
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.getByText(/Invite/)).toBeTruthy()
  })

  it('hides Invite button and shows View Summary for completed trips', () => {
    const { getTripStatus } = require('../../src/utils/trips')
    vi.mocked(getTripStatus).mockReturnValueOnce('completed')
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={vi.fn()} onInvite={vi.fn()} />)
    expect(screen.queryByText(/Invite/)).toBeNull()
    expect(screen.getByText('View Summary')).toBeTruthy()
  })

  it('calls onOpen when Open Trip is clicked', () => {
    const onOpen = vi.fn()
    render(<TripCard trip={baseTrip} currentUserId="u1" onOpen={onOpen} onInvite={vi.fn()} />)
    fireEvent.click(screen.getByText('Open Trip'))
    expect(onOpen).toHaveBeenCalledWith('trip1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- TripCard.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create `src/components/TripCard.jsx`**

```jsx
import { getTripStatus, getTripEmoji } from '../utils/trips'

const STATUS_COLORS = {
  active:    { dot: '#34A853', label: 'Active' },
  upcoming:  { dot: '#4285F4', label: 'Upcoming' },
  completed: { dot: '#556677', label: 'Completed' },
}

export default function TripCard({ trip, currentUserId, onOpen, onInvite }) {
  const status   = getTripStatus(trip)
  const emoji    = getTripEmoji(trip.tripType)
  const isHost   = trip.hostId === currentUserId
  const isDone   = status === 'completed'
  const { dot, label } = STATUS_COLORS[status]

  const start = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate)
  const end   = trip.endDate?.toDate   ? trip.endDate.toDate()   : new Date(trip.endDate)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{
      background: isDone ? 'rgba(255,255,255,0.04)' : 'linear-gradient(145deg,#1a3a5c,#1a3a2a)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-card)',
      padding: 16, position: 'relative',
      opacity: isDone ? 0.6 : 1,
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Role badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: isHost ? '#4285F4' : '#34A853',
        borderRadius: 5, padding: '2px 7px',
        fontSize: 9, color: '#fff', fontWeight: 700,
      }}>
        {isHost ? 'HOST' : 'MEMBER'}
      </div>

      <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
        {trip.name.length > 20 ? trip.name.slice(0, 20) + '…' : trip.name}
      </div>
      <div style={{ color: '#a8c8e8', fontSize: 11, marginBottom: 2 }}>📍 {trip.destination}</div>
      <div style={{ color: '#a8c8e8', fontSize: 11, marginBottom: 8 }}>
        🗓 {fmt(start)} – {fmt(end)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />
          <span style={{ color: '#7eb8f7', fontSize: 10 }}>{trip.tripType} · {label}</span>
        </div>
        <span style={{ color: '#a8c8e8', fontSize: 10 }}>👥 {trip.memberIds.length} members</span>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        {isDone ? (
          <div onClick={() => onOpen(trip.tripId)} style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7, padding: 5, textAlign: 'center',
            fontSize: 10, color: '#556677', cursor: 'pointer',
          }}>View Summary</div>
        ) : (
          <>
            <div onClick={() => onOpen(trip.tripId)} style={{
              flex: 1, background: 'rgba(66,133,244,0.2)',
              border: '1px solid rgba(66,133,244,0.4)',
              borderRadius: 7, padding: 5, textAlign: 'center',
              fontSize: 10, color: '#7eb8f7', cursor: 'pointer',
            }}>Open Trip</div>
            <div onClick={() => onInvite(trip)} style={{
              background: 'rgba(52,168,83,0.2)',
              border: '1px solid rgba(52,168,83,0.4)',
              borderRadius: 7, padding: '5px 10px', textAlign: 'center',
              fontSize: 10, color: '#6ed48a', cursor: 'pointer',
            }}>✉️ Invite</div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- TripCard.test.jsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/TripCard.jsx tests/unit/TripCard.test.jsx
git commit -m "feat: add TripCard with HOST/MEMBER badge, status pill, and action buttons"
```

---

## Task 8: NewTripModal Component

**Files:**
- Create: `src/components/NewTripModal.jsx`
- Create: `tests/unit/NewTripModal.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/NewTripModal.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewTripModal from '../../src/components/NewTripModal'

vi.mock('../../src/utils/firestore', () => ({
  createTrip: vi.fn(() => Promise.resolve('trip-123')),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('NewTripModal', () => {
  it('renders all form fields', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Trip Name/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Destination/i)).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Family Name/i)).toBeTruthy()
  })

  it('submit button is disabled when fields are empty', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByText(/Create Trip/)).toBeDisabled()
  })

  it('shows custom type input when Custom is selected', async () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Custom')
    expect(screen.getByPlaceholderText(/Enter custom trip type/i)).toBeTruthy()
  })

  it('blocks past start dates via min attribute', () => {
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={vi.fn()} />)
    const today = new Date().toISOString().split('T')[0]
    const startInput = screen.getByLabelText(/Start Date/i)
    expect(startInput.min).toBe(today)
  })

  it('calls createTrip and onCreated on valid submit', async () => {
    const onCreated = vi.fn()
    const { createTrip } = await import('../../src/utils/firestore')
    render(<NewTripModal user={mockUser} onClose={vi.fn()} onCreated={onCreated} />)

    await userEvent.type(screen.getByPlaceholderText(/Trip Name/i), 'Rocky Trip')
    await userEvent.type(screen.getByPlaceholderText(/Destination/i), 'Colorado')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Tent Camping')
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2026-06-15')
    await userEvent.type(screen.getByLabelText(/End Date/i), '2026-06-22')
    await userEvent.type(screen.getByPlaceholderText(/Family Name/i), 'Kumar Family')

    fireEvent.click(screen.getByText(/Create Trip/))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('trip-123'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- NewTripModal.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create `src/components/NewTripModal.jsx`**

```jsx
import { useState } from 'react'
import { createTrip } from '../utils/firestore'

const TRIP_TYPES = [
  'RV', 'Tent Camping', 'Glamping', 'Picnic',
  'Day Trip', 'Beach', 'Ski/Snow', 'International Vacation', 'Road Trip', 'Custom',
]

const today = new Date().toISOString().split('T')[0]

export default function NewTripModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', destination: '', tripType: '', customType: '',
    startDate: '', endDate: '', familyName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const minEndDate = form.startDate
    ? new Date(new Date(form.startDate).getTime() + 86400000).toISOString().split('T')[0]
    : today

  const resolvedType = form.tripType === 'Custom' ? form.customType : form.tripType

  const valid =
    form.name && form.destination && resolvedType &&
    form.startDate && form.endDate && form.familyName &&
    form.endDate > form.startDate

  const handleSubmit = async () => {
    if (!valid) return
    setLoading(true)
    setError(null)
    try {
      const tripId = await createTrip({
        name: form.name, destination: form.destination,
        tripType: resolvedType, startDate: form.startDate,
        endDate: form.endDate, familyName: form.familyName,
        host: { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL },
      })
      onCreated(tripId)
    } catch (e) {
      setError('Failed to create trip. Please try again.')
      setLoading(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 16,
  }
  const modal = {
    background: '#0d1520', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
  }
  const input = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
    padding: '9px 12px', color: '#fff', fontSize: 13, marginBottom: 12,
  }
  const label = { color: '#a8c8e8', fontSize: 11, marginBottom: 4, display: 'block' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 20 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>New Trip 🚀</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#a8c8e8', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        <input style={input} placeholder="Trip Name *" value={form.name} onChange={e => set('name', e.target.value)} />
        <input style={input} placeholder="Destination *" value={form.destination} onChange={e => set('destination', e.target.value)} />

        <select style={input} value={form.tripType} onChange={e => set('tripType', e.target.value)}>
          <option value="">Select Trip Type *</option>
          {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {form.tripType === 'Custom' && (
          <input style={input} placeholder="Enter custom trip type *" value={form.customType} onChange={e => set('customType', e.target.value)} />
        )}

        <label style={label} htmlFor="startDate">Start Date *</label>
        <input id="startDate" type="date" style={input} min={today}
          aria-label="Start Date"
          value={form.startDate} onChange={e => { set('startDate', e.target.value); set('endDate', '') }} />

        <label style={label} htmlFor="endDate">End Date *</label>
        <input id="endDate" type="date" style={input} min={minEndDate}
          aria-label="End Date"
          value={form.endDate} onChange={e => set('endDate', e.target.value)} />

        <input style={input} placeholder="Your Family Name *"
          value={form.familyName} onChange={e => set('familyName', e.target.value)} />

        {error && <div style={{ color:'#ff6b6b', fontSize:11, marginBottom:10 }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!valid || loading}
          style={{
            width:'100%', background: valid ? '#4285F4' : 'rgba(66,133,244,0.3)',
            border:'none', borderRadius: 10, padding:'11px 0',
            color:'#fff', fontSize:14, fontWeight:600,
            cursor: valid ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Creating…' : 'Create Trip 🚀'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- NewTripModal.test.jsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/NewTripModal.jsx tests/unit/NewTripModal.test.jsx
git commit -m "feat: add NewTripModal with full validation, date rules, custom type input"
```

---

## Task 9: HomePage

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Create: `tests/unit/HomePage.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/HomePage.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getTripStatus, getUserTrips } from '../../src/utils/trips'
import HomePage from '../../src/pages/HomePage'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(),
  getTripStatus: vi.fn(),
  getTripEmoji: vi.fn(() => '⛺'),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('HomePage', () => {
  it('shows empty state when user has no trips', async () => {
    vi.mocked(getUserTrips).mockResolvedValue([])
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/No trips yet/i)).toBeTruthy()
    })
  })

  it('shows card grid when user has 2+ trips', async () => {
    const trips = [
      { tripId: 't1', name: 'Trip A', destination: 'USA', tripType: 'Tent Camping',
        startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ABC123' },
      { tripId: 't2', name: 'Trip B', destination: 'Canada', tripType: 'RV',
        startDate: new Date('2026-07-01'), endDate: new Date('2026-07-07'),
        memberIds: ['u1'], hostId: 'u2', inviteCode: 'DEF456' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(trips)
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Trip A')).toBeTruthy()
      expect(screen.getByText('Trip B')).toBeTruthy()
    })
  })

  it('shows collapsed completed section', async () => {
    const completed = [
      { tripId: 't3', name: 'Old Trip', destination: 'Beach', tripType: 'Beach',
        startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ZZZ999' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(completed)
    vi.mocked(getTripStatus).mockReturnValue('completed')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/Completed Trips/)).toBeTruthy()
      expect(screen.queryByText('Old Trip')).toBeNull()
    })
  })

  it('expands completed section on click', async () => {
    const completed = [
      { tripId: 't3', name: 'Old Trip', destination: 'Beach', tripType: 'Beach',
        startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07'),
        memberIds: ['u1'], hostId: 'u1', inviteCode: 'ZZZ999' },
    ]
    vi.mocked(getUserTrips).mockResolvedValue(completed)
    vi.mocked(getTripStatus).mockReturnValue('completed')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/Completed Trips/))
    fireEvent.click(screen.getByText(/Completed Trips/))
    await waitFor(() => expect(screen.getByText('Old Trip')).toBeTruthy())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- HomePage.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Replace `src/pages/HomePage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserTrips, getTripStatus } from '../utils/trips'
import Navbar from '../components/Navbar'
import TripCard from '../components/TripCard'
import NewTripModal from '../components/NewTripModal'
import InvitePopup from '../components/InvitePopup'

export default function HomePage({ user }) {
  const [trips, setTrips]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [inviteTrip, setInviteTrip] = useState(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const navigate = useNavigate()

  const loadTrips = () => {
    getUserTrips(user.uid).then(t => { setTrips(t); setLoading(false) })
  }

  useEffect(() => { loadTrips() }, [user.uid])

  const active    = trips.filter(t => getTripStatus(t) !== 'completed')
  const completed = trips.filter(t => getTripStatus(t) === 'completed')

  if (loading) return (
    <div>
      <Navbar user={user} />
      <div className="loading-screen" />
    </div>
  )

  return (
    <div data-testid="home-page" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Navbar user={user} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {active.length === 0 && completed.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏕️</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              No trips yet
            </div>
            <div style={{ color: '#7a9ab8', fontSize: 14, marginBottom: 28 }}>
              Ready to plan your first adventure?
            </div>
            <button onClick={() => setShowModal(true)} style={{
              background: '#4285F4', border: 'none', borderRadius: 12,
              padding: '12px 28px', color: '#fff', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}>
              + Create Trip
            </button>
          </div>
        ) : (
          <>
            {/* Active & Upcoming */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
              <div>
                <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>Active &amp; Upcoming Trips</div>
                <div style={{ color:'#7a9ab8', fontSize:11, marginTop:2 }}>{active.length} trip{active.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowModal(true)} style={{
                background: '#4285F4', border: 'none', borderRadius: 9,
                padding: '8px 14px', color: '#fff', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(66,133,244,0.4)',
              }}>
                + New Trip
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14, marginBottom: 28,
            }}>
              {active.map(trip => (
                <TripCard
                  key={trip.tripId} trip={trip} currentUserId={user.uid}
                  onOpen={id => navigate(`/trip/${id}`)}
                  onInvite={t => setInviteTrip(t)}
                />
              ))}
            </div>

            {/* Completed — collapsible */}
            {completed.length > 0 && (
              <div style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
                <div
                  onClick={() => setCompletedOpen(o => !o)}
                  style={{
                    background:'rgba(255,255,255,0.04)', padding:'12px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#7a9ab8', fontSize:13, fontWeight:700 }}>Completed Trips</span>
                    <span style={{
                      background:'rgba(255,255,255,0.08)', borderRadius:10,
                      padding:'1px 8px', fontSize:10, color:'#7a9ab8',
                    }}>{completed.length}</span>
                  </div>
                  <span style={{ color:'#7a9ab8', fontSize:14 }}>{completedOpen ? '▼' : '▶'}</span>
                </div>

                {completedOpen && (
                  <div style={{
                    background:'rgba(255,255,255,0.02)', padding:14,
                    borderTop:'1px solid rgba(255,255,255,0.06)',
                    display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14,
                  }}>
                    {completed.map(trip => (
                      <TripCard
                        key={trip.tripId} trip={trip} currentUserId={user.uid}
                        onOpen={id => navigate(`/trip/${id}`)}
                        onInvite={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <NewTripModal
          user={user}
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); navigate(`/trip/${id}`) }}
        />
      )}

      {inviteTrip && (
        <InvitePopup trip={inviteTrip} onClose={() => setInviteTrip(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- HomePage.test.jsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.jsx tests/unit/HomePage.test.jsx
git commit -m "feat: add HomePage with empty state, card grid, collapsible completed section"
```

---

## Task 10: InvitePopup Component

**Files:**
- Create: `src/components/InvitePopup.jsx`

- [ ] **Step 1: Create `src/components/InvitePopup.jsx`**

```jsx
import { useState } from 'react'

export default function InvitePopup({ trip, onClose }) {
  const [copied, setCopied] = useState(false)
  const base = window.location.origin + window.location.pathname.replace(/\/$/, '')
  const link = `${base}/#/join/${trip.inviteCode}`

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:300, padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'#0d1520', border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:16, padding:28, width:'100%', maxWidth:380,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>✉️ Invite to {trip.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#a8c8e8', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        <div style={{
          background:'rgba(255,255,255,0.06)', borderRadius:8,
          padding:'9px 12px', fontSize:11, color:'#a8c8e8',
          wordBreak:'break-all', marginBottom:10,
        }}>
          {link}
        </div>

        <button onClick={copyLink} style={{
          width:'100%', background: copied ? '#34A853' : '#4285F4',
          border:'none', borderRadius:9, padding:'10px 0',
          color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
          marginBottom:14, transition:'background 0.2s',
        }}>
          {copied ? '✓ Copied!' : 'Copy Invite Link'}
        </button>

        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, textAlign:'center' }}>
          or share code: <strong style={{ color:'#a8c8e8', letterSpacing:2 }}>{trip.inviteCode}</strong>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InvitePopup.jsx
git commit -m "feat: add InvitePopup with copy-to-clipboard invite link and raw code"
```

---

## Task 11: LoginPage

**Files:**
- Modify: `src/pages/LoginPage.jsx`
- Create: `tests/unit/LoginPage.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/LoginPage.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signInWithPopup, getRedirectResult } from 'firebase/auth'
import LoginPage from '../../src/pages/LoginPage'

vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(() => Promise.resolve()),
  isSafari: vi.fn(() => false),
}))

describe('LoginPage', () => {
  it('renders app name and login button', () => {
    vi.mocked(getRedirectResult).mockResolvedValue(null)
    render(<LoginPage />)
    expect(screen.getByText('TripMate')).toBeTruthy()
    expect(screen.getByText('Login with Gmail')).toBeTruthy()
    expect(screen.getByText(/Gmail accounts only/)).toBeTruthy()
  })

  it('calls signInWithPopup when Login with Gmail is clicked', async () => {
    vi.mocked(getRedirectResult).mockResolvedValue(null)
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { uid: 'u1' } })
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Login with Gmail'))
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalled())
  })

  it('shows error message on sign-in failure', async () => {
    vi.mocked(getRedirectResult).mockResolvedValue(null)
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('popup blocked'))
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Login with Gmail'))
    await waitFor(() => expect(screen.getByText(/Sign-in failed/i)).toBeTruthy())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- LoginPage.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Replace `src/pages/LoginPage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { upsertUser, isSafari } from '../utils/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Handle Safari redirect result on mount
  useEffect(() => {
    getRedirectResult(auth).then(async result => {
      if (result?.user) await upsertUser(result.user)
    }).catch(() => {})
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isSafari()) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        const result = await signInWithPopup(auth, googleProvider)
        await upsertUser(result.user)
      }
    } catch {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div data-testid="login-page" style={{
      position: 'relative', minHeight: '100vh', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,#0a0e1a 0%,#1a2744 30%,#2d4a3e 70%,#1a3020 100%)' }} />

      {/* Stars */}
      <div style={{ position:'absolute', top:'8%', left:'15%', width:2, height:2, background:'#fff', borderRadius:'50%',
        boxShadow:'30px 10px 0 #fff,60px -5px 0 #fffde7,90px 15px 0 #fff,120px 5px 0 #fffde7,150px -8px 0 #fff,180px 12px 0 #fff', opacity:0.8 }} />

      {/* Moon */}
      <div style={{ position:'absolute', top:'10%', right:'18%', width:28, height:28,
        background:'#fffde7', borderRadius:'50%', boxShadow:'0 0 20px 6px rgba(255,253,200,0.35)' }} />

      {/* Mountains */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:140, overflow:'hidden' }}>
        <svg viewBox="0 0 800 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width:'100%', height:'100%' }}>
          <polygon points="0,140 120,40 240,100 360,20 480,90 600,30 720,80 800,50 800,140" fill="#0d2b1a"/>
          <polygon points="0,140 80,70 180,110 300,55 420,105 540,60 660,95 800,65 800,140" fill="#112d1e"/>
        </svg>
      </div>

      {/* Campfire glow */}
      <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
        width:60, height:20, background:'radial-gradient(ellipse,rgba(255,140,0,0.4),transparent 70%)', borderRadius:'50%' }} />

      {/* Floating emojis */}
      {[
        { e:'🏕️', t:'18%', l:'8%',  r:undefined, b:undefined, s:22, rot:-8 },
        { e:'🚐', t:'22%', r:'10%', l:undefined,  b:undefined, s:20, rot:6  },
        { e:'⛺', b:'28%', l:'6%',  t:undefined,  r:undefined, s:18, rot:-5 },
        { e:'🌲', b:'32%', r:'7%',  t:undefined,  l:undefined, s:18, rot:8  },
        { e:'🔥', t:'40%', l:'12%', r:undefined,  b:undefined, s:16, rot:0  },
        { e:'🌄', t:'38%', r:'12%', l:undefined,  b:undefined, s:16, rot:0  },
        { e:'🎒', b:'42%', l:'20%', t:undefined,  r:undefined, s:14, rot:0  },
        { e:'🗺️', b:'45%', r:'20%', t:undefined,  l:undefined, s:14, rot:0  },
      ].map(({ e, t, l, r, b, s, rot }) => (
        <div key={e} style={{
          position:'absolute', top:t, left:l, right:r, bottom:b,
          fontSize:s, opacity:0.8, transform:`rotate(${rot}deg)`,
        }}>{e}</div>
      ))}

      {/* Frosted glass card */}
      <div style={{
        position:'relative', zIndex:10,
        background:'rgba(10,20,40,0.6)',
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
        border:'1px solid rgba(255,255,255,0.18)',
        borderRadius:20, padding:'32px 28px',
        width:'90%', maxWidth:320, textAlign:'center',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize:38, marginBottom:6 }}>🏕️</div>
        <div style={{ color:'#fff', fontSize:22, fontWeight:700, letterSpacing:1.5, marginBottom:4 }}>TripMate</div>
        <div style={{ color:'#a8d5b5', fontSize:12, marginBottom:22, letterSpacing:0.5 }}>
          Plan together. Adventure together.
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.12)', marginBottom:20 }} />

        {error && (
          <div style={{ color:'#ff6b6b', fontSize:11, marginBottom:12 }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width:'100%', background:'#4285F4', border:'none', borderRadius:10,
            padding:'11px 16px', display:'flex', alignItems:'center',
            justifyContent:'center', gap:10, cursor:'pointer',
            boxShadow:'0 4px 14px rgba(66,133,244,0.45)', opacity: loading ? 0.7 : 1,
          }}
        >
          <div style={{
            background:'#fff', borderRadius:'50%', width:20, height:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:'#4285F4', flexShrink:0,
          }}>G</div>
          <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>
            {loading ? 'Signing in…' : 'Login with Gmail'}
          </span>
        </button>

        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginTop:16 }}>
          Gmail accounts only · Secure sign-in
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- LoginPage.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.jsx tests/unit/LoginPage.test.jsx
git commit -m "feat: add LoginPage with immersive background, frosted glass card, Safari redirect"
```

---

## Task 12: JoinPage

**Files:**
- Modify: `src/pages/JoinPage.jsx`
- Create: `tests/unit/JoinPage.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/JoinPage.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinPage from '../../src/pages/JoinPage'

vi.mock('../../src/utils/firestore', () => ({
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
}))

const mockUser = { uid: 'u2', displayName: 'Jane', email: 'j@gmail.com', photoURL: '' }

const mockTrip = {
  tripId: 't1', name: 'Rocky Mountains', destination: 'Colorado, USA',
  tripType: 'Tent Camping',
  startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
  memberIds: ['u1'], hostId: 'u1', inviteCode: 'RTX924',
}

function renderJoin(code = 'RTX924', user = mockUser) {
  return render(
    <MemoryRouter initialEntries={[`/join/${code}`]}>
      <Routes>
        <Route path="/join/:inviteCode" element={<JoinPage user={user} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('JoinPage', () => {
  it('shows login prompt when user is null', () => {
    renderJoin('RTX924', null)
    expect(screen.getByText(/Sign in to join/i)).toBeTruthy()
  })

  it('shows trip preview after loading', async () => {
    const { getTripByCode } = await import('../../src/utils/firestore')
    vi.mocked(getTripByCode).mockResolvedValue(mockTrip)
    renderJoin()
    await waitFor(() => expect(screen.getByText('Rocky Mountains')).toBeTruthy())
    expect(screen.getByText(/Colorado/)).toBeTruthy()
  })

  it('shows error for invalid invite code', async () => {
    const { getTripByCode } = await import('../../src/utils/firestore')
    vi.mocked(getTripByCode).mockResolvedValue(null)
    renderJoin('BADCODE')
    await waitFor(() => expect(screen.getByText(/Invalid invite code/i)).toBeTruthy())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- JoinPage.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Replace `src/pages/JoinPage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTripByCode, isAlreadyMember, getTripFamilies, joinTrip } from '../utils/firestore'
import { getTripEmoji } from '../utils/trips'
import Navbar from '../components/Navbar'

export default function JoinPage({ user }) {
  const { inviteCode } = useParams()
  const navigate       = useNavigate()
  const [trip, setTrip]         = useState(null)
  const [families, setFamilies] = useState([])
  const [status, setStatus]     = useState('loading') // loading | ready | invalid | already
  const [selectedFamily, setSelectedFamily] = useState('')
  const [newFamilyName, setNewFamilyName]   = useState('')
  const [joining, setJoining]   = useState(false)

  // Store invite code for post-login redirect
  useEffect(() => {
    if (!user) sessionStorage.setItem('pendingInviteCode', inviteCode)
  }, [user, inviteCode])

  useEffect(() => {
    if (!user) return
    getTripByCode(inviteCode).then(async t => {
      if (!t) { setStatus('invalid'); return }
      const already = await isAlreadyMember(t.tripId, user.uid)
      if (already) { navigate(`/trip/${t.tripId}`, { replace: true }); return }
      const fams = await getTripFamilies(t.tripId)
      setTrip(t)
      setFamilies(fams)
      setStatus('ready')
    })
  }, [user, inviteCode, navigate])

  const handleJoin = async () => {
    setJoining(true)
    await joinTrip({
      tripId: trip.tripId,
      uid: user.uid, displayName: user.displayName,
      email: user.email, photoURL: user.photoURL,
      familyId: selectedFamily === 'new' ? null : selectedFamily,
      newFamilyName: selectedFamily === 'new' ? newFamilyName : null,
    })
    navigate(`/trip/${trip.tripId}`, { replace: true })
  }

  const canJoin = selectedFamily && (selectedFamily !== 'new' || newFamilyName.trim())

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#fff', fontSize:16 }}>Sign in to join this trip</div>
    </div>
  )

  if (status === 'loading') return <div className="loading-screen" />

  if (status === 'invalid') return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#ff6b6b', fontSize:16 }}>Invalid invite code: {inviteCode}</div>
    </div>
  )

  const fmt = d => {
    const date = d?.toDate ? d.toDate() : new Date(d)
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)' }}>
      <Navbar user={user} />
      <div style={{ maxWidth:480, margin:'40px auto', padding:'0 16px' }}>
        <div style={{
          background:'linear-gradient(145deg,#1a3a5c,#1a3a2a)',
          border:'1px solid var(--border-card)',
          borderRadius:16, padding:24, marginBottom:20,
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{getTripEmoji(trip.tripType)}</div>
          <div style={{ color:'#fff', fontSize:18, fontWeight:700, marginBottom:4 }}>{trip.name}</div>
          <div style={{ color:'#a8c8e8', fontSize:13, marginBottom:2 }}>📍 {trip.destination}</div>
          <div style={{ color:'#a8c8e8', fontSize:13, marginBottom:2 }}>🗓 {fmt(trip.startDate)} – {fmt(trip.endDate)}</div>
          <div style={{ color:'#7eb8f7', fontSize:12 }}>👥 {trip.memberIds.length} members · {trip.tripType}</div>
        </div>

        <div style={{ color:'#fff', fontSize:15, fontWeight:600, marginBottom:12 }}>
          Which family are you joining?
        </div>

        {families.map(f => (
          <label key={f.familyId} style={{
            display:'flex', alignItems:'center', gap:10,
            background: selectedFamily === f.familyId ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selectedFamily === f.familyId ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:10, padding:'10px 14px', marginBottom:8, cursor:'pointer',
          }}>
            <input type="radio" name="family" value={f.familyId}
              checked={selectedFamily === f.familyId}
              onChange={() => setSelectedFamily(f.familyId)}
              style={{ accentColor:'#4285F4' }} />
            <span style={{ color:'#fff', fontSize:13 }}>{f.name}</span>
          </label>
        ))}

        <label style={{
          display:'flex', alignItems:'center', gap:10,
          background: selectedFamily === 'new' ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selectedFamily === 'new' ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius:10, padding:'10px 14px', marginBottom: selectedFamily === 'new' ? 8 : 16, cursor:'pointer',
        }}>
          <input type="radio" name="family" value="new"
            checked={selectedFamily === 'new'}
            onChange={() => setSelectedFamily('new')}
            style={{ accentColor:'#4285F4' }} />
          <span style={{ color:'#fff', fontSize:13 }}>➕ Create a new family</span>
        </label>

        {selectedFamily === 'new' && (
          <input
            placeholder="Your family name"
            value={newFamilyName}
            onChange={e => setNewFamilyName(e.target.value)}
            style={{
              width:'100%', background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:8, padding:'9px 12px',
              color:'#fff', fontSize:13, marginBottom:16,
            }}
          />
        )}

        <button
          onClick={handleJoin}
          disabled={!canJoin || joining}
          style={{
            width:'100%', background: canJoin ? '#4285F4' : 'rgba(66,133,244,0.3)',
            border:'none', borderRadius:10, padding:'12px 0',
            color:'#fff', fontSize:14, fontWeight:600,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          }}
        >
          {joining ? 'Joining…' : 'Join Trip 🚀'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- JoinPage.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/JoinPage.jsx tests/unit/JoinPage.test.jsx
git commit -m "feat: add JoinPage with trip preview, family selection, and join flow"
```

---

## Task 13: TripPage Stub

**Files:**
- Modify: `src/pages/TripPage.jsx`

- [ ] **Step 1: Replace `src/pages/TripPage.jsx` with working stub**

```jsx
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import Navbar from '../components/Navbar'
import { getTripEmoji } from '../utils/trips'
import { getTripMembers } from '../utils/firestore'

export default function TripPage({ user }) {
  const { tripId }   = useParams()
  const [trip, setTrip]       = useState(null)
  const [members, setMembers] = useState([])

  useEffect(() => {
    getDoc(doc(db, 'trips', tripId)).then(snap => {
      if (snap.exists()) setTrip({ tripId: snap.id, ...snap.data() })
    })
    getTripMembers(tripId).then(setMembers)
  }, [tripId])

  if (!trip) return <div className="loading-screen" />

  const fmt = d => {
    const date = d?.toDate ? d.toDate() : new Date(d)
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  return (
    <div data-testid="trip-page" style={{ minHeight:'100vh', background:'var(--bg-secondary)' }}>
      <Navbar user={user} showBack tripName={trip.name} />

      {/* Trip banner */}
      <div style={{
        background:'linear-gradient(135deg,#1e3a5f,#0f4c2a)',
        padding:'20px 24px',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:36 }}>{getTripEmoji(trip.tripType)}</span>
          <div>
            <div style={{ color:'#fff', fontSize:20, fontWeight:700 }}>{trip.name}</div>
            <div style={{ color:'#a8c8e8', fontSize:13 }}>
              📍 {trip.destination} · 🗓 {fmt(trip.startDate)} – {fmt(trip.endDate)} · 👥 {trip.memberIds?.length} members
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'24px auto', padding:'0 16px' }}>
        {/* Placeholder tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
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

        {/* Member list */}
        <div style={{ color:'#fff', fontWeight:600, fontSize:14, marginBottom:12 }}>Members</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {members.map(m => (
            <div key={m.uid} style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:'10px 14px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              {m.photoURL
                ? <img src={m.photoURL} alt={m.displayName} style={{ width:28, height:28, borderRadius:'50%' }} />
                : <div style={{ width:28, height:28, borderRadius:'50%', background:'#4285F4', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700 }}>
                    {m.displayName?.[0]}
                  </div>
              }
              <div>
                <div style={{ color:'#fff', fontSize:12 }}>{m.displayName}</div>
                <div style={{ color:'#7a9ab8', fontSize:10 }}>{m.email}</div>
              </div>
              {m.role === 'host' && (
                <span style={{ marginLeft:'auto', background:'#4285F4', borderRadius:4, padding:'1px 6px', fontSize:9, color:'#fff', fontWeight:700 }}>HOST</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TripPage.jsx
git commit -m "feat: add TripPage stub with banner, placeholder tabs, and member list"
```

---

## Task 14: Integration Tests

**Files:**
- Create: `tests/integration/auth.test.jsx`
- Create: `tests/integration/tripFlow.test.jsx`

- [ ] **Step 1: Create `tests/integration/auth.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { onAuthStateChanged } from 'firebase/auth'
import App from '../../src/App'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(),
  getTripStatus: vi.fn(),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/auth', () => ({
  upsertUser: vi.fn(),
  isSafari: vi.fn(() => false),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Auth + routing integration', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('unauthenticated user sees LoginPage', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(null); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
  })

  it('user with 0 trips routes to /home (empty state)', async () => {
    const { getUserTrips } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([])
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeTruthy())
  })

  it('user with 1 active trip routes directly to /trip/:id', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([{
      tripId: 't1', name: 'Trip A', destination: 'USA', tripType: 'RV',
      startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'),
      memberIds: ['u1'], hostId: 'u1', inviteCode: 'ABC123',
    }])
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('trip-page')).toBeTruthy())
  })

  it('user with 2+ trips routes to /home (card grid)', async () => {
    const { getUserTrips, getTripStatus } = await import('../../src/utils/trips')
    vi.mocked(getUserTrips).mockResolvedValue([
      { tripId: 't1', name: 'A', destination: 'USA', tripType: 'RV', startDate: new Date('2026-06-15'), endDate: new Date('2026-06-22'), memberIds: ['u1'], hostId: 'u1', inviteCode: 'A1' },
      { tripId: 't2', name: 'B', destination: 'CA',  tripType: 'Beach', startDate: new Date('2026-07-01'), endDate: new Date('2026-07-07'), memberIds: ['u1'], hostId: 'u2', inviteCode: 'B2' },
    ])
    vi.mocked(getTripStatus).mockReturnValue('upcoming')
    vi.mocked(onAuthStateChanged).mockImplementation((auth, cb) => { cb(mockUser); return () => {} })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('home-page')).toBeTruthy())
  })
})
```

- [ ] **Step 2: Create `tests/integration/tripFlow.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../src/pages/HomePage'

vi.mock('../../src/utils/trips', () => ({
  getUserTrips: vi.fn(() => Promise.resolve([])),
  getTripStatus: vi.fn(() => 'upcoming'),
  getTripEmoji: vi.fn(() => '⛺'),
}))
vi.mock('../../src/utils/firestore', () => ({
  createTrip: vi.fn(() => Promise.resolve('new-trip-id')),
  getTripByCode: vi.fn(),
  isAlreadyMember: vi.fn(() => Promise.resolve(false)),
  getTripFamilies: vi.fn(() => Promise.resolve([])),
  joinTrip: vi.fn(() => Promise.resolve()),
}))

const mockUser = { uid: 'u1', displayName: 'Girish', email: 'g@gmail.com', photoURL: '' }

describe('Trip creation flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens NewTripModal on + New Trip click (empty state)', async () => {
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/No trips yet/i))
    fireEvent.click(screen.getByText('+ Create Trip'))
    await waitFor(() => expect(screen.getByText('New Trip 🚀')).toBeTruthy())
  })

  it('calls createTrip with correct data and redirects', async () => {
    const { createTrip } = await import('../../src/utils/firestore')
    render(<MemoryRouter><HomePage user={mockUser} /></MemoryRouter>)
    await waitFor(() => screen.getByText(/No trips yet/i))
    fireEvent.click(screen.getByText('+ Create Trip'))
    await waitFor(() => screen.getByText('New Trip 🚀'))

    await userEvent.type(screen.getByPlaceholderText(/Trip Name/i), 'Rocky Trip')
    await userEvent.type(screen.getByPlaceholderText(/Destination/i), 'Colorado')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Tent Camping')
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2026-06-15')
    await userEvent.type(screen.getByLabelText(/End Date/i), '2026-06-22')
    await userEvent.type(screen.getByPlaceholderText(/Family Name/i), 'Kumar Family')

    fireEvent.click(screen.getByText(/Create Trip/))
    await waitFor(() => expect(createTrip).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Rocky Trip', destination: 'Colorado', tripType: 'Tent Camping',
    })))
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
npm run test:unit && npm run test:integration
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/integration/
git commit -m "test: add integration tests for auth routing and trip creation flow"
```

---

## Task 15: CI/CD

**Files:**
- Create: `ci/Jenkinsfile`
- Create: `ci/jenkins-setup.md`

- [ ] **Step 1: Create `ci/Jenkinsfile`**

```groovy
pipeline {
  agent any

  environment {
    VITE_FIREBASE_API_KEY         = credentials('firebase-api-key')
    VITE_FIREBASE_AUTH_DOMAIN     = credentials('firebase-auth-domain')
    VITE_FIREBASE_PROJECT_ID      = credentials('firebase-project-id')
    VITE_FIREBASE_STORAGE_BUCKET  = credentials('firebase-storage-bucket')
    VITE_FIREBASE_MSG_SENDER_ID   = credentials('firebase-msg-sender-id')
    VITE_FIREBASE_APP_ID          = credentials('firebase-app-id')
    VITE_FIREBASE_MEASUREMENT_ID  = credentials('firebase-measurement-id')
    GH_TOKEN                      = credentials('github-pages-token')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('Lint') {
      steps { sh 'npm run lint' }
    }
    stage('Unit Tests') {
      steps { sh 'npm run test:unit' }
    }
    stage('Integration Tests') {
      steps { sh 'npm run test:integration' }
    }
    stage('Build') {
      steps {
        sh '''
          cat > .env << EOF
VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
VITE_FIREBASE_MSG_SENDER_ID=${VITE_FIREBASE_MSG_SENDER_ID}
VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}
EOF
          npm run build
        '''
      }
    }
    stage('Deploy') {
      steps {
        sh '''
          git config user.email "ci@tripmate.app"
          git config user.name "Jenkins CI"
          git remote set-url origin https://${GH_TOKEN}@github.com/<your-username>/tripmate.git
          npm run deploy
        '''
      }
    }
  }

  post {
    failure { echo 'Pipeline failed — deploy skipped.' }
    success { echo 'Deployed to GitHub Pages successfully.' }
    always  { sh 'rm -f .env' }
  }
}
```

- [ ] **Step 2: Create `ci/jenkins-setup.md`**

```markdown
# Jenkins Setup Guide

## Prerequisites
- Jenkins 2.400+ with Pipeline and NodeJS plugins installed
- Node.js 18+ configured as a Jenkins tool named `nodejs-18`
- GitHub repository created and Jenkins has push access

## Credentials to Add (Manage Jenkins → Credentials → Global)

| ID | Type | Value |
|---|---|---|
| `firebase-api-key` | Secret text | Your Firebase API key |
| `firebase-auth-domain` | Secret text | `camp-cbf1d.firebaseapp.com` |
| `firebase-project-id` | Secret text | `camp-cbf1d` |
| `firebase-storage-bucket` | Secret text | `camp-cbf1d.firebasestorage.app` |
| `firebase-msg-sender-id` | Secret text | Your sender ID |
| `firebase-app-id` | Secret text | Your app ID |
| `firebase-measurement-id` | Secret text | Your measurement ID |
| `github-pages-token` | Secret text | GitHub PAT with `repo` scope |

## Create Pipeline Job
1. New Item → Pipeline
2. Under Pipeline → Definition: `Pipeline script from SCM`
3. SCM: Git → Repository URL: your repo URL
4. Script Path: `ci/Jenkinsfile`
5. Save

## GitHub PAT Setup
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained
2. Permissions: `Contents: Read and write`
3. Copy token → add as `github-pages-token` credential in Jenkins
```

- [ ] **Step 3: Commit**

```bash
git add ci/
git commit -m "ci: add Jenkins pipeline with credentials injection and gh-pages deploy"
```

---

## Task 16: Documentation

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`
- Create: `MEMORY.md`
- Create: `docs/github-pages-hosting.md`
- Create: `docs/firebase-setup.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# TripMate

A collaborative trip planner for groups — RV trips, camping, glamping, beach holidays, ski trips, and more.

## Features (Sub-project 1)
- Gmail-only login with Firebase Auth (persistent across sessions, Safari ITP safe)
- Trip home dashboard: card grid with HOST/MEMBER badges, Active/Upcoming/Completed sections
- Create trips with destination, type, dates, and family group
- Invite others via shareable link or 6-char code
- Join flow with family selection

## Prerequisites
- Node.js 18+
- A Firebase project (see `docs/firebase-setup.md`)
- A GitHub account

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/tripmate.git
cd tripmate

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your Firebase credentials

# 4. Start dev server
npm run dev
# Open http://localhost:5173/tripmate/
```

## Run Tests
```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm test                  # All tests (watch mode)
```

## Deploy to GitHub Pages
```bash
npm run deploy
```
See `docs/github-pages-hosting.md` for first-time setup.

## CI/CD
Jenkins pipeline defined in `ci/Jenkinsfile`. See `ci/jenkins-setup.md` for setup.
```

- [ ] **Step 2: Create `CLAUDE.md`**

```markdown
# TripMate — Claude Context

## What This Project Is
A collaborative trip planner web app for groups (families, multiple families) going on RV trips, camping, glamping, beach holidays, ski trips, road trips, and international vacations.

## Tech Stack
- React 18 + Vite + React Router v6 (HashRouter for GitHub Pages)
- Firebase Auth (Google/Gmail only) + Firestore
- Vitest + React Testing Library
- Deployed to GitHub Pages via `gh-pages` npm package

## Key Files
| File | Purpose |
|---|---|
| `src/App.jsx` | Router + auth guard + initial trip-count redirect |
| `src/firebase.js` | Firebase init with browserLocalPersistence |
| `src/utils/trips.js` | getTripStatus, getTripEmoji, getUserTrips, generateUniqueCode |
| `src/utils/firestore.js` | createTrip, joinTrip, getTripByCode, getTripFamilies |
| `src/utils/auth.js` | upsertUser, isSafari |
| `src/pages/LoginPage.jsx` | Immersive login with Safari redirect fallback |
| `src/pages/HomePage.jsx` | 0/2+ trip states, card grid, collapsible completed |
| `src/pages/JoinPage.jsx` | Join via invite code/link + family selection |
| `src/components/TripCard.jsx` | Trip card with HOST/MEMBER badge, status pill |
| `src/components/NewTripModal.jsx` | Create trip form with date validation |

## Conventions
- TDD: write failing test first, then implement
- CSS via inline styles + CSS variables from `src/styles/global.css`
- Never commit `.env` — use `.env.example` as template
- Trip status is always derived from dates (never stored in Firestore)
- Member doc ID = user UID for direct lookups

## Firebase Project
- Project ID: `camp-cbf1d`
- Auth Domain: `camp-cbf1d.firebaseapp.com`
- Only Firestore is used (not Realtime Database)

## Sub-projects
1. **Auth + Trip Home** ← current
2. Checklist
3. Expense tracking (Splitwise-style)
4. Meal planning
5. Day-wise itinerary
```

- [ ] **Step 3: Create `MEMORY.md`**

```markdown
# TripMate Memory Index

- [Project overview and tech stack](CLAUDE.md) — Firebase Auth + React + Vite + GitHub Pages
- [Design spec: Auth + Trip Home](docs/superpowers/specs/2026-03-30-tripmate-auth-trip-home-design.md) — approved design for Sub-project 1
- [Implementation plan: Auth + Trip Home](docs/superpowers/plans/2026-03-30-tripmate-auth-trip-home.md) — task-by-task build plan
- [GitHub Pages hosting guide](docs/github-pages-hosting.md) — one-time setup + deploy steps
- [Firebase setup guide](docs/firebase-setup.md) — Auth, Firestore, security rules
- [Jenkins CI/CD setup](ci/jenkins-setup.md) — credentials + pipeline job config
```

- [ ] **Step 4: Create `docs/github-pages-hosting.md`**

```markdown
# GitHub Pages Hosting Guide

## One-Time Setup

### 1. Create the GitHub repo
Go to github.com → New repository → Name: `tripmate` → Public → Create.

### 2. Set the base path in `vite.config.js`
```js
export default defineConfig({
  base: '/tripmate/',
  // ...
})
```

### 3. Install the deploy package (already done)
```bash
npm install --save-dev gh-pages
```

### 4. Verify `package.json` scripts include
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

### 5. Create your `.env` file
```bash
cp .env.example .env
# Fill in all VITE_FIREBASE_* values from your Firebase console
```

### 6. Authorize GitHub Pages domain in Firebase
- Go to [Firebase Console](https://console.firebase.google.com) → `camp-cbf1d` → Authentication → Settings → Authorized domains
- Click **Add domain**
- Enter: `<your-github-username>.github.io`

### 7. Restrict your API key (security)
- Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
- Click your Browser API key → Application restrictions → HTTP referrers
- Add: `https://<your-github-username>.github.io/*`

### 8. Push to GitHub and deploy
```bash
git remote add origin https://github.com/<your-username>/tripmate.git
git push -u origin main
npm run deploy
```

### 9. Enable GitHub Pages
- GitHub repo → Settings → Pages
- Source: **Deploy from a branch**
- Branch: `gh-pages` → `/ (root)` → Save

Your site will be live at: `https://<your-username>.github.io/tripmate`

## Every Deploy
```bash
npm run deploy
```
This runs `npm run build` then pushes `dist/` to the `gh-pages` branch.

## Troubleshooting

**Blank page after deploy:**
Ensure `base: '/tripmate/'` is set in `vite.config.js`.

**Login popup blocked / redirect loop:**
Ensure your GitHub Pages domain is in Firebase authorized domains (Step 6).

**404 on direct URL access:**
This is handled by `HashRouter` — all URLs use `/#/path` format which GitHub Pages serves correctly.
```

- [ ] **Step 5: Create `docs/firebase-setup.md`**

```markdown
# Firebase Setup Guide

## Project Details
- **Project ID:** `camp-cbf1d`
- **Console:** https://console.firebase.google.com/project/camp-cbf1d

## Enable Google Sign-In
1. Firebase Console → Authentication → Sign-in method
2. Click **Google** → Enable → Save
3. Add your GitHub Pages domain to **Authorized domains** (see github-pages-hosting.md)

## Firestore Setup
1. Firebase Console → Firestore Database → Create database
2. Choose **Production mode** (we'll add rules next)
3. Select a region close to your users (e.g., `us-central`)

## Firestore Security Rules
Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Trips: members can read, only host can update settings/delete
    match /trips/{tripId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberIds;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.hostId;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.hostId;

      // Members subcollection
      match /members/{memberId} {
        allow read: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.memberIds;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null &&
          get(/databases/$(database)/documents/trips/$(tripId)).data.hostId == request.auth.uid;
      }

      // Families subcollection
      match /families/{familyId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.memberIds;
      }
    }

    // Invite codes: any authenticated user can read (to join), only authenticated can create
    match /inviteCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## Firestore Indexes
No manual indexes needed for Sub-project 1. Firestore auto-indexes all fields. If you see an index error in the browser console, click the link in the error to auto-create it.
```

- [ ] **Step 6: Commit all documentation**

```bash
git add README.md CLAUDE.md MEMORY.md docs/github-pages-hosting.md docs/firebase-setup.md
git commit -m "docs: add README, CLAUDE.md, MEMORY.md, hosting guide, Firebase setup guide"
```

---

## Task 17: Final Build Verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:unit && npm run test:integration
```

Expected: All tests pass, 0 failures

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Build for production**

```bash
npm run build
```

Expected: `dist/` folder created, no build errors. Output should include `dist/index.html` and hashed JS/CSS files.

- [ ] **Step 4: Preview the production build locally**

```bash
npm run preview
```

Open `http://localhost:4173/tripmate/` and verify:
- Login page renders with immersive background and "Login with Gmail" button
- No console errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify production build passes all checks"
```

- [ ] **Step 6: First deploy to GitHub Pages**

Follow `docs/github-pages-hosting.md` one-time setup steps 1–9, then:

```bash
npm run deploy
```

Expected: `gh-pages` branch updated, site live at `https://<username>.github.io/tripmate`

---

## Self-Review Checklist

- [x] **Section 1 (Architecture):** Task 1 scaffolds Vite + React with `base: '/tripmate/'`, HashRouter, all deps ✓
- [x] **Section 2 (Data Model):** Tasks 4's `firestore.js` implements all Firestore operations with correct schema ✓
- [x] **Section 3 (Screen Flow):** Task 5 implements 0/1/2+ trip routing; Task 12 covers join flow ✓
- [x] **Section 4 (Components):** Tasks 6–13 implement all components ✓
- [x] **Section 5 (Testing/CI/Deploy):** Tasks 14–17 cover all tests, Jenkins, GitHub Pages ✓
- [x] **Safari ITP:** `browserLocalPersistence` in `firebase.js`, `signInWithRedirect` fallback in `LoginPage.jsx` ✓
- [x] **InvitePopup:** Added in Task 10 (referenced in `HomePage.jsx`) ✓
- [x] **Type consistency:** `getTripStatus`, `getTripEmoji` used consistently across `TripCard`, `HomePage`, `JoinPage`, `TripPage` ✓
