// src/components/ChecklistItemRow.jsx

const MODE_NEXT  = { 'per-family': 'shared', 'shared': 'na', 'na': 'per-family' }

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
  const uid       = currentUser.uid
  const isNA      = item.mode === 'na'
  const isShared  = item.mode === 'shared'

  // ── Mode ownership ───────────────────────────────────────────────────────────
  // For shared/na, only the modeOwner can interact with the mode button
  const modeOwned     = isShared || isNA
  const isModeOwner   = modeOwned ? item.modeOwnerUid === uid : true
  const modeDisabled  = modeOwned && !isModeOwner

  const modeLabel = (() => {
    if (isShared) return `SHARED · ${item.modeOwnerName} 🔀`
    if (isNA)     return `NA · ${item.modeOwnerName} 🔀`
    return '↔ 🔀'
  })()

  // ── Shared check helpers ─────────────────────────────────────────────────────
  // Only the modeOwner can check/lock in shared mode
  const sc               = item.sharedCheck
  const sharedChecked    = !!sc
  const sharedLocked     = sharedChecked && !!sc?.lockedAt
  // Checkbox: modeOwner can check; or if checked, modeOwner can uncheck (unless locked)
  const sharedCheckEnabled = isShared && isModeOwner && !sharedLocked
  // Lock button: checker (modeOwner) can lock; locker can unlock via lockedBy
  const sharedLockerUid    = sc?.lockedBy ?? sc?.checkedBy
  const sharedLockEnabled  = sharedChecked && (
    sharedLocked ? sc.lockedBy === uid : isModeOwner
  )

  // ── Per-family check helpers ─────────────────────────────────────────────────
  const familyCheckEnabled = (familyId) => {
    if (familyId !== currentFamilyId) return false
    const ch = item.checks?.[familyId]
    if (!ch) return true                      // unchecked — anyone in family can check
    if (ch.lockedAt) return false             // locked — nobody can uncheck
    return ch.checkedBy === uid               // checked — only checker can uncheck
  }

  const familyLockEnabled = (ch) => {
    if (!ch) return false
    if (ch.lockedAt) return ch.lockedBy === uid   // locked: only locker can unlock
    return ch.checkedBy === uid                   // unlocked: only checker can lock
  }

  return (
    <tr>
      {/* Item name — no item-level lock button */}
      <td style={cell({ color: isNA ? 'var(--text-dim)' : 'var(--text-primary)', fontSize: 13 })}>
        {isNA
          ? <span data-testid="item-name-na" style={{ textDecoration: 'line-through' }}>{item.name}</span>
          : item.name
        }
      </td>

      {/* NA: single cell spanning all family columns, shows owner name */}
      {isNA && (
        <td colSpan={families.length} style={cell({ color: 'var(--text-dim)', textAlign: 'center', fontSize: 12 })}>
          {item.modeOwnerName ?? '──'}
        </td>
      )}

      {/* Shared: single checkbox spanning all family columns */}
      {isShared && (
        <td colSpan={families.length} style={cell({ textAlign: 'center' })}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={sharedChecked}
              disabled={!sharedCheckEnabled}
              onChange={() => sharedCheckEnabled && onToggleCheck(item, null, sharedChecked)}
              style={{ width: 16, height: 16, cursor: sharedCheckEnabled ? 'pointer' : 'not-allowed' }}
            />
            {sharedChecked && (
              <>
                <button
                  data-testid="check-lock-btn"
                  onClick={() => sharedLockEnabled && onToggleLock(item, null, sharedLocked)}
                  disabled={!sharedLockEnabled}
                  style={{
                    background: 'none', border: 'none',
                    cursor: sharedLockEnabled ? 'pointer' : 'default', fontSize: 14,
                  }}
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
        const ch           = item.checks?.[f.familyId]
        const isChecked    = !!ch
        const isCheckLocked = isChecked && !!ch.lockedAt
        const canCheck     = familyCheckEnabled(f.familyId)
        const canLock      = f.familyId === currentFamilyId && familyLockEnabled(ch)

        return (
          <td key={f.familyId} style={cell({ textAlign: 'center' })}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!canCheck}
                onChange={() => canCheck && onToggleCheck(item, f.familyId, isChecked)}
                style={{ width: 16, height: 16, cursor: canCheck ? 'pointer' : 'not-allowed' }}
              />
              {isChecked && (
                <>
                  <button
                    data-testid="check-lock-btn"
                    onClick={() => canLock && onToggleLock(item, f.familyId, isCheckLocked)}
                    disabled={!canLock}
                    style={{
                      background: 'none', border: 'none',
                      cursor: canLock ? 'pointer' : 'default', fontSize: 13,
                    }}
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
          onClick={() => !modeDisabled && onSetMode(item, MODE_NEXT[item.mode])}
          disabled={modeDisabled}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
            color: isNA ? 'var(--text-dim)' : isShared ? '#4285F4' : 'var(--text-muted)',
            fontSize: 10, cursor: modeDisabled ? 'not-allowed' : 'pointer',
            opacity: modeDisabled ? 0.5 : 1,
          }}
        >
          {modeLabel}
        </button>
      </td>
    </tr>
  )
}
