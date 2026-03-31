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
