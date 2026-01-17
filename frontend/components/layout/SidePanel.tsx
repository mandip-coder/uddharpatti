"use client";

import React, { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { FriendListItem } from './FriendListItem';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'FRIENDS' | 'CHAT' | 'HISTORY';

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('FRIENDS');
  const { friends, isLoading, error, refetch } = useFriends();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel Container */}
      <aside className={`
        fixed top-16 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:translate-x-0 md:static md:block
      `}>
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('FRIENDS')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'FRIENDS' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Friends
            <span className="ml-2 bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full">{friends.length}</span>
            {activeTab === 'FRIENDS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>}
          </button>
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'CHAT' ? 'text-sky-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chat
            {activeTab === 'CHAT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"></div>}
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'HISTORY' ? 'text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            History
            {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 h-[calc(100%-3.5rem)] overflow-y-auto custom-scrollbar">

          {activeTab === 'FRIENDS' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search friends..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Online List */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Online ({friends.filter(f => f.status !== 'offline').length})
                </h3>

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500 mx-auto mb-2"></div>
                    <p className="text-xs text-slate-500">Loading friends...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-8">
                    <p className="text-xs text-red-400 mb-2">{error}</p>
                    <button
                      onClick={refetch}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && friends.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400 mb-2">No friends yet</p>
                    <p className="text-xs text-slate-500">Search for users to add friends</p>
                  </div>
                )}

                {/* Friend List */}
                {!isLoading && !error && friends.length > 0 && (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <FriendListItem key={friend._id} friend={friend} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'CHAT' && (
            <div className="flex flex-col h-full items-center justify-center text-center p-4">
              <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <h3 className="text-slate-300 font-medium mb-1">Global Chat</h3>
              <p className="text-xs text-slate-500">Join a table to chat with players</p>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-left">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-emerald-400 text-xs font-bold">+ ₹500</span>
                    <span className="text-slate-500 text-[10px]">2m ago</span>
                  </div>
                  <div className="text-xs text-slate-300">Won with Pure Sequence</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidePanel;
