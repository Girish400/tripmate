import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ItineraryTab from '../../src/components/ItineraryTab'
import * as itineraryUtils from '../../src/utils/itinerary'
import * as mealsUtils from '../../src/utils/meals'
import * as firestoreUtils from '../../src/utils/firestore'

// Trip: Apr 5–7, 2027 (3 days). Today is always before start → defaults to Day 1.
const mockTrip = {
  tripId: 'trip1',
  startDate: new Date(2027, 3, 5),  // Apr 5 2027
  endDate:   new Date(2027, 3, 7),  // Apr 7 2027
}
const mockUser = { uid: 'u1', displayName: 'Test User' }

const mockActivities = [
  { activityId: 'a1', title: 'Hike', time: '09:00', date: '2027-04-05', icon: '🥾', location: 'Trail', notes: null, assignedTo: null, createdBy: 'u1' },
  { activityId: 'a2', title: 'Museum', time: '14:00', date: '2027-04-06', icon: '🎭', location: null, notes: null, assignedTo: null, createdBy: 'u2' },
]

// Meal on day 0 = Apr 5
const mockMeals = [
  { mealId: 'm1', dish: 'Pancakes', slot: 'breakfast', day: 0, assignedTo: { type: 'everyone', label: 'Everyone' }, ingredients: [] },
]

const mockFamilies = [
  { familyId: 'fA', name: 'Sharma family' },
]

describe('ItineraryTab integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb([])
      return vi.fn()
    })
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue([])
    vi.spyOn(itineraryUtils, 'addActivity').mockResolvedValue({ id: 'new-act' })
    vi.spyOn(itineraryUtils, 'updateActivity').mockResolvedValue()
    vi.spyOn(itineraryUtils, 'deleteActivity').mockResolvedValue()
  })

  it('renders itinerary-tab', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('itinerary-tab')).toBeTruthy()
  })

  it('renders day tabs for each trip day', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByTestId('day-tab-2027-04-05')).toBeTruthy()
    expect(screen.getByTestId('day-tab-2027-04-06')).toBeTruthy()
    expect(screen.getByTestId('day-tab-2027-04-07')).toBeTruthy()
  })

  it('defaults to Day 1 when today is outside the trip range', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Day 1 tab should be active (blue style applied)
    const tab = screen.getByTestId('day-tab-2027-04-05')
    expect(tab.style.background).toMatch(/rgba\(66,?\s*133,?\s*244/)
  })

  it('shows empty state when no activities for the selected day', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    expect(screen.getByText(/No activities planned/)).toBeTruthy()
  })

  it('shows activity card for the selected day', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Day 1 selected by default — a1 is on Apr 5
    expect(screen.getByTestId('activity-card-a1')).toBeTruthy()
    // a2 is on Apr 6 — should not appear
    expect(screen.queryByTestId('activity-card-a2')).toBeNull()
  })

  it('shows meal card for the selected day interleaved', () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb(mockMeals)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Meal on day 0 = Apr 5 = Day 1 (selected by default)
    expect(screen.getByTestId('meal-card-itinerary-m1')).toBeTruthy()
  })

  it('does not show meals for other days', () => {
    vi.spyOn(mealsUtils, 'subscribeMeals').mockImplementation((_tripId, cb) => {
      cb(mockMeals)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // Switch to Day 2 (Apr 6) — meal m1 is on Apr 5, should disappear
    fireEvent.click(screen.getByTestId('day-tab-2027-04-06'))
    expect(screen.queryByTestId('meal-card-itinerary-m1')).toBeNull()
  })

  it('opens add form when "+ Add Activity" is clicked', () => {
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('add-activity-btn'))
    expect(screen.getByTestId('activity-edit-form')).toBeTruthy()
  })

  it('calls addActivity with correct date when form submitted', async () => {
    vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(mockFamilies)
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-activity-btn'))
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),  { target: { value: '09:00' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(itineraryUtils.addActivity).toHaveBeenCalledWith('trip1', expect.objectContaining({
      title: 'Hike',
      time: '09:00',
      date: '2027-04-05',
      createdBy: 'u1',
    }))
  })

  it('shows edit/delete buttons only for own activities', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    // a1 belongs to u1 — buttons visible
    expect(screen.getByTestId('edit-btn-a1')).toBeTruthy()
    // Switch to Day 2 to see a2 (belongs to u2)
    fireEvent.click(screen.getByTestId('day-tab-2027-04-06'))
    expect(screen.queryByTestId('edit-btn-a2')).toBeNull()
  })

  it('calls deleteActivity when delete button clicked', async () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    await act(async () => { fireEvent.click(screen.getByTestId('delete-btn-a1')) })
    expect(itineraryUtils.deleteActivity).toHaveBeenCalledWith('trip1', 'a1')
  })

  it('clicking edit opens form pre-filled with activity data', () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    expect(screen.getByTestId('form-title').value).toBe('Hike')
    expect(screen.getByTestId('form-time').value).toBe('09:00')
  })

  it('calls updateActivity when edit form saved', async () => {
    vi.spyOn(itineraryUtils, 'subscribeActivities').mockImplementation((_tripId, cb) => {
      cb(mockActivities)
      return vi.fn()
    })
    render(<ItineraryTab trip={mockTrip} user={mockUser} />)
    fireEvent.click(screen.getByTestId('edit-btn-a1'))
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike Updated' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(itineraryUtils.updateActivity).toHaveBeenCalledWith('trip1', 'a1', expect.objectContaining({
      title: 'Hike Updated',
    }))
  })
})
