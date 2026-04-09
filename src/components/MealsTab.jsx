import { useEffect, useState } from 'react'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient, toggleMealLock } from '../utils/meals'
import { subscribeShoppingItems, toggleShoppingItem } from '../utils/shopping'
import { getTripFamilies, getTripMembers } from '../utils/firestore'
import MealGrid from './MealGrid'
import MealEditForm from './MealEditForm'
import ShoppingList from './ShoppingList'

export default function MealsTab({ trip, user }) {
  const [meals,        setMeals]        = useState([])
  const [shopping,     setShopping]     = useState([])
  const [families,     setFamilies]     = useState([])
  const [members,      setMembers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [editingMeal,  setEditingMeal]  = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('grid')

  useEffect(() => {
    const unsub1 = subscribeMeals(trip.tripId, items => {
      setMeals(items)
      setLoading(false)
    })
    const unsub2 = subscribeShoppingItems(trip.tripId, setShopping)
    Promise.all([
      getTripFamilies(trip.tripId),
      getTripMembers(trip.tripId),
    ]).then(([fams, mems]) => {
      setFamilies(fams)
      setMembers(mems)
    }).catch(() => {})
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  function mealLabel(meal) {
    const slotName = meal.slot[0].toUpperCase() + meal.slot.slice(1)
    return `Day ${meal.day + 1} ${slotName} · ${meal.dish}`
  }

  async function handleAdd({ dish, assignedTo, day, slot }) {
    await addMeal(trip.tripId, { dish, slot, day, assignedTo, createdBy: user.uid })
  }

  async function handleSaveEdit(data) {
    if (!editingMeal) return
    const { ingredients: newIngredients, ...rest } = data
    await updateMeal(trip.tripId, editingMeal.mealId, rest)

    const oldIngredients = editingMeal.ingredients ?? []
    const label = mealLabel({ ...editingMeal, dish: rest.dish })
    for (const ing of newIngredients) {
      if (!oldIngredients.includes(ing)) await addIngredient(trip.tripId, editingMeal.mealId, ing, label)
    }
    for (const ing of oldIngredients) {
      if (!newIngredients.includes(ing)) await removeIngredient(trip.tripId, editingMeal.mealId, ing)
    }
    setEditingMeal(null)
  }

  async function handleDelete(mealId) {
    await deleteMeal(trip.tripId, mealId)
    setEditingMeal(null)
  }

  async function handleToggleMealLock(meal, isLocked) {
    await toggleMealLock(trip.tripId, meal.mealId, isLocked, user.uid, user.displayName)
  }

  async function handleToggleShopping(itemId, isChecked) {
    await toggleShoppingItem(trip.tripId, itemId, user.uid, isChecked)
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>Loading meals…</div>
  }

  const subTabStyle = (key) => ({
    padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
    border: activeSubTab === key ? '1px solid rgba(66,133,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: activeSubTab === key ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeSubTab === key ? '#7eb8f7' : '#7a9ab8',
    fontWeight: activeSubTab === key ? 600 : 400,
  })

  return (
    <div data-testid="meals-tab">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div onClick={() => setActiveSubTab('grid')}     style={subTabStyle('grid')}>🍽️ Meal Plan</div>
        <div onClick={() => setActiveSubTab('shopping')} style={subTabStyle('shopping')}>🛒 Shopping List</div>
      </div>

      {activeSubTab === 'grid' && (
        <MealGrid
          trip={trip}
          meals={meals}
          user={user}
          families={families}
          members={members}
          onEdit={meal => setEditingMeal(meal)}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onToggleLock={handleToggleMealLock}
        />
      )}
      {activeSubTab === 'shopping' && (
        <ShoppingList
          items={shopping}
          onToggle={handleToggleShopping}
        />
      )}

      {editingMeal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingMeal(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <MealEditForm
              mode="edit"
              meal={editingMeal}
              user={user}
              families={families}
              members={members}
              onSave={handleSaveEdit}
              onDelete={handleDelete}
              onClose={() => setEditingMeal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
