import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import Navbar from '../components/Navbar'
import InvitePopup from '../components/InvitePopup'
import { getTripEmoji } from '../utils/trips'
import { getTripMembers } from '../utils/firestore'
import ChecklistTab from '../components/ChecklistTab'

export default function TripPage({ user }) {
  const { tripId }   = useParams()
  const [trip, setTrip]       = useState(null)
  const [members, setMembers] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [activeTab, setActiveTab] = useState('Checklist')

  useEffect(() => {
    getDoc(doc(db, 'trips', tripId)).then(snap => {
      if (snap.exists()) setTrip({ tripId: snap.id, ...snap.data() })
    })
    getTripMembers(tripId).then(setMembers)
  }, [tripId])

  if (!trip) return <div className="loading-screen" />

  const fmt = d => {
    const date = d?.toDate ? d.toDate() : new Date(d)
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  return (
    <div data-testid="trip-page" style={{ minHeight:'100vh', background:'var(--bg-secondary)' }}>
      <Navbar user={user} showBack tripName={trip.name} />

      {/* Trip banner */}
      <div style={{
        background:'linear-gradient(135deg,#1e3a5f,#0f4c2a)',
        padding:'20px 24px',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:36 }}>{getTripEmoji(trip.tripType)}</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff', fontSize:20, fontWeight:700 }}>{trip.name}</div>
            <div style={{ color:'#a8c8e8', fontSize:13 }}>
              📍 {trip.destination} · 🗓 {fmt(trip.startDate)} – {fmt(trip.endDate)} · 👥 {trip.memberIds?.length} members
            </div>
          </div>
          <button onClick={() => setShowInvite(true)} style={{
            background:'rgba(52,168,83,0.2)', border:'1px solid rgba(52,168,83,0.4)',
            borderRadius:9, padding:'8px 14px', color:'#6ed48a',
            fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
          }}>
            ✉️ Invite
          </button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'24px auto', padding:'0 16px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
          {['Checklist', 'Expenses', 'Meals', 'Itinerary'].map(tab => {
            const isActive    = activeTab === tab
            const isAvailable = tab === 'Checklist'
            return (
              <div
                key={tab}
                onClick={() => isAvailable && setActiveTab(tab)}
                style={{
                  background: isActive ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.06)',
                  border: isActive ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius:8, padding:'7px 14px',
                  color: isActive ? '#7eb8f7' : '#7a9ab8',
                  fontSize:12,
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab}{!isAvailable && <span style={{ fontSize:9, opacity:0.6, marginLeft:4 }}>(soon)</span>}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'Checklist' && (
          <ChecklistTab trip={trip} user={user} />
        )}

        {/* Member list */}
        <div style={{ color:'#fff', fontWeight:600, fontSize:14, marginBottom:12 }}>Members</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {members.map(m => (
            <div key={m.uid} style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:'10px 14px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              {m.photoURL
                ? <img src={m.photoURL} alt={m.displayName} style={{ width:28, height:28, borderRadius:'50%' }} />
                : <div style={{ width:28, height:28, borderRadius:'50%', background:'#4285F4', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700 }}>
                    {m.displayName?.[0]}
                  </div>
              }
              <div>
                <div style={{ color:'#fff', fontSize:12 }}>{m.displayName}</div>
                <div style={{ color:'#7a9ab8', fontSize:10 }}>{m.email}</div>
              </div>
              {m.role === 'host' && (
                <span style={{ marginLeft:'auto', background:'#4285F4', borderRadius:4, padding:'1px 6px', fontSize:9, color:'#fff', fontWeight:700 }}>HOST</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <InvitePopup trip={trip} onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}
