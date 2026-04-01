import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider, persistenceReady } from '../firebase'
import { upsertUser } from '../utils/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleLogin = async () => {
    if (!navigator.onLine) {
      setError('You appear to be offline. Please check your connection.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Must await persistence setup before any auth operation (Firebase requirement).
      await persistenceReady
      const result = await signInWithPopup(auth, googleProvider)
      await upsertUser(result.user)
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Try again when ready.')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.')
      } else {
        setError('Sign-in failed. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div data-testid="login-page" aria-busy={loading || undefined} style={{
      position: 'relative', minHeight: '100vh', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,#0a0e1a 0%,#1a2744 30%,#2d4a3e 70%,#1a3020 100%)' }} />

      {/* Stars */}
      <div style={{ position:'absolute', top:'8%', left:'15%', width:2, height:2, background:'#fff', borderRadius:'50%',
        boxShadow:'30px 10px 0 #fff,60px -5px 0 #fffde7,90px 15px 0 #fff,120px 5px 0 #fffde7,150px -8px 0 #fff,180px 12px 0 #fff', opacity:0.8 }} />

      {/* Moon */}
      <div style={{ position:'absolute', top:'10%', right:'18%', width:28, height:28,
        background:'#fffde7', borderRadius:'50%', boxShadow:'0 0 20px 6px rgba(255,253,200,0.35)' }} />

      {/* Mountains */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:140, overflow:'hidden' }}>
        <svg viewBox="0 0 800 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width:'100%', height:'100%' }}>
          <polygon points="0,140 120,40 240,100 360,20 480,90 600,30 720,80 800,50 800,140" fill="#0d2b1a"/>
          <polygon points="0,140 80,70 180,110 300,55 420,105 540,60 660,95 800,65 800,140" fill="#112d1e"/>
        </svg>
      </div>

      {/* Campfire glow */}
      <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
        width:60, height:20, background:'radial-gradient(ellipse,rgba(255,140,0,0.4),transparent 70%)', borderRadius:'50%' }} />

      {/* Floating emojis */}
      {[
        { e:'🏕️', t:'18%', l:'8%',  r:undefined, b:undefined, s:22, rot:-8 },
        { e:'🚐', t:'22%', r:'10%', l:undefined,  b:undefined, s:20, rot:6  },
        { e:'⛺', b:'28%', l:'6%',  t:undefined,  r:undefined, s:18, rot:-5 },
        { e:'🌲', b:'32%', r:'7%',  t:undefined,  l:undefined, s:18, rot:8  },
        { e:'🔥', t:'40%', l:'12%', r:undefined,  b:undefined, s:16, rot:0  },
        { e:'🌄', t:'38%', r:'12%', l:undefined,  b:undefined, s:16, rot:0  },
        { e:'🎒', b:'42%', l:'20%', t:undefined,  r:undefined, s:14, rot:0  },
        { e:'🗺️', b:'45%', r:'20%', t:undefined,  l:undefined, s:14, rot:0  },
      ].map(({ e, t, l, r, b, s, rot }) => (
        <div key={e} style={{
          position:'absolute', top:t, left:l, right:r, bottom:b,
          fontSize:s, opacity:0.8, transform:`rotate(${rot}deg)`,
        }}>{e}</div>
      ))}

      {/* Frosted glass card */}
      <div style={{
        position:'relative', zIndex:10,
        background:'rgba(10,20,40,0.6)',
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
        border:'1px solid rgba(255,255,255,0.18)',
        borderRadius:20, padding:'32px 28px',
        width:'90%', maxWidth:320, textAlign:'center',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize:38, marginBottom:6 }}>🏕️</div>
        <div style={{ color:'#fff', fontSize:22, fontWeight:700, letterSpacing:1.5, marginBottom:4 }}>TripMate</div>
        <div style={{ color:'#a8d5b5', fontSize:12, marginBottom:22, letterSpacing:0.5 }}>
          Plan together. Adventure together.
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.12)', marginBottom:20 }} />

        {error && (
          <div role="alert" aria-live="polite" style={{ color:'#ff6b6b', fontSize:11, marginBottom:12 }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          aria-label="Sign in with Google Gmail account"
          style={{
            width:'100%', background:'#4285F4', border:'none', borderRadius:10,
            padding:'11px 16px', display:'flex', alignItems:'center',
            justifyContent:'center', gap:10, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow:'0 4px 14px rgba(66,133,244,0.45)', opacity: loading ? 0.7 : 1,
          }}
        >
          <div style={{
            background:'#fff', borderRadius:'50%', width:20, height:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:'#4285F4', flexShrink:0,
          }}>G</div>
          <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>
            {loading ? 'Signing in…' : 'Login with Gmail'}
          </span>
        </button>

        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginTop:16 }}>
          Gmail accounts only · Secure sign-in
        </div>
      </div>
    </div>
  )
}
