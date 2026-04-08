import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserTrips, getTripStatus } from '../utils/trips'
import { deleteTrip } from '../utils/firestore'
import Navbar from '../components/Navbar'
import TripCard from '../components/TripCard'
import NewTripModal from '../components/NewTripModal'
import EditTripModal from '../components/EditTripModal'
import InvitePopup from '../components/InvitePopup'

export default function HomePage({ user }) {
  const [trips, setTrips]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [inviteTrip, setInviteTrip] = useState(null)
  const [editTrip, setEditTrip]     = useState(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    getUserTrips(user.uid).then(t => {
      if (!mounted) return
      setTrips(t)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [user.uid])

  const handleDelete = async (trip) => {
    if (!window.confirm(`Delete "${trip.name}"? This cannot be undone.`)) return
    await deleteTrip(trip.tripId, trip.inviteCode)
    setTrips(ts => ts.filter(t => t.tripId !== trip.tripId))
  }

  const handleEdited = (updatedTrip) => {
    setTrips(ts => ts.map(t => t.tripId === updatedTrip.tripId ? { ...t, ...updatedTrip } : t))
  }

  const active    = trips.filter(t => getTripStatus(t) !== 'completed')
  const completed = trips.filter(t => getTripStatus(t) === 'completed')

  if (loading) return (
    <div>
      <Navbar user={user} />
      <div className="loading-screen" />
    </div>
  )

  return (
    <div data-testid="home-page" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Navbar user={user} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {active.length === 0 && completed.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏕️</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              No trips yet
            </div>
            <div style={{ color: '#7a9ab8', fontSize: 14, marginBottom: 28 }}>
              Ready to plan your first adventure?
            </div>
            <button onClick={() => setShowModal(true)} style={{
              background: '#4285F4', border: 'none', borderRadius: 12,
              padding: '12px 28px', color: '#fff', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}>
              + Create Trip
            </button>
          </div>
        ) : (
          <>
            {/* Active & Upcoming */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
              <div>
                <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>Active &amp; Upcoming Trips</div>
                <div style={{ color:'#7a9ab8', fontSize:11, marginTop:2 }}>{active.length} trip{active.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowModal(true)} style={{
                background: '#4285F4', border: 'none', borderRadius: 9,
                padding: '8px 14px', color: '#fff', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(66,133,244,0.4)',
              }}>
                + New Trip
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14, marginBottom: 28,
            }}>
              {active.map(trip => (
                <TripCard
                  key={trip.tripId} trip={trip} currentUserId={user.uid}
                  onOpen={id => navigate(`/trip/${id}`)}
                  onInvite={t => setInviteTrip(t)}
                  onEdit={t => setEditTrip(t)}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Completed — collapsible */}
            {completed.length > 0 && (
              <div style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
                <div
                  onClick={() => setCompletedOpen(o => !o)}
                  style={{
                    background:'rgba(255,255,255,0.04)', padding:'12px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#7a9ab8', fontSize:13, fontWeight:700 }}>Completed Trips</span>
                    <span style={{
                      background:'rgba(255,255,255,0.08)', borderRadius:10,
                      padding:'1px 8px', fontSize:10, color:'#7a9ab8',
                    }}>{completed.length}</span>
                  </div>
                  <span style={{ color:'#7a9ab8', fontSize:14 }}>{completedOpen ? '▼' : '▶'}</span>
                </div>

                {completedOpen && (
                  <div style={{
                    background:'rgba(255,255,255,0.02)', padding:14,
                    borderTop:'1px solid rgba(255,255,255,0.06)',
                    display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14,
                  }}>
                    {completed.map(trip => (
                      <TripCard
                        key={trip.tripId} trip={trip} currentUserId={user.uid}
                        onOpen={id => navigate(`/trip/${id}`)}
                        onInvite={() => {}}
                        onEdit={t => setEditTrip(t)}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <NewTripModal
          user={user}
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); navigate(`/trip/${id}`) }}
        />
      )}

      {editTrip && (
        <EditTripModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSaved={handleEdited}
        />
      )}

      {inviteTrip && (
        <InvitePopup trip={inviteTrip} onClose={() => setInviteTrip(null)} />
      )}
    </div>
  )
}
