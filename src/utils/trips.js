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
