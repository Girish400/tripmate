import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc, updateDoc, deleteDoc, onSnapshot, collection, doc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore'
import { subscribeMeals, addMeal, updateMeal, deleteMeal, addIngredient, removeIngredient } from '../../src/utils/meals'
import { subscribeShoppingItems, toggleShoppingItem } from '../../src/utils/shopping'
import { render, screen, fireEvent, act } from '@testing-library/react'
import MealsTab from '../../src/components/MealsTab'
import * as mealsUtils from '../../src/utils/meals'
import * as shoppingUtils from '../../src/utils/shopping'

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

const mockTrip = {
  tripId: 'trip1',
  tripType: 'Tent Camping',
  startDate: { toDate: () => new Date('2026-04-10') },
  endDate:   { toDate: () => new Date('2026-04-12') },
}
const mockUser = { uid: 'u1', displayName: 'Test User' }

describe('MealsTab integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([])
      return vi.fn()
    })

    vi.spyOn(shoppingUtils, 'subscribeShoppingItems').mockImplementation((tripId, cb) => {
      cb([])
      return vi.fn()
    })

    vi.spyOn(mealsUtils, 'addMeal').mockResolvedValue({ id: 'meal-new' })
    vi.spyOn(mealsUtils, 'updateMeal').mockResolvedValue()
    vi.spyOn(mealsUtils, 'deleteMeal').mockResolvedValue()
    vi.spyOn(mealsUtils, 'addIngredient').mockResolvedValue()
    vi.spyOn(mealsUtils, 'removeIngredient').mockResolvedValue()
    vi.spyOn(shoppingUtils, 'toggleShoppingItem').mockResolvedValue()
  })

  it('renders meals-tab with Meal Grid and Shopping List sub-tabs', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('meals-tab')).toBeTruthy()
    expect(screen.getByText('📅 Meal Grid')).toBeTruthy()
    expect(screen.getByText('🛒 Shopping List')).toBeTruthy()
  })

  it('renders grid with correct number of day rows', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByText('Day 1')).toBeTruthy()
    expect(screen.getByText('Day 2')).toBeTruthy()
    expect(screen.getByText('Day 3')).toBeTruthy()
  })

  it('clicking "+ Add meal" shows the add form', async () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getAllByTestId('add-meal-0-breakfast')[0])
    expect(screen.getByTestId('meal-edit-form')).toBeTruthy()
  })

  it('submitting add form calls addMeal with correct args', async () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getAllByTestId('add-meal-0-breakfast')[0])
    fireEvent.change(screen.getByTestId('form-dish'), { target: { value: 'Waffles' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(mealsUtils.addMeal).toHaveBeenCalledWith('trip1', expect.objectContaining({
      dish: 'Waffles', slot: 'breakfast', day: 0,
    }))
  })

  it('clicking a meal card opens edit form', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    expect(screen.getByTestId('meal-edit-form')).toBeTruthy()
  })

  it('saving edit form calls updateMeal', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('meal-card'))
    fireEvent.change(screen.getByTestId('form-dish'), { target: { value: 'Pancakes Updated' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(mealsUtils.updateMeal).toHaveBeenCalledWith('trip1', 'm1', expect.objectContaining({ dish: 'Pancakes Updated' }))
  })

  it('clicking delete on a meal card calls deleteMeal', async () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((tripId, cb) => {
      cb([{
        mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0,
        assignedTo: { type: 'everyone', id: null, label: 'Everyone' },
        ingredients: [],
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    await act(async () => { fireEvent.click(screen.getByTestId('meal-card-delete')) })
    expect(mealsUtils.deleteMeal).toHaveBeenCalledWith('trip1', 'm1')
  })

  it('shopping list tab renders empty state when no items', () => {
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByText('🛒 Shopping List'))
    expect(screen.getByText(/No ingredients added yet/)).toBeTruthy()
  })

  it('toggling a shopping item calls toggleShoppingItem', async () => {
    vi.spyOn(shoppingUtils, 'subscribeShoppingItems').mockImplementation((tripId, cb) => {
      cb([{
        itemId: 'si1', name: 'eggs', mealLabel: 'Day 1 Breakfast · Pancakes',
        checkedBy: null, checkedAt: null,
      }])
      return vi.fn()
    })
    render(<MealsTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByText('🛒 Shopping List'))
    await act(async () => { fireEvent.click(screen.getByTestId('shop-item-si1')) })
    expect(shoppingUtils.toggleShoppingItem).toHaveBeenCalledWith('trip1', 'si1', 'u1', true)
  })
})
