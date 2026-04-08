import { useState } from 'react'
import { updateTrip } from '../utils/firestore'

const TRIP_TYPES = [
  'RV', 'Tent Camping', 'Glamping', 'Picnic',
  'Day Trip', 'Beach', 'Ski/Snow', 'International Vacation', 'Road Trip', 'Custom',
]

function toDateInput(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toISOString().split('T')[0]
}

export default function EditTripModal({ trip, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        trip.name,
    destination: trip.destination,
    tripType:    TRIP_TYPES.includes(trip.tripType) ? trip.tripType : 'Custom',
    customType:  TRIP_TYPES.includes(trip.tripType) ? '' : trip.tripType,
    startDate:   toDateInput(trip.startDate),
    endDate:     toDateInput(trip.endDate),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const resolvedType = form.tripType === 'Custom' ? form.customType : form.tripType

  const valid =
    form.name && form.destination && resolvedType &&
    form.startDate && form.endDate &&
    form.endDate > form.startDate

  const handleSave = async () => {
    if (!valid) return
    setLoading(true)
    setError(null)
    try {
      await updateTrip(trip.tripId, {
        name: form.name, destination: form.destination,
        tripType: resolvedType,
        startDate: form.startDate, endDate: form.endDate,
      })
      onSaved({ ...trip, name: form.name, destination: form.destination, tripType: resolvedType })
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 16,
  }
  const modal = {
    background: '#0d1520', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
  }
  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
    padding: '9px 12px', color: '#fff', fontSize: 13, marginBottom: 12,
    boxSizing: 'border-box',
  }
  const labelStyle = { color: '#a8c8e8', fontSize: 11, marginBottom: 4, display: 'block' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Edit Trip ✏️</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8c8e8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <input style={inputStyle} placeholder="Trip Name *" value={form.name} onChange={e => set('name', e.target.value)} />
        <input style={inputStyle} placeholder="Destination *" value={form.destination} onChange={e => set('destination', e.target.value)} />

        <select style={inputStyle} value={form.tripType} onChange={e => set('tripType', e.target.value)}>
          {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {form.tripType === 'Custom' && (
          <input style={inputStyle} placeholder="Enter custom trip type *" value={form.customType} onChange={e => set('customType', e.target.value)} />
        )}

        <label style={labelStyle}>Start Date *</label>
        <input type="date" style={inputStyle} value={form.startDate}
          onChange={e => { set('startDate', e.target.value); set('endDate', '') }} />

        <label style={labelStyle}>End Date *</label>
        <input type="date" style={inputStyle} value={form.endDate}
          min={form.startDate}
          onChange={e => set('endDate', e.target.value)} />

        {error && <div style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 10 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={!valid || loading}
          style={{
            width: '100%', background: valid ? '#4285F4' : 'rgba(66,133,244,0.3)',
            border: 'none', borderRadius: 10, padding: '11px 0',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: valid ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
