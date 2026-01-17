'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '@/utils/api';

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

interface FriendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (friendId: string) => void;
  minBalance: number;
  tableName: string;
}

// Status indicator component
const StatusIndicator = ({ status }: { status: Friend['status'] }) => {
  const config = {
    online: { color: 'bg-green-500', label: 'Online' },
    in_game: { color: 'bg-yellow-500', label: 'In Game' },
    offline: { color: 'bg-gray-500', label: 'Offline' }
  };

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color} animate-pulse`}></div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
};

export function FriendInviteModal({ isOpen, onClose, onInvite, minBalance, tableName }: FriendInviteModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualUserId, setManualUserId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await api.get('/friends');
      if (response.status === 200) {
        const data = response.data;
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInvite = (friendId: string) => {
    onInvite(friendId);
    onClose();
  };

  const handleManualInvite = () => {
    if (manualUserId.trim()) {
      onInvite(manualUserId.trim());
      setManualUserId('');
      onClose();
    }
  };

  // Check if friend can be invited
  const canInvite = (friend: Friend) => {
    return friend.status !== 'in_game' && friend.status !== 'offline';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-lg max-w-md w-full border border-slate-700 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Invite Friend</h3>
            <p className="text-sm text-slate-400">{tableName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {/* Manual Invite Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/50">
          <p className="text-sm text-slate-300 mb-2">Invite by User ID</p>
          <div className="flex gap-2">
            <Input
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              placeholder="Enter user ID..."
              className="flex-1"
            />
            <Button onClick={handleManualInvite} size="sm" disabled={!manualUserId.trim()}>
              Send
            </Button>
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search friends..."
              className="w-full"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-slate-400 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mx-auto mb-2"></div>
                Loading friends...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                {searchTerm ? 'No friends found' : 'No friends yet. Add friends to invite them!'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{friend.username}</p>
                        <StatusIndicator status={friend.status} />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(friend._id)}
                      disabled={!canInvite(friend)}
                      title={
                        friend.status === 'in_game'
                          ? 'Friend is currently in a game'
                          : friend.status === 'offline'
                            ? 'Friend is offline'
                            : 'Invite to game'
                      }
                    >
                      {friend.status === 'in_game' ? 'In Game' : 'Invite'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30">
          <p className="text-xs text-slate-400 text-center">
            Minimum balance required: ₹{minBalance}
          </p>
        </div>
      </div>
    </div>
  );
}
