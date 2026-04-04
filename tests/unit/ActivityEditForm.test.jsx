import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ActivityEditForm from '../../src/components/ActivityEditForm'

const mockFamilies = [
  { familyId: 'fA', name: 'Sharma family' },
  { familyId: 'fB', name: 'Johnson family' },
]

const mockActivity = {
  activityId: 'a1',
  title: 'Hike to waterfall',
  time: '09:00',
  location: 'Blue Ridge Trail',
  notes: 'Bring sunscreen',
  icon: '🥾',
  assignedTo: null,
}

describe('ActivityEditForm', () => {
  it('renders with data-testid activity-edit-form', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('activity-edit-form')).toBeTruthy()
  })

  it('save button is disabled when title is empty', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    const saveBtn = screen.getByTestId('form-save')
    expect(saveBtn.style.opacity).toBe('0.5')
  })

  it('save button enables when title and time are filled', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),  { target: { value: '09:00' } })
    expect(screen.getByTestId('form-save').style.opacity).toBe('1')
  })

  it('save button stays disabled when title is filled but time is empty', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    // time left empty
    expect(screen.getByTestId('form-save').style.opacity).toBe('0.5')
  })

  it('calls onClose after successful save', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={onSave} onDelete={vi.fn()} onClose={onClose} />)
    fireEvent.change(screen.getByTestId('form-title'), { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),  { target: { value: '09:00' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSave with correct fields when submitted', async () => {
    const onSave = vi.fn()
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('form-title'),    { target: { value: 'Hike' } })
    fireEvent.change(screen.getByTestId('form-time'),     { target: { value: '09:00' } })
    fireEvent.change(screen.getByTestId('form-location'), { target: { value: 'Trail' } })
    await act(async () => { fireEvent.click(screen.getByTestId('form-save')) })
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Hike',
      time: '09:00',
      location: 'Trail',
      icon: expect.any(String),
    }))
  })

  it('pre-fills fields when editing an existing activity', () => {
    render(<ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('form-title').value).toBe('Hike to waterfall')
    expect(screen.getByTestId('form-time').value).toBe('09:00')
    expect(screen.getByTestId('form-location').value).toBe('Blue Ridge Trail')
  })

  it('shows delete button only in edit mode', () => {
    const { rerender } = render(
      <ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.queryByTestId('form-delete')).toBeNull()

    rerender(
      <ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByTestId('form-delete')).toBeTruthy()
  })

  it('calls onDelete with activityId when delete clicked', async () => {
    const onDelete = vi.fn()
    render(<ActivityEditForm activity={mockActivity} families={mockFamilies} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />)
    await act(async () => { fireEvent.click(screen.getByTestId('form-delete')) })
    expect(onDelete).toHaveBeenCalledWith('a1')
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders icon picker buttons', () => {
    render(<ActivityEditForm activity={null} families={mockFamilies} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('icon-btn-🥾')).toBeTruthy()
    expect(screen.getByTestId('icon-btn-🚗')).toBeTruthy()
  })
})
