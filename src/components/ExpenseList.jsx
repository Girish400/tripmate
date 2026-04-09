export default function ExpenseList({ expenses, user, currency = 'USD', onEdit, onDelete, onToggleLock }) {
  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  if (expenses.length === 0) {
    return (
      <div data-testid="expense-list-empty" style={{ color: '#7a9ab8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
        No expenses yet — add the first one
      </div>
    )
  }

  return (
    <div data-testid="expense-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {expenses.map(exp => {
        const isOwn    = exp.createdBy === user?.uid
        const isLocked = !!exp.lockedAt

        return (
          <div
            key={exp.expenseId}
            data-testid={`expense-row-${exp.expenseId}`}
            style={{
              background: isLocked ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isLocked ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              {isLocked && (
                <div
                  data-testid={`lock-banner-${exp.expenseId}`}
                  style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}
                >
                  🔒 Locked by {exp.lockedByName}
                </div>
              )}
              <div style={{ color: '#fff', fontSize: 13 }}>{exp.description}</div>
              <div style={{ color: '#7a9ab8', fontSize: 11, marginTop: 2 }}>
                {exp.paidByFamilyName}
                {exp.label && (
                  <span
                    data-testid={`label-pill-${exp.expenseId}`}
                    style={{
                      marginLeft: 6, background: 'rgba(66,133,244,0.15)',
                      border: '1px solid rgba(66,133,244,0.3)',
                      borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#7eb8f7',
                    }}
                  >
                    {exp.label}
                  </span>
                )}
              </div>
            </div>
            <div style={{ color: '#6ed48a', fontSize: 14, fontWeight: 700 }}>{fmt(exp.amount)}</div>
            {isOwn && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  data-testid={`lock-btn-${exp.expenseId}`}
                  onClick={() => onToggleLock(exp, isLocked)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                >
                  {isLocked ? '🔒' : '🔓'}
                </button>
                {!isLocked && (
                  <>
                    <button
                      data-testid={`edit-btn-${exp.expenseId}`}
                      aria-label={`Edit ${exp.description}`}
                      onClick={() => onEdit(exp)}
                      style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                    >✏️</button>
                    <button
                      data-testid={`delete-btn-${exp.expenseId}`}
                      aria-label={`Delete ${exp.description}`}
                      onClick={() => onDelete(exp.expenseId)}
                      style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                    >🗑</button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
