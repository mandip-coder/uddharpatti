"use client";

import React from 'react';

interface TableCardProps {
  id: string;
  name: string;
  bootAmount: number;
  activePlayers: number;
  maxPlayers: number;
  status: 'WAITING' | 'PLAYING';
  onJoin: (id: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({ id, name, bootAmount, activePlayers, maxPlayers, status, onJoin }) => {
  const occupancy = (activePlayers / maxPlayers) * 100;

  return (
    <div
      onClick={() => onJoin(id)}
      className="group relative bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>

      <div className="relative flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-bold text-lg mb-1">{name}</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status === 'WAITING' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {status}
            </span>
            <span className="text-slate-500 text-xs">ID: {id.slice(0, 4)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-emerald-400 font-mono font-bold text-xl">₹{bootAmount}</div>
          <div className="text-slate-500 text-[10px] uppercase">Boot Amount</div>
        </div>
      </div>

      {/* Visual Seat Indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Players</span>
          <span>{activePlayers}/{maxPlayers}</span>
        </div>
        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${activePlayers >= maxPlayers ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${occupancy}%` }}
          ></div>
        </div>
      </div>

      {/* Avatars Preview (Mock) */}
      <div className="flex items-center justify-between mt-4 border-t border-slate-700/50 pt-4">
        <div className="flex -space-x-2">
          {[...Array(Math.min(activePlayers, 4))].map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center text-[8px] text-white">
              {/* Placeholder Avatar */}
            </div>
          ))}
          {activePlayers > 4 && (
            <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-[8px] text-slate-300">
              +{activePlayers - 4}
            </div>
          )}
        </div>

        <button className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all btn-primary px-4 py-1.5 text-xs">
          Join Table
        </button>
      </div>
    </div>
  );
};

export default TableCard;
