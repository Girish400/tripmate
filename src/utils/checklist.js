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
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(items)
  })
}

/**
 * Check or uncheck a checkbox.
 * Initialises lockedBy/lockedByName to null on new check entries.
 */
export async function toggleCheck(tripId, itemId, mode, familyId, uid, displayName, isChecked) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const newEntry = { checkedBy: uid, displayName, lockedAt: null, lockedBy: null, lockedByName: null }
  if (mode === 'shared') {
    await updateDoc(ref, { sharedCheck: isChecked ? deleteField() : newEntry })
  } else {
    await updateDoc(ref, {
      [`checks.${familyId}`]: isChecked ? deleteField() : newEntry,
    })
  }
}

/**
 * Toggle lock on a checked item.
 * On lock: writes lockedAt, lockedBy, lockedByName.
 * On unlock: clears all three fields.
 */
export async function toggleLock(tripId, itemId, mode, familyId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const prefix = mode === 'shared' ? 'sharedCheck' : `checks.${familyId}`
  if (isLocked) {
    await updateDoc(ref, {
      [`${prefix}.lockedAt`]:     null,
      [`${prefix}.lockedBy`]:     null,
      [`${prefix}.lockedByName`]: null,
    })
  } else {
    await updateDoc(ref, {
      [`${prefix}.lockedAt`]:     serverTimestamp(),
      [`${prefix}.lockedBy`]:     uid,
      [`${prefix}.lockedByName`]: displayName,
    })
  }
}

/**
 * Cycle item mode: per-family → shared → na → per-family.
 * Stores modeOwnerUid/modeOwnerName when switching to shared or na.
 * Clears those fields when reverting to per-family.
 */
export async function setMode(tripId, itemId, newMode, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'checklistItems', itemId)
  const isOwned = newMode === 'shared' || newMode === 'na'
  await updateDoc(ref, {
    mode: newMode,
    checks: {},
    sharedCheck: null,
    modeOwnerUid:  isOwned ? uid  : null,
    modeOwnerName: isOwned ? displayName : null,
  })
}

/** Add a custom item to a category. */
export async function addItem(tripId, category, name) {
  const ref = collection(db, 'trips', tripId, 'checklistItems')
  await addDoc(ref, {
    name, category,
    mode: 'per-family',
    order: Date.now(),
    isCustom: true,
    checks: {},
    sharedCheck: null,
    modeOwnerUid: null,
    modeOwnerName: null,
  })
}

/**
 * Pre-populate checklist from template. No-op if items already exist.
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
        name, category,
        mode: 'per-family',
        order: order++,
        isCustom: false,
        checks: {},
        sharedCheck: null,
        modeOwnerUid: null,
        modeOwnerName: null,
      })
    })
  })

  await batch.commit()
}
