'use client';

import DebtList from '@/components/debt/DebtList';
import RequestDebt from '@/components/debt/RequestDebt';
import Link from 'next/link';

export default function DebtPage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <main className="max-w-md mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-white">Udhaar Center</h1>
        </div>

        <RequestDebt />
        <DebtList />
      </main>
    </div>
  );
}
