'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface FriendRequest {
  _id: string;
  from: {
    _id: string;
    username: string;
    email: string;
  };
  status: string;
}

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/friends/requests');
        setRequests(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.post(`/friends/${action}/${requestId}`);
      toast.success(action === 'accept' ? 'Friend Added!' : 'Request Ignored');
      setRequests(current => current.filter(req => req._id !== requestId));
    } catch {
      toast.error('Action failed');
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Requests</h3>
      {requests.map((request) => (
        <div key={request._id} className="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{request.from.username}</span>
            <span className="text-xs text-indigo-300">wants to be friends</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleAction(request._id, 'accept')}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleAction(request._id, 'reject')} className="text-rose-400 hover:text-rose-300">
              Ignore
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
