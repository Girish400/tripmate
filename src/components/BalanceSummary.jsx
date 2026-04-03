export default function BalanceSummary({ balances, currency = 'USD' }) {
  if (balances.length === 0) return null

  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount))

  return (
    <div data-testid="balance-summary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {balances.map(({ familyId, name, balance }) => {
        const isCreditor = balance > 0
        const isDebtor   = balance < 0
        const color  = isCreditor ? '#6ed48a' : isDebtor ? '#f47b7b' : '#7a9ab8'
        const bg     = isCreditor ? 'rgba(52,168,83,0.1)'  : isDebtor ? 'rgba(234,67,53,0.1)'  : 'rgba(255,255,255,0.05)'
        const border = isCreditor ? '1px solid rgba(52,168,83,0.3)' : isDebtor ? '1px solid rgba(234,67,53,0.3)' : '1px solid rgba(255,255,255,0.1)'
        const sign   = isCreditor ? '+' : isDebtor ? '−' : ''

        return (
          <div
            key={familyId}
            data-testid={`balance-chip-${familyId}`}
            style={{ background: bg, border, borderRadius: 8, padding: '6px 12px', minWidth: 100 }}
          >
            <div style={{ color: '#a8c8e8', fontSize: 11 }}>{name}</div>
            <div style={{ color, fontSize: 14, fontWeight: 700 }}>{sign}{fmt(balance)}</div>
          </div>
        )
      })}
    </div>
  )
}
