'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import toast from 'react-hot-toast';

export default function AddFriend() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      await api.post('/friends/request', { recipientUsername: query });
      toast.success('Friend request sent!');
      setQuery('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 bg-slate-800/30">
      <h3 className="text-lg font-bold text-white mb-4">Add New Friend</h3>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="Enter username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-slate-900 border-slate-700"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Sending...' : 'Add'}
        </Button>
      </form>
    </Card>
  );
}
