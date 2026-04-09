import { useState } from 'react'

export default function ExpenseEditForm({ expense, userFamilyId, userFamilyName, labels, user, onSave, onDelete, onClose, onAddLabel }) {
  const isEdit = !!expense?.expenseId

  const paidByFamilyId   = isEdit ? expense.paidByFamilyId   : userFamilyId
  const paidByFamilyName = isEdit ? expense.paidByFamilyName : userFamilyName

  const [description,   setDescription]   = useState(expense?.description ?? '')
  const [amount,        setAmount]        = useState(expense?.amount       ?? '')
  const [label,         setLabel]         = useState(expense?.label        ?? '')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [newLabelName,  setNewLabelName]  = useState('')

  const isValid = description.trim() && parseFloat(amount) > 0

  async function handleSave() {
    if (!isValid) return
    await onSave({
      description: description.trim(),
      amount: parseFloat(amount),
      paidByFamilyId,
      paidByFamilyName,
      label: label || null,
    })
    onClose()
  }

  async function handleCreateLabel() {
    const name = newLabelName.trim()
    if (!name) return
    await onAddLabel(name)
    setLabel(name)
    setCreatingLabel(false)
    setNewLabelName('')
  }

  function handleLabelChange(val) {
    if (val === '__create__') { setCreatingLabel(true); setLabel('') }
    else { setLabel(val); setCreatingLabel(false) }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#fff', fontSize: 12, padding: '6px 9px', outline: 'none', width: '100%',
  }

  return (
    <div
      data-testid="expense-edit-form"
      style={{
        background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(66,133,244,0.4)',
        borderRadius: 9, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Description
      </div>
      <input
        data-testid="form-description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        placeholder="e.g. Groceries at Walmart"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Amount
      </div>
      <input
        data-testid="form-amount"
        type="number" min="0.01" step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="0.00"
        style={inputStyle}
      />

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Paid by
      </div>
      <div
        data-testid="paid-by-display"
        style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, color: '#ccc', fontSize: 12, padding: '6px 9px',
        }}
      >
        {paidByFamilyName}
      </div>

      <div style={{ fontSize: 10, color: '#7a9ab8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Label <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
      </div>
      {!creatingLabel && (
        <select
          data-testid="form-label"
          value={label}
          onChange={e => handleLabelChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">No label</option>
          {labels.map(l => <option key={l.labelId} value={l.name}>{l.name}</option>)}
          <option value="__create__">+ Create new label…</option>
        </select>
      )}
      {creatingLabel && (
        <div style={{ display: 'flex', gap: 5 }}>
          <input
            data-testid="new-label-input"
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); if (e.key === 'Escape') { setCreatingLabel(false); setNewLabelName('') } }}
            placeholder="Label name…"
            style={{ ...inputStyle, flex: 1 }}
            autoFocus
          />
          <button
            data-testid="new-label-add-btn"
            onClick={handleCreateLabel}
            style={{
              background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
              borderRadius: 6, color: '#7eb8f7', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
            }}
          >Add</button>
        </div>
      )}

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
        >{isEdit ? 'Save' : 'Add expense'}</button>
        {isEdit && (
          <button
            data-testid="form-delete"
            onClick={() => onDelete(expense.expenseId)}
            style={{
              background: 'rgba(234,67,53,0.15)', border: '1px solid rgba(234,67,53,0.3)',
              borderRadius: 6, color: '#f28b82', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
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
