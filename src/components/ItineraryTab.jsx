import { useEffect, useMemo, useState } from 'react'
import { subscribeActivities, addActivity, updateActivity, deleteActivity, toggleActivityLock } from '../utils/itinerary'
import { subscribeMeals } from '../utils/meals'
import { getTripFamilies } from '../utils/firestore'
import ActivityCard from './ActivityCard'
import ActivityEditForm from './ActivityEditForm'

// Default times used for sorting meals by slot within the day
const SLOT_TIMES = { breakfast: '07:00', lunch: '12:00', snacks: '15:00', dinner: '19:00' }

function toLocalDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toISODate(localDate) {
  return [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, '0'),
    String(localDate.getDate()).padStart(2, '0'),
  ].join('-')
}

function tripDays(trip) {
  const start = toLocalDate(trip.startDate)
  const end   = toLocalDate(trip.endDate)
  const days  = []
  const cur   = new Date(start)
  while (cur <= end) {
    days.push(toISODate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function defaultSelectedDate(days) {
  const todayISO = toISODate(new Date())
  return days.includes(todayISO) ? todayISO : days[0]
}

function formatTabLabel(isoDate, index) {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Day ${index + 1} · ${formatted}`
}

function getMealDate(meal, trip) {
  const start = toLocalDate(trip.startDate)
  const mealDate = new Date(start)
  mealDate.setDate(mealDate.getDate() + meal.day)
  return toISODate(mealDate)
}

function buildMergedList(activities, meals, selectedDate, trip) {
  const dayActivities = activities
    .filter(a => a.date === selectedDate)
    .map(a => ({ ...a, _type: 'activity' }))

  const dayMeals = meals
    .filter(m => getMealDate(m, trip) === selectedDate)
    .map(m => ({ ...m, _type: 'meal', _sortTime: SLOT_TIMES[m.slot] ?? '12:00' }))

  return [...dayActivities, ...dayMeals].sort((a, b) => {
    const tA = a._type === 'activity' ? a.time : a._sortTime
    const tB = b._type === 'activity' ? b.time : b._sortTime
    return tA.localeCompare(tB)
  })
}

export default function ItineraryTab({ trip, user }) {
  const [activities,      setActivities]      = useState([])
  const [meals,           setMeals]           = useState([])
  const [families,        setFamilies]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [editingActivity, setEditingActivity] = useState(null)

  const days = useMemo(() => tripDays(trip), [trip.tripId])
  const [selectedDate, setSelectedDate] = useState(() => defaultSelectedDate(days))

  useEffect(() => {
    const unsub1 = subscribeActivities(trip.tripId, items => {
      setActivities(items)
      setLoading(false)
    })
    const unsub2 = subscribeMeals(trip.tripId, setMeals)
    getTripFamilies(trip.tripId).then(setFamilies).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  async function handleSave(data) {
    try {
      if (editingActivity?.activityId) {
        await updateActivity(trip.tripId, editingActivity.activityId, data)
      } else {
        await addActivity(trip.tripId, { ...data, date: selectedDate, createdBy: user.uid })
      }
      setEditingActivity(null)
    } catch (err) {
      console.error('Failed to save activity:', err)
    }
  }

  async function handleDelete(activityId) {
    try {
      await deleteActivity(trip.tripId, activityId)
    } finally {
      setEditingActivity(null)
    }
  }

  async function handleToggleActivityLock(activity, isLocked) {
    await toggleActivityLock(trip.tripId, activity.activityId, isLocked, user.uid, user.displayName)
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading itinerary…
      </div>
    )
  }

  const mergedList = buildMergedList(activities, meals, selectedDate, trip)

  const tabStyle = (date) => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    border: selectedDate === date ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: selectedDate === date ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
    color: selectedDate === date ? '#7eb8f7' : '#7a9ab8',
    fontWeight: selectedDate === date ? 600 : 400,
  })

  return (
    <div data-testid="itinerary-tab">
      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {days.map((date, i) => (
          <div
            key={date}
            data-testid={`day-tab-${date}`}
            onClick={() => setSelectedDate(date)}
            style={tabStyle(date)}
          >
            {formatTabLabel(date, i)}
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          data-testid="add-activity-btn"
          onClick={() => setEditingActivity({})}
          style={{
            background: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.4)',
            borderRadius: 8, padding: '7px 14px', color: '#6ed48a',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add Activity
        </button>
      </div>

      {/* Activity list */}
      {mergedList.length === 0 ? (
        <div style={{ color: '#7a9ab8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
          No activities planned for this day — add the first one
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mergedList.map(item =>
            item._type === 'meal' ? (
              <ActivityCard
                key={`meal-${item.mealId}`}
                item={item}
                type="meal"
                user={user}
                onEdit={() => {}}
                onDelete={() => {}}
                onToggleLock={() => {}}
              />
            ) : (
              <ActivityCard
                key={`activity-${item.activityId}`}
                item={item}
                type="activity"
                user={user}
                onEdit={act => setEditingActivity(act)}
                onDelete={handleDelete}
                onToggleLock={handleToggleActivityLock}
              />
            )
          )}
        </div>
      )}

      {/* Edit form modal */}
      {editingActivity !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingActivity(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ActivityEditForm
              activity={editingActivity?.activityId ? editingActivity : null}
              families={families}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setEditingActivity(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
