'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface Friend {
  _id: string;
  username: string;
}

export default function RequestDebt() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [lenderId, setLenderId] = useState('');
  const [amount, setAmount] = useState('');
  const [interest, setInterest] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/friends')
      .then(res => {
        // Handle wrapped response { friends: [] }
        const data = res.data.friends ? res.data.friends : res.data;
        setFriends(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderId) return toast.error('Select a friend to borrow from');
    if (Number(amount) <= 0) return toast.error('Enter valid amount');

    setLoading(true);
    try {
      await api.post('/debt/request', {
        lenderId,
        amount: Number(amount),
        interestRate: Number(interest)
      });
      toast.success('Request sent successfully!');
      setAmount('');
      setInterest('0');
      // Trigger refresh of list? Ideally via context or query refetch, simplistic for now
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <h3 className="text-lg font-bold text-white mb-4">Request Udhaar</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">From Friend</label>
          <select
            className="input-field"
            value={lenderId}
            onChange={(e) => setLenderId(e.target.value)}
          >
            <option value="">Select Friend...</option>
            {friends.map(f => (
              <option key={f._id} value={f._id}>{f.username}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount (Coins)"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="100"
            min="1"
          />
          <Input
            label="Interest (%)"
            type="number"
            value={interest}
            onChange={e => setInterest(e.target.value)}
            placeholder="0-10"
            min="0"
            max="10"
          />
        </div>

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Sending Request...' : 'Send Request'}
        </Button>
      </form>
    </Card>
  );
}
