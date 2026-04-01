import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot, collection, doc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient } from '../../src/utils/meals'
import { subscribeShoppingItems, toggleShoppingItem } from '../../src/utils/shopping'

const TRIP_ID = 'trip1'

describe('meals utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeMeals calls onSnapshot on the meals collection', () => {
    const cb = vi.fn()
    subscribeMeals(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('addMeal calls addDoc with correct fields', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'meal1' })
    await addMeal(TRIP_ID, {
      dish: 'Pancakes',
      slot: 'breakfast',
      day: 0,
      assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
    })
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dish: 'Pancakes',
        slot: 'breakfast',
        day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      })
    )
  })

  it('updateMeal calls updateDoc', async () => {
    await updateMeal(TRIP_ID, 'meal1', { dish: 'Waffles' })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { dish: 'Waffles' }
    )
  })

  it('deleteMeal calls deleteDoc', async () => {
    await deleteMeal(TRIP_ID, 'meal1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything())
  })

  it('addIngredient calls updateDoc with arrayUnion and addDoc for shoppingItem', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'si1' })
    await addIngredient(TRIP_ID, 'meal1', 'eggs x12', 'Day 1 Breakfast · Pancakes')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { ingredients: expect.anything() }
    )
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'eggs x12', mealId: 'meal1' })
    )
  })

  it('removeIngredient calls updateDoc with arrayRemove and deleteDoc for shoppingItem', async () => {
    const { getDocs } = await import('firebase/firestore')
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'si1', ref: {}, data: () => ({ name: 'eggs x12', mealId: 'meal1' }) }],
      empty: false,
    })
    await removeIngredient(TRIP_ID, 'meal1', 'eggs x12')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { ingredients: expect.anything() }
    )
    expect(deleteDoc).toHaveBeenCalled()
  })
})

describe('shopping utils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribeShoppingItems calls onSnapshot on shoppingItems collection', () => {
    const cb = vi.fn()
    subscribeShoppingItems(TRIP_ID, cb)
    expect(onSnapshot).toHaveBeenCalled()
  })

  it('toggleShoppingItem sets checkedBy and checkedAt when checking', async () => {
    await toggleShoppingItem(TRIP_ID, 'si1', 'user1', true)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ checkedBy: 'user1' })
    )
  })

  it('toggleShoppingItem clears checkedBy and checkedAt when unchecking', async () => {
    await toggleShoppingItem(TRIP_ID, 'si1', 'user1', false)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { checkedBy: null, checkedAt: null }
    )
  })
})
