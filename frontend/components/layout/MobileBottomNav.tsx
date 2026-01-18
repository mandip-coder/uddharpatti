"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGamepad, FaUsers, FaHandHoldingUsd, FaCog } from 'react-icons/fa';

const MobileBottomNav = () => {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Lobby', href: '/dashboard', icon: FaGamepad },
    { name: 'Friends', href: '/friends', icon: FaUsers },
    { name: 'Udhaar', href: '/debt', icon: FaHandHoldingUsd },
    { name: 'Settings', href: '/settings', icon: FaCog },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-50">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <Icon className="text-xl" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{link.name}</span>
            {isActive && (
              <div className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
