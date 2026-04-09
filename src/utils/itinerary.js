import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeActivities(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'activities')
  return onSnapshot(ref, snap => {
    const activities = snap.docs.map(d => ({ activityId: d.id, ...d.data() }))
    activities.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    callback(activities)
  })
}

export async function addActivity(tripId, data) {
  return addDoc(collection(db, 'trips', tripId, 'activities'), {
    ...data,
    lockedAt: null, lockedBy: null, lockedByName: null,
    createdAt: serverTimestamp(),
  })
}

export async function toggleActivityLock(tripId, activityId, isLocked, uid, displayName) {
  const ref = doc(db, 'trips', tripId, 'activities', activityId)
  if (isLocked) {
    await updateDoc(ref, { lockedAt: null, lockedBy: null, lockedByName: null })
  } else {
    await updateDoc(ref, { lockedAt: serverTimestamp(), lockedBy: uid, lockedByName: displayName })
  }
}

export async function updateActivity(tripId, activityId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'activities', activityId), changes)
}

export async function deleteActivity(tripId, activityId) {
  return deleteDoc(doc(db, 'trips', tripId, 'activities', activityId))
}
