'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

export default function GameSetup() {
  const router = useRouter();
  const {
    findMatch,
    matchResult,
    getTableTypes,
    tableTypes,
    isConnected
  } = useSocket();

  const [customRoomId, setCustomRoomId] = useState('');

  // Fetch table types on mount
  useEffect(() => {
    if (isConnected) {
      getTableTypes();
    }
  }, [isConnected]);

  // Handle match found
  useEffect(() => {
    if (matchResult && matchResult.roomId) {
      router.push(`/game/${matchResult.roomId}`);
    }
  }, [matchResult, router]);

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomId.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    router.push(`/game/${customRoomId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Select Table</h3>
        <p className="text-slate-400 text-sm">Choose your stakes and start playing.</p>
      </div>

      {/* Table Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tableTypes.length > 0 ? (
          tableTypes.map((table) => (
            <Card
              key={table.id}
              className="relative overflow-hidden group hover:ring-2 hover:ring-violet-500 transition-all cursor-pointer"
              onClick={() => findMatch(table.id)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-white/0 rounded-bl-full" />

              <h4 className="text-lg font-bold text-white mb-1">{table.name}</h4>
              <div className="flex flex-col gap-1 mb-4">
                <span className="text-sm text-emerald-400 font-mono">Boot: ₹{table.bootAmount}</span>
                <span className="text-xs text-slate-400">Entry: ₹{table.entryFee}</span>
              </div>

              <Button size="sm" fullWidth variant="primary" className="mt-auto">
                Play Now
              </Button>
            </Card>
          ))
        ) : (
          // Loading Skeletons
          [1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-800/50 rounded-xl animate-pulse" />
          ))
        )}
      </div>

      {/* Custom Room Option */}
      <div className="pt-4 border-t border-slate-800">
        <p className="text-sm text-slate-500 mb-3">Or join a private room:</p>
        <form onSubmit={handleJoinCustom} className="flex gap-2 max-w-md">
          <Input
            placeholder="Enter Room Code"
            value={customRoomId}
            onChange={(e) => setCustomRoomId(e.target.value)}
            className="bg-slate-800"
          />
          <Button type="submit" variant="secondary">
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}
