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
