import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeExpenses(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenses')
  return onSnapshot(ref, snap => {
    const expenses = snap.docs.map(d => ({ expenseId: d.id, ...d.data() }))
    expenses.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    callback(expenses)
  })
}

export async function addExpense(tripId, data) {
  return addDoc(collection(db, 'trips', tripId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateExpense(tripId, expenseId, changes) {
  return updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), changes)
}

export async function deleteExpense(tripId, expenseId) {
  return deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId))
}

export function subscribeExpenseLabels(tripId, callback) {
  const ref = collection(db, 'trips', tripId, 'expenseLabels')
  return onSnapshot(ref, snap => {
    const labels = snap.docs.map(d => ({ labelId: d.id, ...d.data() }))
    labels.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    callback(labels)
  })
}

export async function addExpenseLabel(tripId, name, uid) {
  return addDoc(collection(db, 'trips', tripId, 'expenseLabels'), {
    name,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

export function computeBalances(expenses, families) {
  if (families.length === 0) return []
  const numFamilies = families.length
  const balanceMap = Object.fromEntries(families.map(f => [f.familyId, 0]))
  for (const expense of expenses) {
    const share = expense.amount / numFamilies
    if (expense.paidByFamilyId in balanceMap) {
      balanceMap[expense.paidByFamilyId] += expense.amount
    }
    for (const f of families) {
      balanceMap[f.familyId] -= share
    }
  }
  return families.map(f => ({
    familyId: f.familyId,
    name: f.name,
    balance: balanceMap[f.familyId],
  }))
}
