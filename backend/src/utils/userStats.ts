import Debt from '../models/Debt';

export const getDebtSummary = async (userId: string) => {
  const activeDebts = await Debt.find({
    borrower: userId,
    status: 'active'
  });

  const totalDebt = activeDebts.reduce((acc, debt) => acc + debt.amount, 0);

  return {
    activeCount: activeDebts.length,
    totalAmount: totalDebt
  };
};
