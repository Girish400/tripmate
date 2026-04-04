import { useState } from 'react'

const PRESET_ICONS = ['🥾', '🚗', '🏖', '⛺', '🎿', '🏊', '🎢', '🎭', '🛍', '🎵', '🏔', '🏕']

export default function ActivityEditForm({ activity, families, onSave, onDelete, onClose }) {
  const isEdit = !!activity?.activityId

  const [icon,       setIcon]       = useState(activity?.icon       ?? PRESET_ICONS[0])
  const [title,      setTitle]      = useState(activity?.title      ?? '')
  const [time,       setTime]       = useState(activity?.time       ?? '')
  const [location,   setLocation]   = useState(activity?.location   ?? '')
  const [notes,      setNotes]      = useState(activity?.notes      ?? '')
  const [assignedTo, setAssignedTo] = useState(activity?.assignedTo ?? '')

  const isValid = title.trim() && time

  async function handleSave() {
    if (!isValid) return
    await onSave({
      icon,
      title: title.trim(),
      time,
      location: location.trim() || null,
      notes: notes.trim() || null,
      assignedTo: assignedTo || null,
    })
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 10, color: '#7a9ab8', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.4px',
  }

  return (
    <div
      data-testid="activity-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={labelStyle}>Icon</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PRESET_ICONS.map(emoji => (
          <button
            key={emoji}
            data-testid={`icon-btn-${emoji}`}
            onClick={() => setIcon(emoji)}
            style={{
              background: icon === emoji ? 'rgba(66,133,244,0.3)' : 'rgba(255,255,255,0.06)',
              border: icon === emoji ? '1px solid rgba(66,133,244,0.6)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '4px 6px', cursor: 'pointer', fontSize: 16,
            }}
          >{emoji}</button>
        ))}
      </div>

      <div style={labelStyle}>Title</div>
      <input
        data-testid="form-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Hike to waterfall"
        style={inputStyle}
        autoFocus
      />

      <div style={labelStyle}>Time</div>
      <input
        data-testid="form-time"
        type="time"
        value={time}
        onChange={e => setTime(e.target.value)}
        style={inputStyle}
      />

      <div style={labelStyle}>Location <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <input
        data-testid="form-location"
        value={location}
        onChange={e => setLocation(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Blue Ridge Trail"
        style={inputStyle}
      />

      <div style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <textarea
        data-testid="form-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Any details…"
        rows={2}
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      <div style={labelStyle}>Assigned to <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
      <select
        data-testid="form-assigned-to"
        value={assignedTo}
        onChange={e => setAssignedTo(e.target.value)}
        style={inputStyle}
      >
        <option value="">No assignment</option>
        {families.map(f => (
          <option key={f.familyId} value={f.familyId}>{f.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          data-testid="form-save"
          onClick={handleSave}
          style={{
            background: '#4285F4', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '5px 12px', cursor: 'pointer',
            opacity: isValid ? 1 : 0.5,
          }}
        >
          {isEdit ? 'Save' : 'Add activity'}
        </button>
        {isEdit && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(activity.activityId)}
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 6, color: '#f28b82', fontSize: 11,
              padding: '5px 10px', cursor: 'pointer',
            }}
          >Delete</button>
        )}
        <button
          data-testid="form-cancel"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.07)', border: 'none',
            borderRadius: 6, color: '#7a9ab8', fontSize: 11,
            padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}
