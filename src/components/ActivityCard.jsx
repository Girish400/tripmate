function formatTime(hhmm) {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function ActivityCard({ item, type, user, onEdit, onDelete, onToggleLock }) {
  if (type === 'meal') {
    const slotLabel = item.slot ? item.slot[0].toUpperCase() + item.slot.slice(1) : 'Meal'
    return (
      <div
        data-testid={`meal-card-itinerary-${item.mealId}`}
        style={{
          background: 'rgba(66,133,244,0.08)',
          border: '1px solid rgba(66,133,244,0.25)',
          borderRadius: 8, padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🍽️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#7eb8f7', fontSize: 12, fontWeight: 600 }}>
              {slotLabel} · {item.dish}
            </div>
            <div style={{ color: '#5a8ab8', fontSize: 10, marginTop: 2 }}>from Meals tab</div>
          </div>
        </div>
      </div>
    )
  }

  const isOwn    = item.createdBy === user?.uid
  const isLocked = !!item.lockedAt

  return (
    <div
      data-testid={`activity-card-${item.activityId}`}
      style={{
        background: isLocked ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isLocked ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8, padding: '10px 12px',
      }}
    >
      {isLocked && (
        <div
          data-testid={`lock-banner-${item.activityId}`}
          style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}
        >
          🔒 Locked by {item.lockedByName}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{item.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{item.title}</div>
          <div style={{ color: '#7a9ab8', fontSize: 10, marginTop: 2 }}>
            ⏰ {formatTime(item.time)}
            {item.location && ` · 📍 ${item.location}`}
          </div>
        </div>
        {isOwn && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              data-testid={`lock-btn-${item.activityId}`}
              onClick={() => onToggleLock(item, isLocked)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
            >
              {isLocked ? '🔒' : '🔓'}
            </button>
            {!isLocked && (
              <>
                <button
                  data-testid={`edit-btn-${item.activityId}`}
                  aria-label={`Edit ${item.title}`}
                  onClick={() => onEdit(item)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >✏️</button>
                <button
                  data-testid={`delete-btn-${item.activityId}`}
                  aria-label={`Delete ${item.title}`}
                  onClick={() => onDelete(item.activityId)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >🗑</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
