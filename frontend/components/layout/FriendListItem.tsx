"use client";

import React from 'react';
import { useSocket } from '@/hooks/useSocket';

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

interface FriendListItemProps {
  friend: Friend;
}

export const FriendListItem: React.FC<FriendListItemProps> = ({ friend }) => {
  const { sendInvite } = useSocket();

  const statusConfig = {
    online: {
      color: 'bg-emerald-500',
      text: 'Online',
      textColor: 'text-emerald-400'
    },
    in_game: {
      color: 'bg-amber-500',
      text: 'In Game',
      textColor: 'text-amber-400'
    },
    offline: {
      color: 'bg-slate-500',
      text: 'Offline',
      textColor: 'text-slate-500'
    }
  };

  // Safe config lookup with fallback to offline
  const config = statusConfig[friend.status] || statusConfig.offline;

  const handleInvite = () => {
    if (friend.status === 'online') {
      sendInvite(friend._id);
    }
  };

  return (
    <div className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={`/assets/avatars/${friend.avatarId}.png`}
            alt={friend.username}
            className="w-8 h-8 rounded-full object-cover bg-slate-700"
            onError={(e) => {
              // Fallback to default avatar if image fails to load
              e.currentTarget.src = '/assets/avatars/avatar_1.png';
            }}
          />
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${config.color} border-2 border-slate-900 rounded-full`}></div>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-200">{friend.username}</div>
          <div className={`text-xs ${config.textColor}`}>{config.text}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {friend.status === 'online' && (
          <button
            onClick={handleInvite}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded transition-colors"
            title="Invite to game"
          >
            Invite
          </button>
        )}
        {friend.status === 'in_game' && (
          <span className="text-xs text-amber-400 px-2 py-1">
            Playing
          </span>
        )}
      </div>
    </div>
  );
};
