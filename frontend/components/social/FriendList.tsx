'use client';

import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import Image from 'next/image';
import { getAvatarAsset } from '@/utils/assets';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import ChatWindow from './ChatWindow';
import FriendProfile from './FriendProfile';

interface Friend {
  _id: string;
  username: string;
  email: string;
  avatarId?: string;
  status?: string; // 'online' | 'offline' | 'in_game'
}

export default function FriendList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Friend | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Initialize global socket connection
  const socket = useGlobalSocket();

  useEffect(() => {
    // Fetch current user ID (decode token or from api profile)
    // For now, let's fetch profile to get ID
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setCurrentUserId(res.data._id);
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();

    const fetchFriends = async () => {
      try {
        const res = await api.get('/friends');
        setFriends(res.data.friends || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();

    // Listen for avatar updates from useGlobalSocket
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; avatarId: string }>;
      const { userId, avatarId } = customEvent.detail;

      setFriends(prev => prev.map(friend =>
        friend._id === userId
          ? { ...friend, avatarId }
          : friend
      ));
    };

    window.addEventListener('friend_avatar_update', handleAvatarUpdate);

    // Listen for status updates directly from socket
    if (socket) {
      socket.on('friend_status_update', (data: { userId: string; status: string }) => {
        setFriends(prev => prev.map(friend =>
          friend._id === data.userId
            ? { ...friend, status: data.status }
            : friend
        ));
      });
    }

    return () => {
      window.removeEventListener('friend_avatar_update', handleAvatarUpdate);
      if (socket) {
        socket.off('friend_status_update');
      }
    };
  }, [socket]);

  const handleInvite = (friendId: string) => {
    if (!socket) return;
    // Default table settings for quick invite
    // In a real app, maybe open a modal to choose settings
    socket.emit('send_game_invite', {
      friendId,
      tableId: 'table_' + Date.now(), // Auto-generate or reuse logic?
      // Actually, inviting usually implies "Come join MY table".
      // If not in game, maybe create one?
      // For simplicity/MVP: Mock table ID or assume user is in one?
      // Requirement: "Invite includes Table ID".
      // If user is not in a game, maybe we can't invite?
      // Or we create a private room.
      betAmount: 100
    });
    alert('Invite sent!');
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading friends...</div>;

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-800/50 rounded-lg">
        <p className="text-slate-400 text-sm">No friends yet. Add someone!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {friends.map((friend) => (
          <Card key={friend._id} className="p-4 flex flex-col gap-3 bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-700 border border-slate-600 cursor-pointer"
                  onClick={() => setViewingProfile(friend)}>
                  <Image
                    src={getAvatarAsset(friend.avatarId || 'avatar_1')}
                    alt={friend.username}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm cursor-pointer hover:underline"
                    onClick={() => setViewingProfile(friend)}>{friend.username}</h4>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full self-center ${friend.status === 'online' ? 'bg-emerald-500' :
                      friend.status === 'in_game' ? 'bg-yellow-500' : 'bg-slate-500'
                      }`}></span>
                    {friend.status === 'in_game' ? 'In Game' :
                      friend.status === 'online' ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                disabled={!currentUserId}
                onClick={() => setActiveChat(friend)}
              >
                Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setViewingProfile(friend)}
              >
                Stats
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs"
                disabled={friend.status === 'offline'}
                onClick={() => handleInvite(friend._id)}
              >
                Invite
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {activeChat && (
        <ChatWindow
          friendId={activeChat._id}
          friendName={activeChat.username}
          currentUserId={currentUserId}
          onClose={() => setActiveChat(null)}
          onViewProfile={() => setViewingProfile(activeChat)}
        />
      )}

      {viewingProfile && (
        <FriendProfile
          friendId={viewingProfile._id}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </>
  );
}
