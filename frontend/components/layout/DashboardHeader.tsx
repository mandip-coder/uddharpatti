'use client';

import { useAuthStore } from '@/hooks/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaCog, FaExclamationCircle, FaCoins, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { NotificationDrawer } from './NotificationDrawer';

export default function DashboardHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const hasDebt = (user.debtSummary?.activeCount ?? 0) > 0;
  const avatarUrl = user.avatarId
    ? `/assets/avatars/${user.avatarId}.png`
    : '/assets/avatars/avatar_1.png';

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ${scrolled
        ? 'bg-slate-900/90 backdrop-blur-md shadow-lg border-b border-slate-800 py-3'
        : 'bg-transparent py-4'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">

        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20 flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform">
            UP
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
            Uddhar<span className="text-violet-400">Patti</span>
          </h1>
        </Link>

        {/* Right Section: Stats & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Debt Indicator */}
          {hasDebt && (
            <div className="hidden sx:flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20 animate-pulse-slow cursor-help" title={`${user.debtSummary?.activeCount} Active Debts`}>
              <FaExclamationCircle className="text-sm" />
              <span className="text-xs font-semibold">{user.debtSummary?.activeCount} Active</span>
            </div>
          )}

          {/* Wallet Balance */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-full px-3 pr-4 py-1.5 border border-slate-700/50 shadow-sm">
            <div className="bg-emerald-500/20 p-1.5 rounded-full">
              <FaCoins className="text-emerald-400 text-xs" />
            </div>
            <span className="font-bold text-emerald-400 text-sm">{user.walletBalance.toLocaleString()}</span>
          </div>

          {/* Notification Drawer */}
          <NotificationDrawer />

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-700/50">

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Settings"
              >
                <FaCog className="text-lg" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 rounded-full hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <FaSignOutAlt className="text-lg" />
              </button>
            </div>

            <Link href="/settings" className="flex items-center gap-3 group ml-2">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
                  {user.username}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  {user.stats?.wins || 0} Wins
                </div>
              </div>

              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-700 group-hover:border-violet-500 transition-colors object-cover bg-slate-800"
                />
                {hasDebt && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 border-2 border-slate-900 w-4 h-4 rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">!</span>
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
