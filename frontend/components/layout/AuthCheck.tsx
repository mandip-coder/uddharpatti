'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { usePathname, useRouter } from 'next/navigation';
import InviteNotification from '../game/InviteNotification';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { checkAuth, token, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

      if (!token && !isAuthPage) {
        router.push('/login');
      }

      if (token && isAuthPage) {
        router.push('/dashboard');
      }
    }
  }, [token, isLoading, pathname, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <>
      {children}
      {token && <InviteNotification />}
    </>
  );
}
