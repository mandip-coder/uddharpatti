"use client";

import React from 'react';

interface SeatProps {
  player: {
    username: string;
    avatarId?: string;
    active: boolean;
    folded: boolean;
    isSeen: boolean;
    currentBet: number;
    isDealer?: boolean;
    hand?: { suit: string; rank: string }[];
  } | null; // Allow null for empty seat
  seatIndex: number;
  isMe: boolean;
  isTurn: boolean;
  myBalance?: number;
  timerProgress?: number;
  onInvite?: () => void; // FIX: Add onInvite handler
}

const Seat: React.FC<SeatProps> = ({ player, seatIndex, isMe, isTurn, myBalance, timerProgress = 0, onInvite }) => {
  if (!player) {
    return (
      <div
        onClick={onInvite}
        className="flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer group hover:scale-105 transform duration-200"
        title="Invite Friend"
      >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center bg-slate-800/50 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-colors">
          <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </div>
        <span className="mt-2 text-xs text-slate-500 font-medium bg-slate-900 px-2 py-0.5 rounded-full group-hover:text-emerald-400 border border-transparent group-hover:border-emerald-500/30">Invite</span>
      </div>
    );
  }

  // Helper to render card or back
  const renderCard = (index: number, card?: { suit: string; rank: string }) => {
    // Rotation logic similar to previous CSS
    const rotations = ['-rotate-12', '-translate-y-2', 'rotate-12']; // Adjusted translate for larger cards
    const rotation = rotations[index];

    // Card Dimensions: Increased size for better visibility
    const cardClass = `w-12 h-16 rounded-md shadow-md overflow-hidden transform ${rotation} border border-slate-200`; // was w-8 h-11

    if (player.folded) {
      return (
        <div key={index} className={`${cardClass} bg-slate-800 border-slate-600 flex items-center justify-center opacity-50`}>
          <div className="text-xs text-slate-500">X</div>
        </div>
      );
    }

    // If I have cards and hand is provided, show actual assets ONLY if Seen
    if (card && player.isSeen) {
      const assetName = `${card.rank}${card.suit}.png`;
      return (
        <div key={index} className={`${cardClass} bg-white`}>
          <img
            src={`/assets/cards/${assetName}`}
            alt={`${card.rank}${card.suit}`}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Fallback: Card Back (Strict Blind Mode or Opponent)
    return (
      <div key={index} className={`${cardClass} bg-slate-900 border-white/20`}>
        <img src="/assets/cards/back.png" alt="Card Back" className="w-full h-full object-cover" />
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${player.folded ? 'opacity-50 grayscale' : ''} ${isTurn ? 'scale-105 z-20' : 'z-10'}`}>

      {/* Cards Area (Positioned above avatar) */}
      <div className="mb-[-15px] z-10 flex -space-x-4 h-20 items-end pb-2"> {/* Adjusted container height and spacing */}
        {player.folded ? (
          <div className="text-xs font-bold text-red-400 bg-slate-900/90 px-3 py-1.5 rounded border border-red-500/30">FOLDED</div>
        ) : (
          <>
            {[0, 1, 2].map(i => renderCard(i, player.hand ? player.hand[i] : undefined))}
          </>
        )}
      </div>

      {/* Avatar Container */}
      <div className="relative">
        {/* Timer Ring */}
        {isTurn && (
          <svg className="absolute top-[-4px] left-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] rotate-[-90deg]">
            <circle cx="50%" cy="50%" r="36" fill="none" stroke="#334155" strokeWidth="3" />
            <circle
              cx="50%" cy="50%" r="36" fill="none" stroke="#f59e0b" strokeWidth="3"
              strokeDasharray="226"
              strokeDashoffset={226 - (226 * timerProgress) / 100}
              className="transition-[stroke-dashoffset] duration-200 ease-linear"
            />
          </svg>
        )}

        {/* Avatar Image */}
        <div className={`w-16 h-16 rounded-full border-2 overflow-hidden bg-slate-800 flex items-center justify-center ${isTurn ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-slate-600'}`}>
          {player.avatarId ? (
            <img src={`/assets/avatars/${player.avatarId}.png`} alt={player.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-slate-400">{player.username.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* BLIND/SEEN Badge - Improved Visibility */}
        {!player.folded && (
          <div className={`absolute -top-3 -right-3 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-lg z-30 flex items-center gap-1 ${player.isSeen
            ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/20'
            : 'bg-purple-600 border-purple-400 text-white shadow-purple-500/20'
            }`}>
            {player.isSeen ? (
              <><span>👁️</span> SEEN</>
            ) : (
              <><span>🎴</span> BLIND</>
            )}
          </div>
        )}

        {/* Dealer Button */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-slate-300 text-slate-900 font-bold text-[10px] flex items-center justify-center shadow-md z-20">
            D
          </div>
        )}
      </div>

      {/* Player Info Badge */}
      <div className={`mt-[-8px] z-20 px-3 py-1 rounded-full text-xs font-medium border flex flex-col items-center min-w-[80px] ${isTurn ? 'bg-amber-500/10 border-amber-500/50 text-amber-100' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
        <span className="truncate max-w-[80px]">{player.username}</span>

        {/* Show balance ONLY for self */}
        {isMe && myBalance !== undefined && (
          <span className="font-mono text-[10px] text-emerald-400">
            ₹{myBalance.toLocaleString()}
          </span>
        )}

        {/* Show current bet for opponents */}
        {!isMe && player.currentBet > 0 && (
          <span className="font-mono text-[10px] text-amber-400">
            Bet: ₹{player.currentBet}
          </span>
        )}
      </div>

    </div>
  );
};

export default Seat;
