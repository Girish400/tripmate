# Firebase Setup Guide

## Project Details
- **Project ID:** `camp-cbf1d`
- **Console:** https://console.firebase.google.com/project/camp-cbf1d

## Enable Google Sign-In
1. Firebase Console → Authentication → Sign-in method
2. Click **Google** → Enable → Save
3. Add your GitHub Pages domain to **Authorized domains** (see github-pages-hosting.md)

## Firestore Setup
1. Firebase Console → Firestore Database → Create database
2. Choose **Production mode** (we'll add rules next)
3. Select a region close to your users (e.g., `us-central`)

## Firestore Security Rules
Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Trips: members can read, only host can update settings/delete
    match /trips/{tripId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberIds;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.hostId;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.hostId;

      // Members subcollection
      match /members/{memberId} {
        allow read: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.memberIds;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null &&
          get(/databases/$(database)/documents/trips/$(tripId)).data.hostId == request.auth.uid;
      }

      // Families subcollection
      match /families/{familyId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.memberIds;
      }
    }

    // Invite codes: any authenticated user can read (to join), only authenticated can create
    match /inviteCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## Firestore Indexes
No manual indexes needed for Sub-project 1. Firestore auto-indexes all fields. If you see an index error in the browser console, click the link in the error to auto-create it.
