import { useState } from 'react'
import MealCard from './MealCard'
import MealEditForm from './MealEditForm'

export default function MealCell({ day, slot, meals, user, families, members, onEdit, onDelete, onAdd, onToggleLock }) {
  const [showAddForm, setShowAddForm] = useState(false)

  function handleAdd(data) {
    onAdd({ ...data, day, slot })
    setShowAddForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 140 }}>
      {meals.map(meal => (
        <MealCard
          key={meal.mealId}
          meal={meal}
          user={user}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleLock={onToggleLock}
        />
      ))}

      {showAddForm ? (
        <MealEditForm
          mode="add"
          meal={null}
          day={day}
          slot={slot}
          user={user}
          families={families}
          members={members}
          onSave={handleAdd}
          onDelete={() => {}}
          onClose={() => setShowAddForm(false)}
        />
      ) : (
        <button
          data-testid={`add-meal-${day}-${slot}`}
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'none', border: '1px dashed rgba(255,255,255,0.14)',
            borderRadius: 6, color: '#7a9ab8', fontSize: 11,
            padding: '5px 8px', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          + Add meal
        </button>
      )}
    </div>
  )
}
