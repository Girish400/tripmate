import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChecklistItemRow from '../../src/components/ChecklistItemRow'

const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]
const currentUser = { uid: 'u1', displayName: 'Girish' }
const currentFamilyId = 'fA'

const wrap = (itemOverrides = {}, propOverrides = {}) => {
  const props = {
    item: {
      itemId: 'i1', name: 'Tent', category: 'Sleeping',
      mode: 'per-family', checks: {}, sharedCheck: null,
      ...itemOverrides,
    },
    families,
    currentUser,
    currentFamilyId,
    onToggleCheck: vi.fn(),
    onToggleLock: vi.fn(),
    onSetMode: vi.fn(),
    ...propOverrides,
  }
  return render(<table><tbody><ChecklistItemRow {...props} /></tbody></table>)
}

describe('ChecklistItemRow', () => {
  it('renders item name', () => {
    wrap()
    expect(screen.getByText('Tent')).toBeTruthy()
  })

  it('own family checkbox enabled, other family disabled', () => {
    wrap()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(false)   // fA = currentFamily
    expect(checkboxes[1].disabled).toBe(true)    // fB = other family
  })

  it('shows unlock icon + name after checking', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } } })
    expect(screen.getByText('🔓')).toBeTruthy()
    expect(screen.getByText('Girish')).toBeTruthy()
  })

  it('shows lock icon when item is locked', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: new Date() } } })
    expect(screen.getByText('🔒')).toBeTruthy()
  })

  it('disables checkbox when locked by a different user', () => {
    wrap({ checks: { fA: { checkedBy: 'u999', displayName: 'Other', lockedAt: new Date() } } })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(true)
  })

  it('NA mode renders strikethrough and dashes in family cells', () => {
    wrap({ mode: 'na' })
    expect(screen.getByTestId('item-name-na')).toBeTruthy()
    const dashes = screen.getAllByText('──')
    expect(dashes.length).toBe(families.length)
  })

  it('shared mode renders single checkbox, no per-family columns', () => {
    wrap({ mode: 'shared' })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(1)
  })

  it('calls onToggleCheck when own family checkbox clicked', () => {
    const onToggleCheck = vi.fn()
    wrap({}, { onToggleCheck })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggleCheck).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'fA',
      false
    )
  })

  it('calls onSetMode with next mode when mode button clicked', () => {
    const onSetMode = vi.fn()
    wrap({}, { onSetMode })
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(onSetMode).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'shared'
    )
  })

  it('calls onToggleLock when lock button clicked by owner', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: { checkedBy: 'u1', displayName: 'Girish', lockedAt: null } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByText('🔓'))
    expect(onToggleLock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }),
      'fA',
      false
    )
  })
})
