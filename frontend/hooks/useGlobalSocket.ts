import { useSocketContext } from '../context/SocketContext';
import { useAuthStore } from './useAuthStore';
import { useEffect } from 'react';

export const useGlobalSocket = () => {
  const { socket } = useSocketContext();
  const { user, updateAvatar } = useAuthStore();

  useEffect(() => {
    if (!socket || !user) return;

    // Listen for avatar changes
    socket.on('avatar_changed', (data: { userId: string; avatarId: string }) => {
      if (data.userId === user.id) {
        updateAvatar(data.avatarId);
      }
      window.dispatchEvent(new CustomEvent('friend_avatar_update', { detail: data }));
    });

    // Handle friend status updates
    socket.on('friend_status_update', (data: { userId: string; status: string }) => {
      console.log(`[GLOBAL] Friend ${data.userId} is now ${data.status}`);
      window.dispatchEvent(new CustomEvent('friend_status_update', { detail: data }));
    });

    return () => {
      socket.off('avatar_changed');
      socket.off('friend_status_update');
    };
  }, [socket, user?.id]);

  return socket;
};
