'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';

interface TableType {
  id: string;
  name: string;
  type: 'public' | 'private';
  tier: 'low' | 'medium' | 'high';
  entryFee: number;
  bootAmount: number;
  maxBetLimit: number;
  minBalanceToSit: number;
  maxPlayers: number;
  minPlayers: number;
  description: string;
}

interface TableLobbyProps {
  userBalance: number;
  onTableSelect: (tableId: string) => void;
}

export function TableLobby({ userBalance, onTableSelect }: TableLobbyProps) {
  const [tableTypes, setTableTypes] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch table types from backend
    fetchTableTypes();
  }, []);

  const fetchTableTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/tables`);
      if (response.ok) {
        const data = await response.json();
        setTableTypes(data.tables || []);
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'low':
        return 'from-green-500 to-emerald-600';
      case 'medium':
        return 'from-blue-500 to-indigo-600';
      case 'high':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'low':
        return { text: 'Beginner Friendly', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'medium':
        return { text: 'Intermediate', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'high':
        return { text: 'High Stakes', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      default:
        return { text: 'Standard', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    }
  };

  const isEligible = (table: TableType) => {
    return userBalance >= table.minBalanceToSit;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading tables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Choose Your Table</h2>
        <p className="text-slate-400">Select a table that matches your skill level and budget</p>
        <div className="mt-4 inline-block bg-slate-800 px-6 py-3 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400">Your Balance</p>
          <p className="text-2xl font-bold text-green-400">₹{userBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tableTypes.map((table) => {
          const eligible = isEligible(table);
          const tierBadge = getTierBadge(table.tier);
          const tierColor = getTierColor(table.tier);

          return (
            <div
              key={table.id}
              className={`relative bg-slate-800 rounded-xl border-2 overflow-hidden transition-all duration-300 ${eligible
                  ? 'border-slate-700 hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/20 cursor-pointer'
                  : 'border-slate-800 opacity-60'
                }`}
            >
              {/* Header with gradient */}
              <div className={`bg-gradient-to-r ${tierColor} p-6 text-white`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-bold">{table.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${tierBadge.color}`}>
                    {tierBadge.text}
                  </span>
                </div>
                <p className="text-sm opacity-90">{table.description}</p>
              </div>

              {/* Table Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Entry Fee</p>
                    <p className="text-lg font-bold text-white">₹{table.entryFee}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Boot Amount</p>
                    <p className="text-lg font-bold text-white">₹{table.bootAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Max Bet</p>
                    <p className="text-lg font-bold text-white">₹{table.maxBetLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Players</p>
                    <p className="text-lg font-bold text-white">{table.minPlayers}-{table.maxPlayers}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Minimum Balance Required</p>
                  <p className="text-sm font-bold text-yellow-400">₹{table.minBalanceToSit.toLocaleString()}</p>
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  disabled={!eligible}
                  onClick={() => onTableSelect(table.id)}
                  variant={eligible ? 'primary' : 'secondary'}
                >
                  {eligible ? (
                    <>
                      <span className="mr-2">🎮</span>
                      Quick Join
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔒</span>
                      Insufficient Balance
                    </>
                  )}
                </Button>
              </div>

              {/* Ineligible Overlay */}
              {!eligible && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                  <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg font-bold text-sm">
                    Need ₹{(table.minBalanceToSit - userBalance).toLocaleString()} more
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tableTypes.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400">
          <p>No tables available at the moment</p>
        </div>
      )}
    </div>
  );
}
