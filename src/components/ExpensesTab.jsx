import { useEffect, useState } from 'react'
import {
  subscribeExpenses, addExpense, updateExpense, deleteExpense,
  subscribeExpenseLabels, addExpenseLabel, computeBalances,
} from '../utils/expenses'
import { getTripFamilies } from '../utils/firestore'
import BalanceSummary from './BalanceSummary'
import ExpenseList from './ExpenseList'
import ExpenseEditForm from './ExpenseEditForm'

export default function ExpensesTab({ trip, user }) {
  const [expenses,       setExpenses]       = useState([])
  const [labels,         setLabels]         = useState([])
  const [families,       setFamilies]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [editingExpense, setEditingExpense] = useState(null)

  useEffect(() => {
    const unsub1 = subscribeExpenses(trip.tripId, items => {
      setExpenses(items)
      setLoading(false)
    })
    const unsub2 = subscribeExpenseLabels(trip.tripId, setLabels)
    getTripFamilies(trip.tripId).then(setFamilies)
    return () => { unsub1(); unsub2() }
  }, [trip.tripId])

  async function handleSave(data) {
    if (editingExpense?.expenseId) {
      await updateExpense(trip.tripId, editingExpense.expenseId, data)
    } else {
      await addExpense(trip.tripId, { ...data, createdBy: user.uid })
    }
    setEditingExpense(null)
  }

  async function handleDelete(expenseId) {
    await deleteExpense(trip.tripId, expenseId)
    setEditingExpense(null)
  }

  async function handleAddLabel(name) {
    await addExpenseLabel(trip.tripId, name, user.uid)
  }

  const balances = computeBalances(expenses, families)
  const currency = trip.currency ?? 'USD'

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>
        Loading expenses…
      </div>
    )
  }

  return (
    <div data-testid="expenses-tab">
      <BalanceSummary balances={balances} currency={currency} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          data-testid="add-expense-btn"
          onClick={() => setEditingExpense({})}
          style={{
            background: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.4)',
            borderRadius: 8, padding: '7px 14px', color: '#6ed48a',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add Expense
        </button>
      </div>

      <ExpenseList
        expenses={expenses}
        user={user}
        currency={currency}
        onEdit={exp => setEditingExpense(exp)}
        onDelete={handleDelete}
      />

      {editingExpense !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setEditingExpense(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ExpenseEditForm
              expense={editingExpense?.expenseId ? editingExpense : null}
              families={families}
              labels={labels}
              user={user}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setEditingExpense(null)}
              onAddLabel={handleAddLabel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
