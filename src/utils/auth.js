import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function upsertUser(firebaseUser) {
  await setDoc(
    doc(db, 'users', firebaseUser.uid),
    {
      uid:         firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email:       firebaseUser.email,
      photoURL:    firebaseUser.photoURL,
      createdAt:   serverTimestamp(),
    },
    { merge: true }
  )
}

export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}
