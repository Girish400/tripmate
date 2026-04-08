import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChecklistItemRow from '../../src/components/ChecklistItemRow'

// ── Fixtures ───────────────────────────────────────────────────────────────────
const families = [
  { familyId: 'fA', name: 'Sharma' },
  { familyId: 'fB', name: 'Patel' },
]
const currentUser    = { uid: 'u1', displayName: 'Alice Smith' }
const currentFamilyId = 'fA'

const defaultItem = {
  itemId: 'i1', name: 'Tent', category: 'Sleeping',
  mode: 'per-family', checks: {}, sharedCheck: null,
  modeOwnerUid: null, modeOwnerName: null,
}

const wrap = (itemOverrides = {}, propOverrides = {}) => {
  const props = {
    item: { ...defaultItem, ...itemOverrides },
    families,
    currentUser,
    currentFamilyId,
    onToggleCheck: vi.fn(),
    onToggleLock:  vi.fn(),
    onSetMode:     vi.fn(),
    ...propOverrides,
  }
  return render(<table><tbody><ChecklistItemRow {...props} /></tbody></table>)
}

// ── 1. Item-level lock button removed ─────────────────────────────────────────
describe('Item-level lock button (must be removed)', () => {
  it('does NOT render a lock/unlock emoji prefix before the item name', () => {
    wrap()
    // There should be no button in the item-name cell
    // The item name cell should contain only the text "Tent" with no sibling button
    const nameCell = screen.getByText('Tent').closest('td')
    const buttons = nameCell ? nameCell.querySelectorAll('button') : []
    expect(buttons.length).toBe(0)
  })
})

// ── 2. Per-family column gating ────────────────────────────────────────────────
describe('Per-family: column gating', () => {
  it('own family checkbox is enabled when item unchecked', () => {
    wrap()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(false)   // fA = currentFamily
  })

  it('other family checkbox is always disabled', () => {
    wrap()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[1].disabled).toBe(true)    // fB
  })

  it('calls onToggleCheck with correct args when own unchecked checkbox clicked', () => {
    const onToggleCheck = vi.fn()
    wrap({}, { onToggleCheck })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggleCheck).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'fA', false
    )
  })
})

// ── 3. Uncheck ownership (only checker can uncheck) ───────────────────────────
describe('Per-family: uncheck ownership', () => {
  it('own-checked item is enabled for the checker', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null } } })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(false)
  })

  it('own-checked item is DISABLED for a different family member (not the checker)', () => {
    // u2 checked fA's item — Alice (u1) is in fA but did not check
    wrap(
      { checks: { fA: { checkedBy: 'u2', displayName: 'Bob Smith', lockedAt: null, lockedBy: null, lockedByName: null } } },
    )
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(true)
  })
})

// ── 4. Check-level lock: only locker can unlock ───────────────────────────────
describe('Per-family: check-level lock / unlock', () => {
  it('checker can lock their own check (lock button enabled)', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null } } })
    const lockBtn = screen.getByTestId('check-lock-btn')
    expect(lockBtn.disabled).toBe(false)
  })

  it('non-checker cannot lock (lock button disabled)', () => {
    wrap({ checks: { fA: { checkedBy: 'u2', displayName: 'Bob Smith', lockedAt: null, lockedBy: null, lockedByName: null } } })
    const lockBtn = screen.getByTestId('check-lock-btn')
    expect(lockBtn.disabled).toBe(true)
  })

  it('locker can unlock (lock button enabled for lockedBy user)', () => {
    wrap({ checks: { fA: {
      checkedBy: 'u2', displayName: 'Bob Smith',
      lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Alice Smith',
    } } })
    const lockBtn = screen.getByTestId('check-lock-btn')
    expect(lockBtn.disabled).toBe(false)
  })

  it('non-locker cannot unlock (lock button disabled)', () => {
    // u2 locked — Alice (u1) cannot unlock
    wrap({ checks: { fA: {
      checkedBy: 'u1', displayName: 'Alice Smith',
      lockedAt: new Date(), lockedBy: 'u2', lockedByName: 'Bob Smith',
    } } })
    const lockBtn = screen.getByTestId('check-lock-btn')
    expect(lockBtn.disabled).toBe(true)
  })

  it('locked check disables the checkbox for everyone', () => {
    wrap({ checks: { fA: {
      checkedBy: 'u1', displayName: 'Alice Smith',
      lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Alice Smith',
    } } })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].disabled).toBe(true)
  })

  it('calls onToggleLock with correct args when checker locks', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByTestId('check-lock-btn'))
    expect(onToggleLock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'fA', false
    )
  })

  it('calls onToggleLock with correct args when locker unlocks', () => {
    const onToggleLock = vi.fn()
    wrap(
      { checks: { fA: {
        checkedBy: 'u2', displayName: 'Bob Smith',
        lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Alice Smith',
      } } },
      { onToggleLock }
    )
    fireEvent.click(screen.getByTestId('check-lock-btn'))
    expect(onToggleLock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'fA', true
    )
  })
})

