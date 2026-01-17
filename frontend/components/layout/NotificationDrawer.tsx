'use client';

import { useState, useRef, useEffect } from 'react';
import { FaBell, FaCheckDouble, FaTrash, FaCircle } from 'react-icons/fa';
import { clsx } from 'clsx';
import { useNotificationStore } from '@/hooks/useNotificationStore';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead, clearAll, markAsRead } = useNotificationStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className="relative" ref={drawerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <FaBell className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
        )}
      </button>

      {/* Drawer */}
      <div
        className={clsx(
          "absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 z-50 transform origin-top-right",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white">Notifications</h3>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                title="Mark all as read"
              >
                <FaCheckDouble /> Read All
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => clearAll()}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                title="Clear all"
              >
                <FaTrash /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FaBell className="text-2xl mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  className={clsx(
                    "p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer",
                    !notification.read ? "bg-slate-800/40" : "opacity-75"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={clsx("text-sm font-semibold", !notification.read ? "text-white" : "text-slate-300")}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <FaCircle className="text-[6px] text-violet-500 mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{notification.message}</p>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {formatDistanceToNow(notification.receivedAt, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
