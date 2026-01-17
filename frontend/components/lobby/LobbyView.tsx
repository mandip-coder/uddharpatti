"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { Toaster, toast } from 'react-hot-toast';

const LobbyView = () => {
  const router = useRouter();
  const { isConnected } = useSocket(); // Ensure socket is connected
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Generate a random room ID for creating a game
  const handleCreateGame = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game/${newRoomId}`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    router.push(`/game/${joinRoomId.toUpperCase()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center pb-20">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            Uddhar Patti
          </h1>
          <p className="text-slate-400 text-lg">
            Play with friends. Track debts. No strangers.
          </p>
        </div>

        <div className="space-y-4">
          {/* Create Game Button */}
          <button
            onClick={handleCreateGame}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg border border-emerald-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-3 group"
          >
            <span className="text-2xl">🎲</span>
            <div className="text-left">
              <div className="text-lg leading-tight">Create Private Table</div>
              <div className="text-xs text-emerald-200 opacity-80 group-hover:opacity-100">
                Be the host & invite friends
              </div>
            </div>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-slate-500">OR</span>
            </div>
          </div>

          {/* Join Game Section */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 px-6 rounded-xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🚪</span>
              <div className="text-left">
                <div className="text-lg leading-tight">Join Existing Table</div>
                <div className="text-xs text-slate-400">
                  Enter a room code
                </div>
              </div>
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={handleJoinGame}
              className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"
            >
              <label className="block text-left text-sm text-slate-400 mb-2 font-medium">
                ENTER ROOM CODE
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="e.g. X7K9P2"
                  className="flex-1 bg-slate-950 border border-slate-700 text-white text-lg font-mono font-bold py-3 px-4 rounded-lg focus:outline-none focus:border-emerald-500 uppercase placeholder:text-slate-700"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!joinRoomId.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-6 rounded-lg transition-colors"
                >
                  JOIN
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinInput(false)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
              >
                Cancel
              </button>
            </motion.form>
          )}
        </div>

        {/* Connection Status Indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <span className="text-xs text-slate-500 tracking-wider font-medium">
            {isConnected ? 'SERVER CONNECTED' : 'CONNECTING...'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default LobbyView;
