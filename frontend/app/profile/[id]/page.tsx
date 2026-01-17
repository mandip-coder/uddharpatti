'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/utils/api';
import { User } from '@/types';

// Extended type for public profile response
// Extended type for public profile response
interface PublicProfile extends Omit<User, 'debtSummary'> {
  debtSummary: {
    activeCount: number;
    totalAmount: number;
    hasActiveDebt: boolean;
  };
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const id = params?.id; // useParams returns object directly in client components usually, but safe check style
        if (!id) return;

        const res = await api.get(`/users/${id}/public-profile`);
        setProfile(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
        <p className="mb-6 text-slate-400">{error || 'User not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const avatarUrl = profile.avatarId
    ? `/assets/avatars/${profile.avatarId}.png`
    : '/assets/avatars/avatar_1.png';

  const winRate = profile.stats?.gamesPlayed
    ? Math.round(((profile.stats.wins || 0) / profile.stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-xl mx-auto mt-10">

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Profile Card */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border border-slate-700 shadow-xl text-center">

          {/* Avatar & Identity */}
          <div className="relative inline-block mb-4">
            <img
              src={avatarUrl}
              alt={profile.username}
              className="w-32 h-32 rounded-full border-4 border-slate-700 mx-auto object-cover bg-slate-900"
            />
            {profile.debtSummary.activeCount > 0 && (
              <div className="absolute bottom-1 right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-slate-800" title="Has Active Debt">
                !
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">{profile.username}</h1>
          <p className="text-slate-400 text-sm mb-8">Joined {new Date(profile.joinedAt || Date.now()).toLocaleDateString()}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-left">

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase font-bold mb-1">Total Games</div>
              <div className="text-2xl font-bold text-white">{profile.stats?.gamesPlayed || 0}</div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase font-bold mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-violet-400">{winRate}%</div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase font-bold mb-1">Wins / Losses</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-400">{profile.stats?.wins || 0}</span>
                <span className="text-slate-500">/</span>
                <span className="text-lg font-semibold text-red-400">{profile.stats?.losses || 0}</span>
              </div>
            </div>

            {/* Debt Summary (Limited View) */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase font-bold mb-1">Reliability</div>
              <div className="text-lg font-semibold text-slate-200">
                {profile.debtSummary.activeCount === 0
                  ? <span className="text-emerald-400 flex items-center gap-1">✓ Debt Free</span>
                  : <span className="text-yellow-400">{profile.debtSummary.activeCount} Active Loan{profile.debtSummary.activeCount !== 1 ? 's' : ''}</span>
                }
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
