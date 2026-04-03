export default function ExpenseList({ expenses, user, currency = 'USD', onEdit, onDelete }) {
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
        const isOwn = exp.createdBy === user.uid
        return (
          <div
            key={exp.expenseId}
            data-testid={`expense-row-${exp.expenseId}`}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
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
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  data-testid={`edit-btn-${exp.expenseId}`}
                  onClick={() => onEdit(exp)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >✏️</button>
                <button
                  data-testid={`delete-btn-${exp.expenseId}`}
                  onClick={() => onDelete(exp.expenseId)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 12 }}
                >🗑</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
