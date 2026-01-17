import { useState, useEffect } from 'react';
import { useAuthStore } from './useAuthStore';
import { useGlobalSocket } from './useGlobalSocket';

interface Friend {
  _id: string;
  username: string;
  avatarId: string;
  status: 'online' | 'in_game' | 'offline';
  gameInfo?: {
    roomId: string;
    gameState: string;
  };
}

interface UseFriendsReturn {
  friends: Friend[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFriends = (): UseFriendsReturn => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const socket = useGlobalSocket();

  const fetchFriends = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch friends: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useFriends] Fetched friends:', data.friends);
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch friends on mount
  useEffect(() => {
    fetchFriends();
  }, [token]);

  // Listen for real-time status updates
  useEffect(() => {
    if (!socket) return;

    // Friend comes online/offline
    const handleFriendStatusUpdate = (data: { userId: string; status: 'online' | 'offline'; username: string }) => {
      console.log('Friend status update:', data);
      setFriends(prev => prev.map(friend =>
        friend._id === data.userId
          ? { ...friend, status: data.status, gameInfo: undefined }
          : friend
      ));
    };

    // Friend joins/leaves game
    const handleFriendGameStatusUpdate = (data: { userId: string; status: 'in_game' | 'online'; gameInfo?: { roomId: string; gameState: string } }) => {
      console.log('Friend game status update:', data);
      setFriends(prev => prev.map(friend =>
        friend._id === data.userId
          ? { ...friend, status: data.status, gameInfo: data.gameInfo }
          : friend
      ));
    };

    // Friend request accepted - refresh list
    const handleFriendRequestAccepted = () => {
      console.log('Friend request accepted, refreshing list');
      fetchFriends();
    };

    socket.on('friend_status_update', handleFriendStatusUpdate);
    socket.on('friend_game_status_update', handleFriendGameStatusUpdate);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
      socket.off('friend_status_update', handleFriendStatusUpdate);
      socket.off('friend_game_status_update', handleFriendGameStatusUpdate);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
    };
  }, [socket]);

  return {
    friends,
    isLoading,
    error,
    refetch: fetchFriends
  };
};
