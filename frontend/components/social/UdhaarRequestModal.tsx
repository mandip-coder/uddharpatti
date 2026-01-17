'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface UdhaarRequestModalProps {
  friendId: string;
  friendName: string;
  friendBalance?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UdhaarRequestModal({
  friendId,
  friendName,
  friendBalance,
  onClose,
  onSuccess
}: UdhaarRequestModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; general?: string }>({});

  const validateAmount = (value: string): boolean => {
    const num = parseFloat(value);

    if (isNaN(num) || num <= 0) {
      setErrors({ amount: 'Amount must be greater than 0' });
      return false;
    }

    if (num > 1000) {
      setErrors({ amount: 'Maximum Udhaar amount is ₹1000' });
      return false;
    }

    if (friendBalance !== undefined && num > friendBalance) {
      setErrors({ amount: `Friend only has ₹${friendBalance} available` });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);

    if (value) {
      validateAmount(value);
    } else {
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAmount(amount)) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await api.post('/debt/request', {
        lenderId: friendId,
        amount: parseFloat(amount),
        interestRate,
        message: message.trim()
      });

      toast.success('Udhaar request sent successfully!');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send request';
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateRepayment = () => {
    const amt = parseFloat(amount) || 0;
    const interest = (amt * interestRate) / 100;
    return amt + interest;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-violet-500/30 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Request Udhaar</h2>
              <p className="text-sm text-slate-400 mt-1">
                Borrow from <span className="text-violet-400 font-medium">{friendName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter amount (1-1000)"
                min="1"
                max="1000"
                step="10"
                className={`w-full px-4 py-3 bg-slate-800 border ${errors.amount ? 'border-red-500' : 'border-slate-700'
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                disabled={loading}
                required
              />
              {errors.amount && (
                <p className="text-red-400 text-xs mt-1">{errors.amount}</p>
              )}
              {friendBalance !== undefined && !errors.amount && (
                <p className="text-slate-500 text-xs mt-1">
                  Friend's balance: ₹{friendBalance}
                </p>
              )}
            </div>

            {/* Interest Rate Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Interest Rate
                </label>
                <span className="text-violet-400 font-bold text-lg">
                  {interestRate}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>5%</span>
                <span>10%</span>
              </div>
            </div>

            {/* Repayment Calculation */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">You will repay:</span>
                  <span className="text-lg font-bold text-emerald-400">
                    ₹{calculateRepayment().toFixed(2)}
                  </span>
                </div>
                {interestRate > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    (Principal: ₹{amount} + Interest: ₹{((parseFloat(amount) * interestRate) / 100).toFixed(2)})
                  </p>
                )}
              </div>
            )}

            {/* Optional Message */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note for your friend..."
                rows={3}
                maxLength={200}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">
                {message.length}/200
              </p>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !amount || !!errors.amount}
                className="flex-1"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>

          {/* Info Note */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Note:</strong> Your total debt limit is ₹1000. Udhaar requests are subject to your friend's approval.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
