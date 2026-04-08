import { useState } from 'react'
import ChecklistItemRow from './ChecklistItemRow'
import { CATEGORY_ICONS } from '../utils/checklistTemplates'

export default function ChecklistCategory({
  category, items, families,
  currentUser, currentFamilyId,
  onToggleCheck, onToggleLock, onSetMode, onAddItem,
}) {
  const [expanded, setExpanded]       = useState(true)
  const [addingItem, setAddingItem]   = useState(false)
  const [newItemName, setNewItemName] = useState('')

  const icon         = CATEGORY_ICONS[category] ?? '📦'
  const totalInCat   = items.filter(i => i.mode !== 'na').length
  const checkedInCat = items.filter(i => {
    if (i.mode === 'na') return false
    if (i.mode === 'shared') return !!i.sharedCheck
    return families.some(f => !!i.checks?.[f.familyId])
  }).length

  const handleAddItem = async () => {
    const name = newItemName.trim()
    if (!name) return
    await onAddItem(category, name)
    setNewItemName('')
    setAddingItem(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Category header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: expanded ? '10px 10px 0 0' : 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
          {icon} {category}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {checkedInCat}/{totalInCat} {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderTop: 'none', borderRadius: '0 0 10px 10px',
          overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
            {/* Column headers */}
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, width: '40%' }}>
                  Item
                </th>
                {families.map(f => (
                  <th key={f.familyId} style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                    {f.name}
                  </th>
                ))}
                <th style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                  Mode
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ChecklistItemRow
                  key={item.itemId}
                  item={item}
                  families={families}
                  currentUser={currentUser}
                  currentFamilyId={currentFamilyId}
                  onToggleCheck={onToggleCheck}
                  onToggleLock={onToggleLock}
                  onSetMode={onSetMode}
                />
              ))}
            </tbody>
          </table>

          {/* Add item row */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {addingItem ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddItem()
                    if (e.key === 'Escape') setAddingItem(false)
                  }}
                  placeholder="Item name…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 7, padding: '6px 10px',
                    color: '#fff', fontSize: 13,
                  }}
                />
                <button onClick={handleAddItem} style={{ background: 'rgba(52,168,83,0.2)', border: '1px solid rgba(52,168,83,0.4)', borderRadius: 7, padding: '6px 12px', color: '#6ed48a', fontSize: 12, cursor: 'pointer' }}>
                  Add
                </button>
                <button onClick={() => setAddingItem(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: '2px 0' }}
              >
                + Add item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
