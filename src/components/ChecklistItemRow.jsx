// src/components/ChecklistItemRow.jsx

const MODE_NEXT = { 'per-family': 'shared', 'shared': 'na', 'na': 'per-family' }
const MODE_LABEL = { 'per-family': '↔', 'shared': 'SHARED', 'na': 'NA' }

const cell = (extra = {}) => ({
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  verticalAlign: 'middle',
  ...extra,
})

export default function ChecklistItemRow({
  item, families, currentUser, currentFamilyId,
  onToggleCheck, onToggleLock, onSetMode,
}) {
  const isNA     = item.mode === 'na'
  const isShared = item.mode === 'shared'

  // ── Shared check helpers ──────────────────────────────────────
  const sc            = item.sharedCheck
  const sharedChecked = !!sc
  const sharedLocked  = sharedChecked && !!sc.lockedAt
  const sharedCanAct  = !sharedLocked || sc.checkedBy === currentUser.uid

  // ── Per-family check helpers ──────────────────────────────────
  const familyCanAct = (familyId) => {
    if (familyId !== currentFamilyId) return false
    const ch = item.checks?.[familyId]
    if (!ch) return true
    if (!ch.lockedAt) return true
    return ch.checkedBy === currentUser.uid
  }

  return (
    <tr>
      {/* Item name */}
      <td style={cell({ color: isNA ? 'var(--text-dim)' : 'var(--text-primary)', fontSize: 13 })}>
        {isNA
          ? <span data-testid="item-name-na" style={{ textDecoration: 'line-through' }}>{item.name}</span>
          : item.name
        }
      </td>

      {/* NA: dashes in all family cells */}
      {isNA && families.map(f => (
        <td key={f.familyId} style={cell({ color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 })}>
          ──
        </td>
      ))}

      {/* Shared: single checkbox spanning all family columns */}
      {isShared && (
        <td colSpan={families.length} style={cell({ textAlign: 'center' })}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={sharedChecked}
              disabled={!sharedCanAct}
              onChange={() => onToggleCheck(item, null, sharedChecked)}
              style={{ width: 16, height: 16, cursor: sharedCanAct ? 'pointer' : 'not-allowed' }}
            />
            {sharedChecked && (
              <>
                <button
                  onClick={() => sc.checkedBy === currentUser.uid && onToggleLock(item, null, sharedLocked)}
                  disabled={sc.checkedBy !== currentUser.uid}
                  style={{ background: 'none', border: 'none', cursor: sc.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 14 }}
                >
                  {sharedLocked ? '🔒' : '🔓'}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sc.displayName}</span>
              </>
            )}
          </div>
        </td>
      )}

      {/* Per-family: one checkbox per family */}
      {!isNA && !isShared && families.map(f => {
        const ch        = item.checks?.[f.familyId]
        const isChecked = !!ch
        const isLocked  = isChecked && !!ch.lockedAt
        const canAct    = familyCanAct(f.familyId)

        return (
          <td key={f.familyId} style={cell({ textAlign: 'center' })}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!canAct}
                onChange={() => canAct && onToggleCheck(item, f.familyId, isChecked)}
                style={{ width: 16, height: 16, cursor: canAct ? 'pointer' : 'not-allowed' }}
              />
              {isChecked && (
                <>
                  <button
                    onClick={() => ch.checkedBy === currentUser.uid && onToggleLock(item, f.familyId, isLocked)}
                    disabled={ch.checkedBy !== currentUser.uid}
                    style={{ background: 'none', border: 'none', cursor: ch.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 13 }}
                  >
                    {isLocked ? '🔒' : '🔓'}
                  </button>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{ch.displayName}</span>
                </>
              )}
            </div>
          </td>
        )
      })}

      {/* Mode toggle */}
      <td style={cell({ textAlign: 'right', whiteSpace: 'nowrap' })}>
        <button
          data-testid="mode-toggle"
          onClick={() => onSetMode(item, MODE_NEXT[item.mode])}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
            color: isNA ? 'var(--text-dim)' : isShared ? '#4285F4' : 'var(--text-muted)',
            fontSize: 10, cursor: 'pointer',
          }}
        >
          {MODE_LABEL[item.mode]} 🔀
        </button>
      </td>
    </tr>
  )
}
