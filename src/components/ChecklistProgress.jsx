// src/components/ChecklistProgress.jsx

/** Pure function — exported for unit testing */
export function computeProgress(items, families) {
  let total = 0
  let checked = 0
  const familyStats = {}
  families.forEach(f => { familyStats[f.familyId] = { total: 0, checked: 0 } })

  items.forEach(item => {
    if (item.mode === 'na') return
    if (item.mode === 'shared') {
      total++
      if (item.sharedCheck) checked++
    } else {
      families.forEach(f => {
        familyStats[f.familyId].total++
        total++
        if (item.checks?.[f.familyId]) {
          familyStats[f.familyId].checked++
          checked++
        }
      })
    }
  })

  return {
    overall: total === 0 ? 0 : Math.round((checked / total) * 100),
    checked,
    total,
    noItems: total === 0,
    perFamily: families.map(f => ({
      familyId: f.familyId,
      name: f.name,
      percent: familyStats[f.familyId].total === 0
        ? 0
        : Math.round((familyStats[f.familyId].checked / familyStats[f.familyId].total) * 100),
      checked: familyStats[f.familyId].checked,
      total: familyStats[f.familyId].total,
    })),
  }
}

export default function ChecklistProgress({ items, families }) {
  const { overall, checked, total, noItems, perFamily } = computeProgress(items, families)

  const ProgressBar = ({ percent, label, sub }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: sub ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: sub ? 11 : 13 }}>
          {label}
        </span>
        <span style={{ color: sub ? 'var(--text-muted)' : '#fff', fontSize: sub ? 11 : 13, fontWeight: sub ? 400 : 600 }}>
          {percent}%
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: sub ? 5 : 8, overflow: 'hidden' }}>
        <div style={{
          width: `${percent}%`, height: '100%', borderRadius: 6,
          background: sub
            ? 'linear-gradient(90deg, #4285F4, #34A853)'
            : 'linear-gradient(90deg, #34A853, #4ade80)',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )

  if (noItems) {
    return (
      <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        No items yet — checklist will load shortly.
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: 16, marginBottom: 20,
    }}>
      <ProgressBar
        percent={overall}
        label={`Overall Progress — ${checked} / ${total} packed`}
        sub={false}
      />
      {families.length > 1 && (
        <div style={{ marginTop: 12 }}>
          {perFamily.map(f => (
            <ProgressBar key={f.familyId} percent={f.percent} label={`Family ${f.name}`} sub />
          ))}
        </div>
      )}
    </div>
  )
}
