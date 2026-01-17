import { useState } from 'react';
import { useAuthStore } from './useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const useAvatar = () => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, login } = useAuthStore();

  const updateAvatar = async (avatarId: string) => {
    try {
      setUpdating(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/settings/avatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      const data = await response.json();

      // Update user in auth store
      if (user && token) {
        login({
          _id: user.id,
          username: user.username,
          email: user.email,
          walletBalance: user.walletBalance,
          avatarId: data.avatarId,
          createdAt: user.createdAt || new Date().toISOString(),
          token
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar');
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    currentAvatar: user?.avatarId || 'avatar_1',
    updating,
    error,
    updateAvatar,
  };
};
