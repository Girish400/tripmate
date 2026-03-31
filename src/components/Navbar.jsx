import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function Navbar({ user, showBack = false, tripName = '' }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut(auth).then(() => navigate('/')).catch(() => {})
  }

  const initial = user.displayName?.[0]?.toUpperCase() || '?'

  return (
    <nav style={{
      background: '#0a1018',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBack && (
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'none', border: 'none', color: '#a8c8e8',
              fontSize: 13, cursor: 'pointer', padding: '4px 8px',
              borderRadius: 6, marginRight: 4,
            }}
          >
            ← My Trips
          </button>
        )}
        <span style={{ fontSize: 20 }}>🏕️</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
          TripMate
        </span>
        {showBack && tripName && (
          <span style={{
            color: '#a8c8e8', fontSize: 13,
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tripName.length > 24 ? tripName.slice(0, 24) + '…' : tripName}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{user.displayName}</div>
          <div style={{ color: '#a8c8e8', fontSize: 10 }}>{user.email}</div>
        </div>

        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4285F4,#34A853)',
          display: user.photoURL ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 13,
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          {initial}
        </div>

        <button onClick={handleSignOut} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 7, padding: '5px 10px',
          color: '#cdd9f0', fontSize: 11, cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