// ── 5. NA mode ─────────────────────────────────────────────────────────────────
describe('NA mode', () => {
  it('renders strikethrough item name', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    expect(screen.getByTestId('item-name-na')).toBeTruthy()
  })

  it('shows modeOwnerName on the NA row (full name, not dashes)', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    expect(screen.getByText('Bob Smith')).toBeTruthy()
  })

  it('spans all family columns in a single cell (no per-family dashes per column)', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    // Should NOT have two separate "──" cells, one per family
    const dashes = screen.queryAllByText('──')
    expect(dashes.length).toBe(0)
  })

  it('mode button disabled when current user is NOT the NA owner', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(true)
  })

  it('mode button enabled when current user IS the NA owner', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(false)
  })

  it('mode button shows "NA · Bob Smith 🔀" when owned by Bob', () => {
    wrap({ mode: 'na', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    expect(screen.getByTestId('mode-toggle').textContent).toBe('NA · Bob Smith 🔀')
  })
})

// ── 6. SHARED mode ─────────────────────────────────────────────────────────────
describe('SHARED mode', () => {
  it('renders single checkbox spanning all family columns', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith' })
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(1)
  })

  it('shared checkbox enabled for mode owner when unchecked', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith' })
    const [cb] = screen.getAllByRole('checkbox')
    expect(cb.disabled).toBe(false)
  })

  it('shared checkbox disabled for non-owner (different uid)', () => {
    // currentUser is u1, but modeOwner is u2
    wrap({ mode: 'shared', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    const [cb] = screen.getAllByRole('checkbox')
    expect(cb.disabled).toBe(true)
  })

  it('owner can lock their shared check (lock button enabled)', () => {
    wrap({
      mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith',
      sharedCheck: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null },
    })
    expect(screen.getByTestId('check-lock-btn').disabled).toBe(false)
  })

  it('non-owner cannot lock the shared check (lock button disabled)', () => {
    // modeOwner is u2, but sharedCheck was checked by u1 (current user) — but since mode is owned by u2, u1 cannot interact
    wrap({
      mode: 'shared', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith',
      sharedCheck: { checkedBy: 'u2', displayName: 'Bob Smith', lockedAt: null, lockedBy: null, lockedByName: null },
    })
    // lock button should not exist or be disabled
    const lockBtn = screen.queryByTestId('check-lock-btn')
    if (lockBtn) expect(lockBtn.disabled).toBe(true)
    else expect(lockBtn).toBeNull()  // hidden entirely is also acceptable
  })

  it('shared locker can unlock (lockedBy === currentUser)', () => {
    wrap({
      mode: 'shared', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith',
      sharedCheck: {
        checkedBy: 'u2', displayName: 'Bob Smith',
        lockedAt: new Date(), lockedBy: 'u1', lockedByName: 'Alice Smith',
      },
    })
    const lockBtn = screen.getByTestId('check-lock-btn')
    expect(lockBtn.disabled).toBe(false)
  })

  it('mode button shows "SHARED · Alice Smith 🔀" when owned by Alice', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith' })
    expect(screen.getByTestId('mode-toggle').textContent).toBe('SHARED · Alice Smith 🔀')
  })

  it('mode button disabled for non-owner on shared mode', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u2', modeOwnerName: 'Bob Smith' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(true)
  })

  it('mode button enabled for owner on shared mode', () => {
    wrap({ mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith' })
    expect(screen.getByTestId('mode-toggle').disabled).toBe(false)
  })
})

// ── 7. Per-family mode button ──────────────────────────────────────────────────
describe('Per-family: mode toggle', () => {
  it('mode button shows "↔ 🔀" label', () => {
    wrap()
    expect(screen.getByTestId('mode-toggle').textContent).toBe('↔ 🔀')
  })

  it('mode button is enabled in per-family mode (no owner)', () => {
    wrap()
    expect(screen.getByTestId('mode-toggle').disabled).toBe(false)
  })

  it('calls onSetMode with "shared" when clicked', () => {
    const onSetMode = vi.fn()
    wrap({}, { onSetMode })
    fireEvent.click(screen.getByTestId('mode-toggle'))
    expect(onSetMode).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'i1' }), 'shared'
    )
  })
})

// ── 8. Display names shown next to checkboxes ─────────────────────────────────
describe('Display names', () => {
  it('shows full name next to checked per-family checkbox', () => {
    wrap({ checks: { fA: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null } } })
    expect(screen.getByText('Alice Smith')).toBeTruthy()
  })

  it('shows full name next to checked shared checkbox', () => {
    wrap({
      mode: 'shared', modeOwnerUid: 'u1', modeOwnerName: 'Alice Smith',
      sharedCheck: { checkedBy: 'u1', displayName: 'Alice Smith', lockedAt: null, lockedBy: null, lockedByName: null },
    })
    expect(screen.getByText('Alice Smith')).toBeTruthy()
  })
})
