# TripMate — Claude Context

## What This Project Is
A collaborative trip planner web app for groups (families, multiple families) going on RV trips, camping, glamping, beach holidays, ski trips, road trips, and international vacations.

## Tech Stack
- React 18 + Vite + React Router v6 (HashRouter for GitHub Pages)
- Firebase Auth (Google/Gmail only) + Firestore
- Vitest + React Testing Library
- Deployed to GitHub Pages via `gh-pages` npm package

## Key Files
| File | Purpose |
|---|---|
| `src/App.jsx` | Router + auth guard + initial trip-count redirect |
| `src/firebase.js` | Firebase init with browserLocalPersistence |
| `src/utils/trips.js` | getTripStatus, getTripEmoji, getUserTrips, generateUniqueCode |
| `src/utils/firestore.js` | createTrip, joinTrip, getTripByCode, getTripFamilies |
| `src/utils/auth.js` | upsertUser, isSafari |
| `src/pages/LoginPage.jsx` | Immersive login with Safari redirect fallback |
| `src/pages/HomePage.jsx` | 0/2+ trip states, card grid, collapsible completed |
| `src/pages/JoinPage.jsx` | Join via invite code/link + family selection |
| `src/components/TripCard.jsx` | Trip card with HOST/MEMBER badge, status pill |
| `src/components/NewTripModal.jsx` | Create trip form with date validation |

## Conventions
- TDD: write failing test first, then implement
- CSS via inline styles + CSS variables from `src/styles/global.css`
- Never commit `.env` — use `.env.example` as template
- Trip status is always derived from dates (never stored in Firestore)
- Member doc ID = user UID for direct lookups

## Firebase Project
- Project ID: `camp-cbf1d`
- Auth Domain: `camp-cbf1d.firebaseapp.com`
- Only Firestore is used (not Realtime Database)

## Sub-projects
1. **Auth + Trip Home** ← current
2. Checklist
3. Expense tracking (Splitwise-style)
4. Meal planning
5. Day-wise itinerary
