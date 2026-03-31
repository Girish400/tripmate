# TripMate

A collaborative trip planner for groups — RV trips, camping, glamping, beach holidays, ski trips, and more.

## Features (Sub-project 1)
- Gmail-only login with Firebase Auth (persistent across sessions, Safari ITP safe)
- Trip home dashboard: card grid with HOST/MEMBER badges, Active/Upcoming/Completed sections
- Create trips with destination, type, dates, and family group
- Invite others via shareable link or 6-char code
- Join flow with family selection

## Prerequisites
- Node.js 18+
- A Firebase project (see `docs/firebase-setup.md`)
- A GitHub account

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/tripmate.git
cd tripmate

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your Firebase credentials

# 4. Start dev server
npm run dev
# Open http://localhost:5173/tripmate/
```

## Run Tests
```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm test                  # All tests (watch mode)
npm run test:coverage     # With coverage report
```

## Deploy to GitHub Pages
```bash
npm run deploy
```
See `docs/github-pages-hosting.md` for first-time setup.

## CI/CD
Jenkins pipeline defined in `ci/Jenkinsfile`. See `ci/jenkins-setup.md` for setup.

## Project Structure
```
src/
  firebase.js        # Firebase init + auth persistence
  App.jsx            # Router + auth guard
  pages/             # LoginPage, HomePage, TripPage, JoinPage
  components/        # Navbar, TripCard, NewTripModal, InvitePopup
  utils/             # trips.js, auth.js, firestore.js
tests/
  unit/              # Component + module unit tests
  integration/       # Auth routing + trip flow tests
ci/                  # Jenkins pipeline
docs/                # Hosting + Firebase guides
```
