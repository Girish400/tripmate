export default function MealCard({ meal, onEdit, onDelete }) {
  const { mealId, dish, assignedTo, ingredients } = meal
  const count = ingredients?.length ?? 0

  const badgeStyle = {
    everyone: { background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.3)', color: '#7eb8f7' },
    family:   { background: 'rgba(52,168,83,0.15)',  border: '1px solid rgba(52,168,83,0.3)',  color: '#6ed48a' },
    person:   { background: 'rgba(251,188,5,0.15)',  border: '1px solid rgba(251,188,5,0.3)',  color: '#fdd663' },
  }[assignedTo.type] ?? {}

  return (
    <div
      data-testid="meal-card"
      onClick={() => onEdit(meal)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 7, padding: '8px 10px',
        cursor: 'pointer', position: 'relative',
      }}
    >
      <button
        data-testid="meal-card-delete"
        onClick={e => { e.stopPropagation(); onDelete(mealId) }}
        style={{
          position: 'absolute', top: 5, right: 7,
          background: 'none', border: 'none',
          color: '#7a9ab8', cursor: 'pointer', fontSize: 11,
        }}
      >✕</button>

      <div style={{ fontSize: 12, color: '#e8f0fe', marginBottom: 4 }}>{dish}</div>

      <span style={{
        fontSize: 10, borderRadius: 4, padding: '1px 6px',
        display: 'inline-block', ...badgeStyle,
      }}>
        {assignedTo.label}
      </span>

      {count > 0 && (
        <div style={{ fontSize: 10, color: '#7a9ab8', marginTop: 3 }}>
          {count} ingredient{count > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
