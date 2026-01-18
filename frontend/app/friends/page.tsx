'use client';

import { useState } from 'react';
import FriendList from '@/components/social/FriendList';
import FriendRequests from '@/components/social/FriendRequests';
import AddFriend from '@/components/social/AddFriend';
import UserSearch from '@/components/social/UserSearch';
import BlockedUsers from '@/components/social/BlockedUsers';
import Link from 'next/link';

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'blocked'>('friends');

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <main className="max-w-4xl mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-white">Friends & Social</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'friends'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            My Friends
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'search'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Search Users
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'blocked'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Blocked Users
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'friends' && (
          <>
            {/* 1. Pending Requests (Only shows if any) */}
            <FriendRequests />

            {/* 2. Add New Friend */}
            <AddFriend />

            {/* 3. My Friends List */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                My Connections
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-normal">Online First</span>
              </h3>
              <FriendList />
            </div>
          </>
        )}

        {activeTab === 'search' && <UserSearch />}

        {activeTab === 'blocked' && <BlockedUsers />}
      </main>
    </div>
  );
}
