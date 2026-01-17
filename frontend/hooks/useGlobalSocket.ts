import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const useGlobalSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token, updateAvatar } = useAuthStore();

  useEffect(() => {
    if (!user || !token) return;

    // Connect to main namespace
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to global socket', newSocket.id);
      newSocket.emit('join_global', { userId: user.id });
    });

    // Listen for avatar changes
    newSocket.on('avatar_changed', (data: { userId: string; avatarId: string }) => {
      if (data.userId === user.id) {
        updateAvatar(data.avatarId);
      }
      window.dispatchEvent(new CustomEvent('friend_avatar_update', { detail: data }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, token]); // Reconnect if user changes

  return socket;
};
