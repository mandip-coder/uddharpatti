"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/hooks/useAuthStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  connectError: null,
});

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { user, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        // NEW: Emit logout before disconnect (FIX: Auto-Start Bug)
        const userId = user?.id;
        if (userId) {
          console.log('[SOCKET_PROVIDER] Emitting logout for user:', userId);
          socketRef.current.emit('user_logout', { userId });
        }

        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setIsReconnecting(false);
      }
      return;
    }

    if (socketRef.current && socketRef.current.connected) return;

    console.log('[SOCKET_PROVIDER] Initializing single connection...');

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SOCKET_PROVIDER] Connected:', newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectError(null);
      newSocket.emit('join_global', { userId: user.id });
    });

    newSocket.on('disconnect', () => {
      console.log('[SOCKET_PROVIDER] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    newSocket.on('connect_error', (err) => {
      setConnectError(err.message);
      setIsReconnecting(false);
    });

    // MANDATORY GLOBAL DEBUG LISTENER
    newSocket.onAny((event, payload) => {
      console.log(`%c[SOCKET_RECV] ${event}`, 'color: #10b981; font-weight: bold', payload);
    });

    return () => {
      console.log('[SOCKET_PROVIDER] Cleaning up connection...');
      if (newSocket) newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsReconnecting(false);
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting, connectError }}>
      {children}
    </SocketContext.Provider>
  );
};
