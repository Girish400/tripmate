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
  onToggleCheck, onToggleLock, onLockItem, onSetMode,
}) {
  const isNA     = item.mode === 'na'
  const isShared = item.mode === 'shared'
  const isLocked = !!item.locked

  // ── Shared check helpers ──────────────────────────────────────
  const sc               = item.sharedCheck
  const sharedChecked    = !!sc
  const sharedCheckLocked = sharedChecked && !!sc.lockedAt
  const sharedCanAct     = !isLocked && (!sharedCheckLocked || sc.checkedBy === currentUser.uid)

  // ── Per-family check helpers ──────────────────────────────────
  const familyCanAct = (familyId) => {
    if (isLocked) return false
    if (familyId !== currentFamilyId) return false
    const ch = item.checks?.[familyId]
    if (!ch) return true
    if (!ch.lockedAt) return true
    return ch.checkedBy === currentUser.uid
  }

  return (
    <tr style={{ opacity: isLocked ? 0.6 : 1 }}>
      {/* Item name + lock button */}
      <td style={cell({ color: isNA ? 'var(--text-dim)' : 'var(--text-primary)', fontSize: 13 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            title={isLocked ? 'Unlock item' : 'Lock item'}
            onClick={() => onLockItem(item)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0,
              opacity: isLocked ? 1 : 0.35,
            }}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          {isNA
            ? <span data-testid="item-name-na" style={{ textDecoration: 'line-through' }}>{item.name}</span>
            : item.name
          }
        </div>
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
                  data-testid="check-lock-btn"
                  onClick={() => sc.checkedBy === currentUser.uid && onToggleLock(item, null, sharedCheckLocked)}
                  disabled={sc.checkedBy !== currentUser.uid}
                  style={{ background: 'none', border: 'none', cursor: sc.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 14 }}
                >
                  {sharedCheckLocked ? '🔒' : '🔓'}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sc.displayName}</span>
              </>
            )}
          </div>
        </td>
      )}

      {/* Per-family: one checkbox per family */}
      {!isNA && !isShared && families.map(f => {
        const ch           = item.checks?.[f.familyId]
        const isChecked    = !!ch
        const isCheckLocked = isChecked && !!ch.lockedAt
        const canAct       = familyCanAct(f.familyId)

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
                    data-testid="check-lock-btn"
                    onClick={() => ch.checkedBy === currentUser.uid && onToggleLock(item, f.familyId, isCheckLocked)}
                    disabled={ch.checkedBy !== currentUser.uid}
                    style={{ background: 'none', border: 'none', cursor: ch.checkedBy === currentUser.uid ? 'pointer' : 'default', fontSize: 13 }}
                  >
                    {isCheckLocked ? '🔒' : '🔓'}
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
          onClick={() => !isLocked && onSetMode(item, MODE_NEXT[item.mode])}
          disabled={isLocked}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
            color: isNA ? 'var(--text-dim)' : isShared ? '#4285F4' : 'var(--text-muted)',
            fontSize: 10, cursor: isLocked ? 'not-allowed' : 'pointer',
            opacity: isLocked ? 0.5 : 1,
          }}
        >
          {MODE_LABEL[item.mode]} 🔀
        </button>
      </td>
    </tr>
  )
}
