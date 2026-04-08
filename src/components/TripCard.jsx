import { getTripStatus, getTripEmoji } from '../utils/trips'

const STATUS_COLORS = {
  active:    { dot: '#34A853', label: 'Active' },
  upcoming:  { dot: '#4285F4', label: 'Upcoming' },
  completed: { dot: '#556677', label: 'Completed' },
}

export default function TripCard({ trip, currentUserId, onOpen, onInvite, onEdit, onDelete }) {
  const status   = getTripStatus(trip)
  const emoji    = getTripEmoji(trip.tripType)
  const isHost   = trip.hostId === currentUserId
  const isDone   = status === 'completed'
  const { dot, label } = STATUS_COLORS[status]

  const start = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate)
  const end   = trip.endDate?.toDate   ? trip.endDate.toDate()   : new Date(trip.endDate)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{
      background: isDone ? 'rgba(255,255,255,0.04)' : 'linear-gradient(145deg,#1a3a5c,#1a3a2a)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-card)',
      padding: 16, position: 'relative',
      opacity: isDone ? 0.6 : 1,
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Role badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: isHost ? '#4285F4' : '#34A853',
        borderRadius: 5, padding: '2px 7px',
        fontSize: 9, color: '#fff', fontWeight: 700,
      }}>
        {isHost ? 'HOST' : 'MEMBER'}
      </div>

      {/* Host action buttons */}
      {isHost && (
        <div style={{ position: 'absolute', top: 28, right: 10, display: 'flex', gap: 4 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit && onEdit(trip) }}
            title="Edit trip"
            style={{
              background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.3)',
              borderRadius: 5, padding: '2px 6px', color: '#7eb8f7',
              fontSize: 10, cursor: 'pointer',
            }}
          >✏️</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete && onDelete(trip) }}
            title="Delete trip"
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 5, padding: '2px 6px', color: '#ff7b72',
              fontSize: 10, cursor: 'pointer',
            }}
          >🗑</button>
        </div>
      )}

      <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
        {trip.name.length > 20 ? trip.name.slice(0, 20) + '…' : trip.name}
      </div>
      <div style={{ color: '#a8c8e8', fontSize: 11, marginBottom: 2 }}>📍 {trip.destination}</div>
      <div style={{ color: '#a8c8e8', fontSize: 11, marginBottom: 8 }}>
        🗓 {fmt(start)} – {fmt(end)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />
          <span style={{ color: '#7eb8f7', fontSize: 10 }}>{trip.tripType} · {label}</span>
        </div>
        <span style={{ color: '#a8c8e8', fontSize: 10 }}>👥 {trip.memberIds.length} members</span>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        {isDone ? (
          <div onClick={() => onOpen(trip.tripId)} style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7, padding: 5, textAlign: 'center',
            fontSize: 10, color: '#556677', cursor: 'pointer',
          }}>View Summary</div>
        ) : (
          <>
            <div onClick={() => onOpen(trip.tripId)} style={{
              flex: 1, background: 'rgba(66,133,244,0.2)',
              border: '1px solid rgba(66,133,244,0.4)',
              borderRadius: 7, padding: 5, textAlign: 'center',
              fontSize: 10, color: '#7eb8f7', cursor: 'pointer',
            }}>Open Trip</div>
            <div onClick={() => onInvite(trip)} style={{
              background: 'rgba(52,168,83,0.2)',
              border: '1px solid rgba(52,168,83,0.4)',
              borderRadius: 7, padding: '5px 10px', textAlign: 'center',
              fontSize: 10, color: '#6ed48a', cursor: 'pointer',
            }}>✉️ Invite</div>
          </>
        )}
      </div>
    </div>
  )
}
