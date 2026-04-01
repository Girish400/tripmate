import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from './firebase'
import { upsertUser } from './utils/auth'
import { getUserTrips, getTripStatus } from './utils/trips'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TripPage from './pages/TripPage'
import JoinPage from './pages/JoinPage'

function AuthRedirect({ user }) {
  const navigate = useNavigate()

  useEffect(() => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode')
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode')
      navigate(`/join/${pendingCode}`, { replace: true })
      return
    }
    getUserTrips(user.uid).then(trips => {
      const active = trips.filter(t => getTripStatus(t) !== 'completed')
      if (active.length === 1) {
        navigate(`/trip/${active[0].tripId}`, { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    }).catch(() => {
      navigate('/home', { replace: true })
    })
  }, [user.uid, navigate])

  return <div className="loading-screen" />
}

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null })

  useEffect(() => {
    // Handle any pending redirect result before subscribing to auth state,
    // mirroring the pattern used in Allplanner which works on iOS Safari.
    getRedirectResult(auth)
      .then(async result => {
        if (result?.user) await upsertUser(result.user)
      })
      .catch(() => { /* no redirect in progress */ })

    const unsub = onAuthStateChanged(auth, user => {
      setAuthState({ loading: false, user })
    })
    return unsub
  }, [])

  if (authState.loading) return <div className="loading-screen" aria-label="Loading" role="status" />

  const { user } = authState

  return (
    <HashRouter>
      <Routes>
        <Route path="/"
          element={user ? <AuthRedirect user={user} /> : <LoginPage />}
        />
        <Route path="/home"
          element={user ? <HomePage user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="/trip/:tripId"
          element={user ? <TripPage user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="/join/:inviteCode"
          element={<JoinPage user={user} />}
        />
        <Route path="*"
          element={<Navigate to={user ? '/home' : '/'} replace />}
        />
      </Routes>
    </HashRouter>
  )
}
