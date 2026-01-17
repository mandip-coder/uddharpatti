"use client";

import React from 'react';
import GlobalHeader from './GlobalHeader';
import { useAuthStore } from '@/hooks/useAuthStore';
import InviteNotification from '../game/InviteNotification';
import UdhaarNotificationCard from '../social/UdhaarNotificationCard';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Header */}
      <GlobalHeader
        user={user ? {
          username: user.username,
          balance: user.walletBalance,
          avatarId: user.avatarId
        } : undefined}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
        <div className="container mx-auto p-4 max-w-7xl animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Global Notification Components */}
      {user && (
        <>
          <InviteNotification />
          <UdhaarNotificationCard />
        </>
      )}
    </div>
  );
};

export default AppLayout;

