import { useState } from 'react'

// Used for both adding a new meal (mode='add') and editing an existing one (mode='edit').
// props:
//   mode        'add' | 'edit'
//   meal        object | null   — null when mode='add'
//   day         number          — 0-based day index (used when mode='add')
//   slot        string          — meal slot (used when mode='add')
//   onSave      (data) => void  — { dish, assignedTo, ingredients? }
//   onDelete    (mealId) => void — only called in edit mode
//   onClose     () => void
export default function MealEditForm({ mode, meal, day, slot, onSave, onDelete, onClose }) {
  const [dish,       setDish]       = useState(meal?.dish ?? '')
  const [respType,   setRespType]   = useState(meal?.assignedTo?.type ?? 'everyone')
  const [respLabel,  setRespLabel]  = useState(
    meal?.assignedTo?.type !== 'everyone' ? (meal?.assignedTo?.label ?? '') : ''
  )
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? [])
  const [ingrInput,   setIngrInput]   = useState('')

  function handleSave() {
    if (!dish.trim()) return
    const label = respType === 'everyone' ? 'Everyone' : respLabel.trim() || respType
    onSave({
      dish: dish.trim(),
      assignedTo: { type: respType, id: null, label },
      ...(mode === 'edit' && { ingredients }),
    })
  }

  function addIngr() {
    const val = ingrInput.trim()
    if (!val || ingredients.includes(val)) return
    setIngredients(prev => [...prev, val])
    setIngrInput('')
  }

  function removeIngr(name) {
    setIngredients(prev => prev.filter(i => i !== name))
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  return (
    <div
      data-testid="meal-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Dish name
      </div>
      <input
        data-testid="form-dish"
        value={dish}
        onChange={e => setDish(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Grilled cheese…"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Responsible
      </div>
      <select
        data-testid="form-resp-type"
        value={respType}
        onChange={e => setRespType(e.target.value)}
        style={{ ...inputStyle }}
      >
        <option value="everyone">👥 Everyone</option>
        <option value="family">🍳 Family</option>
        <option value="person">👤 Individual</option>
      </select>

      {respType !== 'everyone' && (
        <input
          data-testid="form-resp-label"
          value={respLabel}
          onChange={e => setRespLabel(e.target.value)}
          placeholder={respType === 'family' ? 'Family name…' : 'Person name…'}
          style={inputStyle}
        />
      )}

      {mode === 'edit' && (
        <>
          <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Ingredients <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ingredients.map(ing => (
              <div key={ing} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ccd9ea' }}>
                <span style={{ flex: 1 }}>{ing}</span>
                <button
                  data-testid={`remove-ingr-${ing}`}
                  onClick={() => removeIngr(ing)}
                  style={{ background: 'none', border: 'none', color: '#7a9ab8', cursor: 'pointer', fontSize: 11 }}
                >✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              data-testid="ingr-input"
              value={ingrInput}
              onChange={e => setIngrInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addIngr(); if (e.key === 'Escape') onClose() }}
              placeholder="Add ingredient…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              data-testid="ingr-add-btn"
              onClick={addIngr}
              style={{
                background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
                borderRadius: 6, color: '#7eb8f7', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
              }}
            >+ Add</button>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          data-testid="form-save"
          onClick={handleSave}
          style={{
            background: '#4285F4', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '5px 12px', cursor: 'pointer',
          }}
        >
          {mode === 'add' ? 'Add meal' : 'Save'}
        </button>
        {mode === 'edit' && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(meal.mealId)}
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
