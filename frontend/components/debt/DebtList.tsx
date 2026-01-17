'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import toast from 'react-hot-toast';

interface Debt {
  _id: string;
  lender: { _id: string; username: string };
  borrower: { _id: string; username: string };
  amount: number;
  interestRate: number;
  status: 'pending' | 'active' | 'repaid' | 'rejected';
  createdAt: string;
}

export default function DebtList() {
  const { user } = useAuthStore();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebts = useCallback(async () => {
    try {
      const res = await api.get('/debt/my-debts');
      setDebts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchDebts();
  }, [user, fetchDebts]);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/debt/approve/${id}`);
      toast.success('Loan Approved!');
      fetchDebts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Approval failed');
    }
  };

  const handleRepay = async (id: string) => {
    try {
      await api.post(`/debt/repay/${id}`);
      toast.success('Debt Repaid!');
      fetchDebts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Repayment failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  const iOwe = debts.filter(d => d.borrower._id === user?.id && d.status !== 'repaid');
  const owedToMe = debts.filter(d => d.lender._id === user?.id && d.status !== 'repaid');

  return (
    <div className="space-y-6">
      {/* Money I Owe */}
      <div>
        <h3 className="text-lg font-bold text-rose-400 mb-3">Money I Owe (Udhaar)</h3>
        {iOwe.length === 0 ? (
          <p className="text-slate-500 text-sm">You are debt free!</p>
        ) : (
          <div className="space-y-3">
            {iOwe.map(debt => (
              <Card key={debt._id} className="p-4 bg-rose-900/10 border-rose-500/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs text-rose-300">Lender</span>
                    <div className="text-white font-bold">{debt.lender.username}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-rose-300">Amount</span>
                    <div className="text-xl font-bold text-white">₹{debt.amount}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                  <span>Interest: {debt.interestRate}%</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-800">{debt.status}</span>
                </div>
                {debt.status === 'active' && (
                  <Button onClick={() => handleRepay(debt._id)} size="sm" fullWidth className="bg-rose-600 hover:bg-rose-700">
                    Repay Now
                  </Button>
                )}
                {debt.status === 'pending' && (
                  <p className="text-xs text-center text-yellow-500">Waiting for approval...</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Money Owed To Me */}
      <div>
        <h3 className="text-lg font-bold text-emerald-400 mb-3">Money Owed To Me</h3>
        {owedToMe.length === 0 ? (
          <p className="text-slate-500 text-sm">No active loans given.</p>
        ) : (
          <div className="space-y-3">
            {owedToMe.map(debt => (
              <Card key={debt._id} className="p-4 bg-emerald-900/10 border-emerald-500/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs text-emerald-300">Borrower</span>
                    <div className="text-white font-bold">{debt.borrower.username}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-300">Amount</span>
                    <div className="text-xl font-bold text-white">₹{debt.amount}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                  <span>Interest: {debt.interestRate}%</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-800">{debt.status}</span>
                </div>
                {debt.status === 'pending' && (
                  <Button onClick={() => handleApprove(debt._id)} size="sm" fullWidth className="bg-emerald-600 hover:bg-emerald-700">
                    Approve Loan
                  </Button>
                )}
                {debt.status === 'active' && (
                  <p className="text-xs text-center text-emerald-500">Loan Active</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
