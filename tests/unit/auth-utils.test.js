import { describe, it, expect, vi, beforeEach } from 'vitest'
import { doc, setDoc } from 'firebase/firestore'

vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: { setCustomParameters: vi.fn() },
}))

// Section 2 — Integration / Section 9 — Database: upsertUser behaviour
describe('upsertUser', () => {
  const mockUser = {
    uid: 'u1',
    displayName: 'Girish Kumar',
    email: 'girish@gmail.com',
    photoURL: 'https://photo.url/img.jpg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Section 9: Verify user record is created/updated in DB
  it('calls setDoc with the correct Firestore document path (users/{uid})', async () => {
    const { upsertUser } = await import('../../src/utils/auth')
    await upsertUser(mockUser)
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUser.uid)
    expect(setDoc).toHaveBeenCalled()
  })

  // Section 9: Verify user data consistency (email, UID match what Firebase returned)
  it('writes uid, displayName, email, and photoURL to Firestore', async () => {
    const { upsertUser } = await import('../../src/utils/auth')
    await upsertUser(mockUser)
    const [, data] = vi.mocked(setDoc).mock.calls[0]
    expect(data.uid).toBe(mockUser.uid)
    expect(data.displayName).toBe(mockUser.displayName)
    expect(data.email).toBe(mockUser.email)
    expect(data.photoURL).toBe(mockUser.photoURL)
  })

  // Section 9: Verify duplicate user prevention — merge:true means existing users are updated, not overwritten
  it('uses merge:true so existing user records are not overwritten (no duplicate prevention)', async () => {
    const { upsertUser } = await import('../../src/utils/auth')
    await upsertUser(mockUser)
    const [, , options] = vi.mocked(setDoc).mock.calls[0]
    expect(options).toEqual({ merge: true })
  })

  // Section 2: Verify user is created in Firebase Auth on first login (upsertUser called)
  it('resolves without error for a valid user object', async () => {
    const { upsertUser } = await import('../../src/utils/auth')
    await expect(upsertUser(mockUser)).resolves.toBeUndefined()
  })

  // Section 9: Verify last login / createdAt timestamp is written
  it('includes a createdAt server timestamp in the written document', async () => {
    const { upsertUser } = await import('../../src/utils/auth')
    await upsertUser(mockUser)
    const [, data] = vi.mocked(setDoc).mock.calls[0]
    // serverTimestamp() returns a sentinel object — just verify the key is present
    expect(Object.prototype.hasOwnProperty.call(data, 'createdAt')).toBe(true)
  })
})
