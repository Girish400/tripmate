import { useEffect, useState } from 'react'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import {
  subscribeChecklist, toggleCheck, toggleLock, lockItem,
  setMode, addItem, initChecklistFromTemplate,
} from '../utils/checklist'
import ChecklistProgress from './ChecklistProgress'
import ChecklistCategory from './ChecklistCategory'

export default function ChecklistTab({ trip, user }) {
  const [items,          setItems]          = useState([])
  const [families,       setFamilies]       = useState([])
  const [currentFamilyId, setCurrentFamilyId] = useState(null)
  const [loading,        setLoading]        = useState(true)

  // Fetch families + current user's familyId once
  useEffect(() => {
    Promise.all([
      getTripFamilies(trip.tripId),
      getTripMembers(trip.tripId),
    ]).then(([fams, members]) => {
      setFamilies(fams.filter(f => f.memberIds?.length > 0))
      const me = members.find(m => m.uid === user.uid)
      setCurrentFamilyId(me?.familyId ?? null)
    })
  }, [trip.tripId, user.uid])

  // Subscribe to live checklist updates
  useEffect(() => {
    const unsub = subscribeChecklist(trip.tripId, async (liveItems) => {
      setItems(liveItems)
      if (liveItems.length === 0) {
        await initChecklistFromTemplate(trip.tripId, trip.tripType)
      }
      setLoading(false)
    })
    return unsub
  }, [trip.tripId, trip.tripType])

  // Group items by category, preserving order of first appearance
  const categories = []
  const seen = new Set()
  items.forEach(item => {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      categories.push(item.category)
    }
  })

  const handleToggleCheck = (item, familyId, isChecked) => {
    toggleCheck(trip.tripId, item.itemId, item.mode, familyId, user.uid, user.displayName, isChecked)
  }

  const handleToggleLock = (item, familyId, isLocked) => {
    toggleLock(trip.tripId, item.itemId, item.mode, familyId, isLocked)
  }

  const handleLockItem = (item) => {
    lockItem(trip.tripId, item.itemId, !!item.locked)
  }

  const handleSetMode = (item, newMode) => {
    setMode(trip.tripId, item.itemId, newMode)
  }

  const handleAddItem = (category, name) => {
    addItem(trip.tripId, category, name)
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading checklist…
      </div>
    )
  }

  return (
    <div data-testid="checklist-tab">
      <ChecklistProgress items={items} families={families} />

      {categories.map(cat => (
        <ChecklistCategory
          key={cat}
          category={cat}
          items={items.filter(i => i.category === cat)}
          families={families}
          currentUser={user}
          currentFamilyId={currentFamilyId}
          onToggleCheck={handleToggleCheck}
          onToggleLock={handleToggleLock}
          onLockItem={handleLockItem}
          onSetMode={handleSetMode}
          onAddItem={handleAddItem}
        />
      ))}
    </div>
  )
}
