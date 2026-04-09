import MealCell from './MealCell'

const SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner']
const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🥪 Lunch', snacks: '🍎 Snacks', dinner: '🍲 Dinner' }

// computeMealDays: exported for unit testing
export function computeMealDays(startDate, endDate) {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate)
  const end   = endDate?.toDate   ? endDate.toDate()   : new Date(endDate)
  const days  = []
  const cur   = new Date(start)
  let idx = 0
  while (cur <= end) {
    days.push({
      index: idx,
      label: `Day ${idx + 1}`,
      date:  cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })
    cur.setDate(cur.getDate() + 1)
    idx++
  }
  return days
}

export default function MealGrid({ trip, meals, user, families, members, onEdit, onDelete, onAdd, onToggleLock }) {
  const days = computeMealDays(trip.startDate, trip.endDate)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 680 }}>
        <thead>
          <tr>
            <th style={{
              background: 'rgba(255,255,255,0.06)', color: '#7a9ab8',
              padding: '10px 12px', textAlign: 'left',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
              width: 80,
            }}>Day</th>
            {SLOTS.map(slot => (
              <th key={slot} style={{
                background: 'rgba(255,255,255,0.06)', color: '#a8d5ff',
                padding: '10px 12px', textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>{SLOT_LABELS[slot]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day.index}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{day.label}</div>
                <div style={{ color: '#7a9ab8', fontSize: 10 }}>{day.date}</div>
              </td>
              {SLOTS.map(slot => (
                <td key={slot} style={{ padding: '7px', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                  <MealCell
                    day={day.index}
                    slot={slot}
                    meals={meals.filter(m => m.day === day.index && m.slot === slot)}
                    user={user}
                    families={families}
                    members={members}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAdd={onAdd}
                    onToggleLock={onToggleLock}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
