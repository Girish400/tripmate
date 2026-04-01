export default function ShoppingList({ items, onToggle }) {
  const checked = items.filter(i => i.checkedBy).length

  if (items.length === 0) {
    return (
      <div style={{ color: '#7a9ab8', fontSize: 13, padding: '16px 0' }}>
        No ingredients added yet. Add ingredients to meal items in the grid.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, fontSize: 11, color: '#7a9ab8' }}>
        {checked} / {items.length} bought
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => {
          const isChecked = !!item.checkedBy
          return (
            <div
              key={item.itemId}
              data-testid={`shop-item-${item.itemId}`}
              onClick={() => onToggle(item.itemId, !isChecked)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '10px 14px',
                cursor: 'pointer', opacity: isChecked ? 0.45 : 1,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: isChecked ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                background: isChecked ? '#34A853' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff',
              }}>
                {isChecked ? '✓' : ''}
              </div>
              <div style={{
                flex: 1, fontSize: 13, color: '#e8f0fe',
                textDecoration: isChecked ? 'line-through' : 'none',
              }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: '#7a9ab8', whiteSpace: 'nowrap' }}>
                {item.mealLabel}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
