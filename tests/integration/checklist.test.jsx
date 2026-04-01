// tests/integration/checklist.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChecklistTab from '../../src/components/ChecklistTab'
import * as checklistUtils from '../../src/utils/checklist'
import * as firestoreUtils from '../../src/utils/firestore'

const trip = {
  tripId: 'trip1', tripType: 'Tent Camping',
  name: 'Rocky Mountains', destination: 'CO',
}
const user = { uid: 'u1', displayName: 'Girish' }

const families = [
  { familyId: 'fA', name: 'Sharma', memberIds: ['u1'] },
  { familyId: 'fB', name: 'Patel',  memberIds: ['u2'] },
]

const members = [
  { uid: 'u1', displayName: 'Girish', familyId: 'fA' },
  { uid: 'u2', displayName: 'Raj',    familyId: 'fB' },
]

const makeItem = (overrides = {}) => ({
  itemId: 'i1', name: 'Tent', category: 'Sleeping',
  mode: 'per-family', order: 0, isCustom: false,
  checks: {}, sharedCheck: null, ...overrides,
})

beforeEach(() => {
  vi.spyOn(firestoreUtils, 'getTripFamilies').mockResolvedValue(families)
  vi.spyOn(firestoreUtils, 'getTripMembers').mockResolvedValue(members)
  vi.spyOn(checklistUtils, 'initChecklistFromTemplate').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleCheck').mockResolvedValue()
  vi.spyOn(checklistUtils, 'toggleLock').mockResolvedValue()
  vi.spyOn(checklistUtils, 'setMode').mockResolvedValue()
  vi.spyOn(checklistUtils, 'addItem').mockResolvedValue()
})

describe('ChecklistTab integration', () => {
  it('renders checklist items from snapshot', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => expect(screen.getByText('Tent')).toBeTruthy())
  })

  it('calls toggleCheck when own family checkbox clicked', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('Tent'))

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(checklistUtils.toggleCheck).toHaveBeenCalledWith(
      'trip1', 'i1', 'per-family', 'fA', 'u1', 'Girish', false
    )
  })

  it('calls toggleLock when lock button clicked by owner', async () => {
    const checkedItem = makeItem({
      checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } },
    })
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([checkedItem])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('🔓'))

    fireEvent.click(screen.getByText('🔓'))
    expect(checklistUtils.toggleLock).toHaveBeenCalledWith(
      'trip1', 'i1', 'per-family', 'fA', false
    )
  })

  it('calls setMode when mode toggle clicked', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByTestId('mode-toggle'))

    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(checklistUtils.setMode).toHaveBeenCalledWith('trip1', 'i1', 'shared')
  })

  it('calls addItem when Add item form submitted', async () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return vi.fn()
    })
    render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('+ Add item'))

    fireEvent.click(screen.getByText('+ Add item'))
    const input = screen.getByPlaceholderText('Item name…')
    fireEvent.change(input, { target: { value: 'Hammock' } })
    fireEvent.click(screen.getByText('Add'))
    expect(checklistUtils.addItem).toHaveBeenCalledWith('Sleeping', 'Hammock')
  })

  it('shows loading state before snapshot fires', () => {
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation(() => vi.fn()) // never fires
    render(<ChecklistTab trip={trip} user={user} />)
    expect(screen.getByText(/Loading checklist/)).toBeTruthy()
  })

  it('unsubscribes from onSnapshot on unmount', async () => {
    const unsub = vi.fn()
    vi.spyOn(checklistUtils, 'subscribeChecklist').mockImplementation((_, cb) => {
      cb([makeItem()])
      return unsub
    })
    const { unmount } = render(<ChecklistTab trip={trip} user={user} />)
    await waitFor(() => screen.getByText('Tent'))
    unmount()
    expect(unsub).toHaveBeenCalled()
  })
})
