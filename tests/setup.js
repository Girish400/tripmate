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
