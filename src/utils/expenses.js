export function computeBalances(expenses, families) {
  if (families.length === 0) return []
  const numFamilies = families.length
  const balanceMap = Object.fromEntries(families.map(f => [f.familyId, 0]))
  for (const expense of expenses) {
    const share = expense.amount / numFamilies
    if (expense.paidByFamilyId in balanceMap) {
      balanceMap[expense.paidByFamilyId] += expense.amount
    }
    for (const f of families) {
      balanceMap[f.familyId] -= share
    }
  }
  return families.map(f => ({
    familyId: f.familyId,
    name: f.name,
    balance: balanceMap[f.familyId],
  }))
}
