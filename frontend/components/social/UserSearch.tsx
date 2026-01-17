'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface SearchResult {
  _id: string;
  username: string;
  email: string;
  avatarId: string;
  friendshipStatus: 'none' | 'pending' | 'friends' | 'blocked';
}

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError('');
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(res.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string, username: string) => {
    try {
      await api.post('/friends/request', { toUserId: userId });
      toast.success(`Friend request sent to ${username}`);
      // Update the result to show pending status
      setResults(prev => prev.map(r =>
        r._id === userId ? { ...r, friendshipStatus: 'pending' as const } : r
      ));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleBlock = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to block ${username}?`)) {
      return;
    }

    try {
      await api.post(`/friends/block/${userId}`);
      toast.success(`${username} has been blocked`);
      // Remove from search results
      setResults(prev => prev.filter(r => r._id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to block user');
    }
  };

  const getStatusButton = (user: SearchResult) => {
    switch (user.friendshipStatus) {
      case 'friends':
        return (
          <span className="text-sm text-emerald-400 font-medium">✓ Friends</span>
        );
      case 'pending':
        return (
          <span className="text-sm text-amber-400 font-medium">⏳ Pending</span>
        );
      case 'none':
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAddFriend(user._id, user.username)}
          >
            Add Friend
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Search Users</h3>
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          <p className="mt-2">Searching...</p>
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <div className="text-center py-8 text-slate-400">
          <p>No users found matching "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user._id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-violet-500/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user.username}</p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusButton(user)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleBlock(user._id, user.username)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Block
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
