import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BalanceSummary from '../../src/components/BalanceSummary'

const balances = [
  { familyId: 'fA', name: 'Sharma family', balance: 80 },
  { familyId: 'fB', name: 'Johnson family', balance: -40 },
  { familyId: 'fC', name: 'Patel family', balance: 0 },
]

describe('BalanceSummary', () => {
  it('renders one chip per family', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fA')).toBeTruthy()
    expect(screen.getByTestId('balance-chip-fB')).toBeTruthy()
    expect(screen.getByTestId('balance-chip-fC')).toBeTruthy()
  })

  it('shows family names', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByText('Sharma family')).toBeTruthy()
    expect(screen.getByText('Johnson family')).toBeTruthy()
    expect(screen.getByText('Patel family')).toBeTruthy()
  })

  it('shows + prefix for creditors', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fA').textContent).toContain('+')
  })

  it('shows − prefix for debtors', () => {
    render(<BalanceSummary balances={balances} currency="USD" />)
    expect(screen.getByTestId('balance-chip-fB').textContent).toContain('−')
  })

  it('renders nothing when balances is empty', () => {
    const { container } = render(<BalanceSummary balances={[]} currency="USD" />)
    expect(container.firstChild).toBeNull()
  })
})
