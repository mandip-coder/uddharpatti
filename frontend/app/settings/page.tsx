'use client';

import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { AvatarSelector } from '@/components/Settings/AvatarSelector';
import NotificationPreferences from '@/components/Settings/NotificationPreferences';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');

  // Redirect if not authenticated
  if (!isLoading && !user) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">User Settings</h1>
          <p className="text-slate-400 mt-2">Manage your profile and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800 rounded-lg p-1 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`
              flex-1 py-3 px-4 rounded-md font-medium transition-all
              ${activeTab === 'profile'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }
            `}
          >
            <span className="mr-2">👤</span>
            Profile & Stats
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`
              flex-1 py-3 px-4 rounded-md font-medium transition-all
              ${activeTab === 'notifications'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }
            `}
          >
            <span className="mr-2">🔔</span>
            Notification Preferences
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="text-slate-400 text-xs uppercase font-bold">Games Played</div>
                  <div className="text-2xl font-bold text-white">{user?.stats?.gamesPlayed || 0}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="text-slate-400 text-xs uppercase font-bold">Wins</div>
                  <div className="text-2xl font-bold text-emerald-400">{user?.stats?.wins || 0}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="text-slate-400 text-xs uppercase font-bold">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{user?.stats?.losses || 0}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="text-slate-400 text-xs uppercase font-bold">Win Rate</div>
                  <div className="text-2xl font-bold text-violet-400">
                    {user?.stats?.gamesPlayed ? Math.round(((user.stats.wins || 0) / user.stats.gamesPlayed) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <AvatarSelector />
            </>
          )}

          {activeTab === 'notifications' && <NotificationPreferences />}
        </div>

        {/* User Info Footer */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Logged in as</p>
              <p className="text-white font-semibold">{user?.username}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Wallet Balance</p>
              <p className="text-emerald-400 font-bold">₹{user?.walletBalance}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
