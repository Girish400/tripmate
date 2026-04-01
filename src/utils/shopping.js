import {
  collection, doc, updateDoc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeShoppingItems(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'shoppingItems')
  return onSnapshot(ref, snap => {
    const items = snap.docs.map(d => ({ itemId: d.id, ...d.data() }))
    items.sort((a, b) => (a.mealLabel ?? '').localeCompare(b.mealLabel ?? ''))
    callback(items)
  })
}

export async function toggleShoppingItem(tripId, itemId, uid, isChecked) {
  return updateDoc(doc(db, 'trips', tripId, 'shoppingItems', itemId), isChecked
    ? { checkedBy: uid, checkedAt: serverTimestamp() }
    : { checkedBy: null, checkedAt: null }
  )
}
