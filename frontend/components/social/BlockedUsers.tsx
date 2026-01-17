'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface BlockedUser {
  _id: string;
  username: string;
  email: string;
  avatarId: string;
}

export default function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const res = await api.get('/friends/blocked');
      setBlockedUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to unblock ${username}?`)) {
      return;
    }

    try {
      await api.post(`/friends/unblock/${userId}`);
      toast.success(`${username} has been unblocked`);
      setBlockedUsers(prev => prev.filter(user => user._id !== userId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No blocked users</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Blocked Users</h3>
      <div className="space-y-2">
        {blockedUsers.map((user) => (
          <div
            key={user._id}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-rose-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium">{user.username}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleUnblock(user._id, user.username)}
            >
              Unblock
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
