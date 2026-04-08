import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { upsertUser } from '../utils/auth'
import { getTripByCode, isAlreadyMember, getTripFamilies, joinTrip } from '../utils/firestore'
import { getTripEmoji } from '../utils/trips'
import Navbar from '../components/Navbar'

export default function JoinPage({ user }) {
  const { inviteCode } = useParams()
  const navigate       = useNavigate()
  const [trip, setTrip]         = useState(null)
  const [families, setFamilies] = useState([])
  const [status, setStatus]     = useState('loading') // loading | ready | invalid | already
  const [selectedFamily, setSelectedFamily] = useState('')
  const [newFamilyName, setNewFamilyName]   = useState('')
  const [joining, setJoining]   = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState(null)

  const handleSignIn = async () => {
    setSigningIn(true)
    setSignInError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await upsertUser(result.user)
      // onAuthStateChanged in App.jsx will re-render JoinPage with the new user
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setSignInError('Login cancelled. Try again when ready.')
      } else if (err.code === 'auth/popup-blocked') {
        setSignInError('Popup blocked. Please allow popups and try again.')
      } else {
        setSignInError('Sign-in failed. Please try again.')
      }
      setSigningIn(false)
    }
  }

  // Store invite code for post-login redirect
  useEffect(() => {
    if (!user) sessionStorage.setItem('pendingInviteCode', inviteCode)
  }, [user, inviteCode])

  useEffect(() => {
    if (!user) return
    let mounted = true
    getTripByCode(inviteCode).then(async t => {
      if (!mounted) return
      if (!t) { setStatus('invalid'); return }
      const already = await isAlreadyMember(t.tripId, user.uid)
      if (!mounted) return
      if (already) { navigate(`/trip/${t.tripId}`, { replace: true }); return }
      const fams = await getTripFamilies(t.tripId)
      if (!mounted) return
      setTrip(t)
      setFamilies(fams)
      setStatus('ready')
    })
    return () => { mounted = false }
  }, [user, inviteCode, navigate])

  const handleJoin = async () => {
    setJoining(true)
    await joinTrip({
      tripId: trip.tripId,
      uid: user.uid, displayName: user.displayName,
      email: user.email, photoURL: user.photoURL,
      familyId: selectedFamily === 'new' ? null : selectedFamily,
      newFamilyName: selectedFamily === 'new' ? newFamilyName : null,
    })
    navigate(`/trip/${trip.tripId}`, { replace: true })
  }

  const canJoin = selectedFamily && (selectedFamily !== 'new' || newFamilyName.trim())

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{
        background:'rgba(10,20,40,0.8)', border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:20, padding:'32px 28px', width:'100%', maxWidth:320, textAlign:'center',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🏕️</div>
        <div style={{ color:'#fff', fontSize:18, fontWeight:700, marginBottom:6 }}>Join a Trip</div>
        <div style={{ color:'#a8c8e8', fontSize:13, marginBottom:24 }}>
          Sign in to join this trip on TripMate
        </div>
        {signInError && (
          <div role="alert" style={{ color:'#ff6b6b', fontSize:11, marginBottom:12 }}>{signInError}</div>
        )}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          aria-label="Sign in with Google to join this trip"
          style={{
            width:'100%', background:'#4285F4', border:'none', borderRadius:10,
            padding:'11px 16px', display:'flex', alignItems:'center',
            justifyContent:'center', gap:10, cursor: signingIn ? 'not-allowed' : 'pointer',
            boxShadow:'0 4px 14px rgba(66,133,244,0.45)', opacity: signingIn ? 0.7 : 1,
          }}
        >
          <div style={{
            background:'#fff', borderRadius:'50%', width:20, height:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:'#4285F4', flexShrink:0,
          }}>G</div>
          <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>
            {signingIn ? 'Signing in…' : 'Login with Gmail'}
          </span>
        </button>
        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginTop:16 }}>
          Gmail accounts only · Secure sign-in
        </div>
      </div>
    </div>
  )

  if (status === 'loading') return <div className="loading-screen" />

  if (status === 'invalid') return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#ff6b6b', fontSize:16 }}>Invalid invite code: {inviteCode}</div>
    </div>
  )

  const fmt = d => {
    const date = d?.toDate ? d.toDate() : new Date(d)
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-secondary)' }}>
      <Navbar user={user} />
      <div style={{ maxWidth:480, margin:'40px auto', padding:'0 16px' }}>
        <div style={{
          background:'linear-gradient(145deg,#1a3a5c,#1a3a2a)',
          border:'1px solid var(--border-card)',
          borderRadius:16, padding:24, marginBottom:20,
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{getTripEmoji(trip.tripType)}</div>
          <div style={{ color:'#fff', fontSize:18, fontWeight:700, marginBottom:4 }}>{trip.name}</div>
          <div style={{ color:'#a8c8e8', fontSize:13, marginBottom:2 }}>📍 {trip.destination}</div>
          <div style={{ color:'#a8c8e8', fontSize:13, marginBottom:2 }}>🗓 {fmt(trip.startDate)} – {fmt(trip.endDate)}</div>
          <div style={{ color:'#7eb8f7', fontSize:12 }}>👥 {trip.memberIds.length} members · {trip.tripType}</div>
        </div>

        <div style={{ color:'#fff', fontSize:15, fontWeight:600, marginBottom:12 }}>
          Which family are you joining?
        </div>

        {families.map(f => (
          <label key={f.familyId} style={{
            display:'flex', alignItems:'center', gap:10,
            background: selectedFamily === f.familyId ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selectedFamily === f.familyId ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:10, padding:'10px 14px', marginBottom:8, cursor:'pointer',
          }}>
            <input type="radio" name="family" value={f.familyId}
              checked={selectedFamily === f.familyId}
              onChange={() => setSelectedFamily(f.familyId)}
              style={{ accentColor:'#4285F4' }} />
            <span style={{ color:'#fff', fontSize:13 }}>{f.name}</span>
          </label>
        ))}

        <label style={{
          display:'flex', alignItems:'center', gap:10,
          background: selectedFamily === 'new' ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selectedFamily === 'new' ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius:10, padding:'10px 14px', marginBottom: selectedFamily === 'new' ? 8 : 16, cursor:'pointer',
        }}>
          <input type="radio" name="family" value="new"
            checked={selectedFamily === 'new'}
            onChange={() => setSelectedFamily('new')}
            style={{ accentColor:'#4285F4' }} />
          <span style={{ color:'#fff', fontSize:13 }}>➕ Create a new family</span>
        </label>

        {selectedFamily === 'new' && (
          <input
            placeholder="Your family name"
            value={newFamilyName}
            onChange={e => setNewFamilyName(e.target.value)}
            style={{
              width:'100%', background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:8, padding:'9px 12px',
              color:'#fff', fontSize:13, marginBottom:16,
            }}
          />
        )}

        <button
          onClick={handleJoin}
          disabled={!canJoin || joining}
          style={{
            width:'100%', background: canJoin ? '#4285F4' : 'rgba(66,133,244,0.3)',
            border:'none', borderRadius:10, padding:'12px 0',
            color:'#fff', fontSize:14, fontWeight:600,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          }}
        >
          {joining ? 'Joining…' : 'Join Trip 🚀'}
        </button>
      </div>
    </div>
  )
}
