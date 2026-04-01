import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, where,
  arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const SLOT_ORDER = { breakfast: 0, lunch: 1, snacks: 2, dinner: 3 }

export function subscribeMeals(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'meals')
  return onSnapshot(ref, snap => {
    const meals = snap.docs.map(d => ({ mealId: d.id, ...d.data() }))
    meals.sort((a, b) =>
      a.day !== b.day
        ? a.day - b.day
        : SLOT_ORDER[a.slot] !== SLOT_ORDER[b.slot]
          ? SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]
          : (a.order ?? 0) - (b.order ?? 0)
    )
    callback(meals)
  })
}

export async function addMeal(tripId, { dish, slot, day, assignedTo }) {
  return addDoc(collection(db, 'trips', tripId, 'meals'), {
    dish,
    slot,
    day,
    assignedTo,
    ingredients: [],
    order: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function updateMeal(tripId, mealId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'meals', mealId), changes)
}

export async function deleteMeal(tripId, mealId) {
  return deleteDoc(doc(db, 'trips', tripId, 'meals', mealId))
}

export async function addIngredient(tripId, mealId, name, mealLabel) {
  await updateDoc(doc(db, 'trips', tripId, 'meals', mealId), {
    ingredients: arrayUnion(name),
  })
  await addDoc(collection(db, 'trips', tripId, 'shoppingItems'), {
    name,
    mealId,
    mealLabel,
    checkedBy: null,
    checkedAt: null,
    createdAt: serverTimestamp(),
  })
}

export async function removeIngredient(tripId, mealId, name) {
  await updateDoc(doc(db, 'trips', tripId, 'meals', mealId), {
    ingredients: arrayRemove(name),
  })
  const q = query(
    collection(db, 'trips', tripId, 'shoppingItems'),
    where('mealId', '==', mealId),
    where('name', '==', name)
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
  }
}
