'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import api from '@/utils/api';

interface Message {
  _id: string;
  sender: string;
  content: string;
  createdAt: string;
  type?: 'TEXT' | 'SYSTEM' | 'GAME_INVITE' | 'IMAGE';
  metadata?: {
    inviteTableId?: string;
    inviteBetAmount?: number;
    systemEventType?: string;
  };
  reactions?: Record<string, string>;
  status?: 'SENT' | 'DELIVERED' | 'SEEN';
}

interface ChatWindowProps {
  friendId: string;
  friendName: string;
  currentUserId: string;
  onClose: () => void;
  onViewProfile: () => void;
}

export default function ChatWindow({ friendId, friendName, currentUserId, onClose, onViewProfile }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const socket = useGlobalSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sort IDs to match backend room convention
  const ids = [currentUserId, friendId].sort();
  const roomId = `chat_${ids[0]}_${ids[1]}`;

  useEffect(() => {
    // Join room
    socket?.emit('join_private_chat', { friendId });

    // Load history
    const loadHistory = async () => {
      try {
        const res = await api.get(`/friends/chat/${friendId}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    loadHistory();

    // Listen for new messages
    const handleMessage = (msg: any) => {
      // Verify it belongs to this conversation
      if (msg.roomId === roomId || (msg.sender === friendId && msg.recipientId === currentUserId) || (msg.sender === currentUserId && msg.recipientId === friendId)) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    };

    socket?.on('receive_message', handleMessage);

    return () => {
      socket?.off('receive_message', handleMessage);
    };
  }, [friendId, socket, currentUserId, roomId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = (type: string = 'TEXT', metadata: any = {}) => {
    if ((type === 'TEXT' && !input.trim()) || !socket) return;

    // We send to the room. The backend will save it.
    socket.emit('send_message', {
      roomId,
      message: type === 'TEXT' ? input : 'Game Invite',
      sender: currentUserId,
      recipientId: friendId,
      type,
      metadata
    });

    setInput('');
    setShowInviteOptions(false);
  };

  const handleSendInvite = (amount: number) => {
    // Create a random table ID for now or use specific logic
    const tableId = `table_${Date.now()}`;
    sendMessage('GAME_INVITE', {
      inviteTableId: tableId,
      inviteBetAmount: amount
    });
  };

  return (
    <div className="fixed bottom-0 right-4 w-80 h-96 z-50 shadow-2xl font-sans">
      <Card className="h-full flex flex-col bg-slate-900 border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-lg">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onViewProfile}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="font-semibold text-white tracking-wide">{friendName}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInviteOptions(!showInviteOptions)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
            >
              + Invite
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
          </div>
        </div>

        {/* Invite Menu Overlay */}
        {showInviteOptions && (
          <div className="absolute top-12 left-0 w-full bg-slate-800 p-3 z-10 border-b border-slate-700 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs text-slate-400 mb-2">Select Stake:</p>
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleSendInvite(amount)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-1 rounded border border-slate-600 transition-all hover:scale-105"
                >
                  ₹{amount}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === currentUserId;

            // Render different message types
            if (msg.type === 'GAME_INVITE') {
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 text-sm ${isMe ? 'bg-indigo-900/50 border border-indigo-500/30' : 'bg-slate-800 border border-slate-700'
                    }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-yellow-500/20 p-2 rounded-full">
                        🏆
                      </div>
                      <div>
                        <p className="text-white font-bold text-xs uppercase tracking-wider">Teen Patti Invitation</p>
                        <p className="text-slate-400 text-xs">Stake: <span className="text-yellow-400">₹{msg.metadata?.inviteBetAmount}</span></p>
                      </div>
                    </div>
                    {!isMe && (
                      <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-500 text-white border-none shadow-lg shadow-yellow-900/20">
                        JOINS TABLE
                      </Button>
                    )}
                    {isMe && <p className="text-[10px] text-slate-500 text-center mt-1">Invite Sent</p>}
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-200 rounded-bl-none'
                  }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-700 bg-slate-800 rounded-b-lg layer-blur">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              placeholder="Type a message..."
            />
            <Button size="sm" onClick={() => sendMessage()} className="rounded-full px-4 bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20">Send</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
