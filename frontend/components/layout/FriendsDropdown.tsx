"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { FriendListItem } from './FriendListItem';
import { FaUsers } from 'react-icons/fa';

export default function FriendsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { friends, isLoading, error } = useFriends();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const onlineCount = friends.filter(f => f.status !== 'offline').length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Friends Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
        title="Friends"
      >
        <FaUsers className="text-emerald-400" />
        <span className="hidden sm:inline text-sm font-medium text-slate-200">Friends</span>
        {onlineCount > 0 ? (
          <>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {onlineCount}
            </span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </>
        ) : (
          <span className="bg-slate-700 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
            0
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Friends</h3>
              <span className="text-xs text-slate-500">
                {onlineCount} online
              </span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search friends..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Friends List */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500 mx-auto mb-2"></div>
                <p className="text-xs text-slate-500">Loading friends...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-red-400 mb-2">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && friends.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaUsers className="text-slate-600 text-xl" />
                </div>
                <p className="text-sm text-slate-400 mb-1">No friends yet</p>
                <p className="text-xs text-slate-500">Search for users to add friends</p>
              </div>
            )}

            {/* Friend List */}
            {!isLoading && !error && friends.length > 0 && (
              <div className="p-2">
                {/* Online Friends */}
                {onlineCount > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                      Online ({onlineCount})
                    </h4>
                    <div className="space-y-1">
                      {friends
                        .filter(f => f.status !== 'offline')
                        .map((friend) => (
                          <FriendListItem key={friend._id} friend={friend} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Offline Friends */}
                {friends.filter(f => f.status === 'offline').length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                      Offline ({friends.filter(f => f.status === 'offline').length})
                    </h4>
                    <div className="space-y-1">
                      {friends
                        .filter(f => f.status === 'offline')
                        .map((friend) => (
                          <FriendListItem key={friend._id} friend={friend} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
