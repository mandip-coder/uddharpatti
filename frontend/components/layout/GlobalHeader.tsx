"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuthStore';
import { NotificationDrawer } from './NotificationDrawer';
import FriendsDropdown from './FriendsDropdown';
import { FaCog, FaSignOutAlt, FaGamepad, FaUsers, FaHandHoldingUsd, FaCoins } from 'react-icons/fa';
import { usePathname } from 'next/navigation';

interface GlobalHeaderProps {
  user?: {
    username: string;
    balance: number;
    avatarId?: string;
  };
}

const GlobalHeader: React.FC<GlobalHeaderProps> = ({ user }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { name: 'Lobby', href: '/dashboard', icon: FaGamepad },
    { name: 'Friends', href: '/friends', icon: FaUsers },
    { name: 'Udhaar', href: '/debt', icon: FaHandHoldingUsd },
  ];
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 right-0 z-50">
      {/* Branding */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-white font-bold text-lg">U</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent hidden sm:block">
          Uddhar Patti
        </h1>
      </Link>

      {/* Main Navigation (Desktop) */}
      <nav className="hidden lg:flex items-center gap-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icon className="text-lg" />
              <span className="text-sm font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Center Status (Desktop) */}
      <div className="hidden md:flex items-center gap-4 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FaCoins className="text-emerald-400 text-xs" />
          <span className="text-white font-mono font-bold text-sm">₹{user?.balance?.toLocaleString() ?? '0'}</span>
        </div>
        <div className="w-px h-4 bg-slate-700"></div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {/* Wallet Mobile */}
        <div className="md:hidden flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          <span className="text-emerald-400 text-xs">₹</span>
          <span className="text-white font-bold text-sm">{user?.balance?.toLocaleString() ?? 0}</span>
        </div>

        {/* Friends Dropdown */}
        {user && <FriendsDropdown />}

        {/* Notifications */}
        <NotificationDrawer />

        {/* Settings & Logout (only show if logged in) */}
        {user && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-700/50">
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
        )}

        {/* Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-700/50">
          <span className="hidden sm:block text-sm font-medium text-slate-200">{user?.username || 'Guest'}</span>
          <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold overflow-hidden">
            {user?.avatarId ? (
              <img src={`/assets/avatars/${user.avatarId}.png`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.username?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
