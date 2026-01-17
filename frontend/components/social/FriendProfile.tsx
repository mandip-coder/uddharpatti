'use client';

import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '@/utils/api';
import { getAvatarAsset } from '@/utils/assets';
import Image from 'next/image';
import UdhaarRequestModal from './UdhaarRequestModal';

interface FriendStats {
  username: string;
  avatarId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
  debtSummary: {
    totalActiveDebts: number;
    totalOutstandingAmount: number;
    trustLabel: string;
  };
  headToHead?: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRatio: number;
  };
}

interface FriendProfileProps {
  friendId: string;
  onClose: () => void;
}

export default function FriendProfile({ friendId, onClose }: FriendProfileProps) {
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUdhaarModal, setShowUdhaarModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, h2hRes] = await Promise.all([
          api.get(`/friends/stats/${friendId}`),
          api.get(`/friends/stats/vs/${friendId}`)
        ]);

        setStats({
          ...statsRes.data,
          headToHead: h2hRes.data
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [friendId]);

  if (!stats && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700 relative flex flex-col items-center p-6 gap-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        {loading ? (
          <div className="text-slate-400">Loading profile...</div>
        ) : (
          <>
            {/* Header / Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 shadow-xl">
                <Image
                  src={getAvatarAsset(stats?.avatarId || 'avatar_1')}
                  alt={stats?.username || 'User'}
                  fill
                  className="object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-white">{stats?.username}</h2>
              <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                Trust Score: <span className={`
                    ${stats?.debtSummary.trustLabel === 'Trustworthy' ? 'text-emerald-400' : ''}
                    ${stats?.debtSummary.trustLabel === 'High Risk' ? 'text-red-400' : ''}
                    ${stats?.debtSummary.trustLabel === 'New' ? 'text-blue-400' : ''}
                `}>{stats?.debtSummary.trustLabel}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex gap-3">
              <Button
                variant="primary"
                onClick={() => setShowUdhaarModal(true)}
                className="flex-1"
              >
                💰 Request Udhaar
              </Button>
            </div>

            {/* Head-to-Head Stats */}
            <div className="w-full bg-indigo-900/30 p-4 rounded-xl border border-indigo-700/50 mt-4">
              <h3 className="text-indigo-300 text-xs uppercase font-bold mb-3 tracking-wider flex items-center gap-2">
                <span>⚔️</span> VS You
              </h3>
              {stats?.headToHead ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">Matches</span>
                    <span className="text-white font-bold">{stats.headToHead.totalMatches}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">Win Ratio</span>
                    <span className="text-yellow-400 font-bold">{stats.headToHead.winRatio}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs">Record</span>
                    <span className="text-white text-xs font-mono">
                      <span className="text-emerald-400">{stats.headToHead.wins}W</span> - <span className="text-red-400">{stats.headToHead.losses}L</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center italic">No games played together yet</div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="w-full grid grid-cols-2 gap-4">
              {/* Gameplay Stats */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 tracking-wider">Gameplay Global</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Games</span>
                    <span className="text-white font-mono">{stats?.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400">Wins</span>
                    <span className="text-white font-mono">{stats?.wins}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">Losses</span>
                    <span className="text-white font-mono">{stats?.losses}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between text-sm">
                    <span className="text-slate-300">Win Rate</span>
                    <span className="text-yellow-400 font-bold">{stats?.winPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 tracking-wider">Financial</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Active Debts</span>
                    <span className="text-white font-mono">{stats?.debtSummary.totalActiveDebts}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-slate-300 text-xs">Total Udhaar</span>
                    <span className="text-red-400 font-bold text-lg">₹{stats?.debtSummary.totalOutstandingAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Udhaar Request Modal */}
      {showUdhaarModal && stats && (
        <UdhaarRequestModal
          friendId={friendId}
          friendName={stats.username}
          onClose={() => setShowUdhaarModal(false)}
          onSuccess={() => {
            setShowUdhaarModal(false);
          }}
        />
      )}
    </div>
  );
}
