'use client';

import { PlayingCard } from './PlayingCard';
import { clsx } from 'clsx';

interface PlayerHand {
  userId: string;
  username: string;
  avatarId: string;
  hand: Array<{ suit: string; rank: string }>;
  handName: string;
  isWinner: boolean;
}

interface ShowdownModalProps {
  playerHands: PlayerHand[];
  winner: {
    userId: string;
    username: string;
    avatarId: string;
  };
  pot: number;
  reason: string;
  currentUserId: string;
  delay: number;
}

export function ShowdownModal({
  playerHands,
  winner,
  pot,
  reason,
  currentUserId,
  delay
}: ShowdownModalProps) {
  const isWinner = winner.userId === currentUserId;

  if (!playerHands || playerHands.length === 0) {
    // Fallback for non-showdown scenarios (fold)
    return (
      <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-8 rounded-2xl text-center max-w-lg w-full animate-in zoom-in shadow-2xl">
          <h2 className="text-4xl font-bold text-white mb-6">
            {isWinner ? '🎉 You Won!' : '😔 Round Lost'}
          </h2>

          <div className="bg-white/20 backdrop-blur rounded-lg p-6 mb-6">
            <p className="text-white text-xl mb-2">
              Winner: <span className="font-bold">{winner.username}</span>
            </p>
            <p className="text-white/80 text-sm mb-3">
              Reason: <span className="capitalize">{reason.replace('_', ' ')}</span>
            </p>
            <p className="text-yellow-200 text-3xl font-bold">₹{pot}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            <p>Next round starting soon...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-2xl max-w-4xl w-full animate-in zoom-in shadow-2xl border border-yellow-500/30">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {isWinner ? '🎉 You Won!' : '😔 Round Lost'}
          </h2>
          <p className="text-yellow-400 text-2xl sm:text-3xl font-bold">₹{pot}</p>
          <p className="text-slate-400 text-sm mt-2">
            Reason: <span className="capitalize text-white">{reason.replace('_', ' ')}</span>
          </p>
        </div>

        {/* Player Hands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {playerHands.map((player) => (
            <div
              key={player.userId}
              className={clsx(
                'rounded-xl p-6 border-2 transition-all',
                player.isWinner
                  ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500 shadow-lg shadow-yellow-500/50'
                  : 'bg-slate-800/50 border-slate-700'
              )}
            >
              {/* Player Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2',
                    player.isWinner ? 'border-yellow-400 bg-yellow-500/20' : 'border-slate-600 bg-slate-700'
                  )}>
                    {player.avatarId === 'avatar_1' ? '👤' : '🎭'}
                  </div>
                  <div>
                    <p className={clsx(
                      'font-bold text-lg',
                      player.isWinner ? 'text-yellow-400' : 'text-white'
                    )}>
                      {player.username}
                      {player.userId === currentUserId && ' (You)'}
                    </p>
                    <p className={clsx(
                      'text-sm font-medium',
                      player.isWinner ? 'text-yellow-300' : 'text-slate-400'
                    )}>
                      {player.handName}
                    </p>
                  </div>
                </div>
                {player.isWinner && (
                  <div className="text-3xl animate-bounce">👑</div>
                )}
              </div>

              {/* Cards */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {player.hand.map((card, idx) => (
                  <div
                    key={idx}
                    className="transform transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <PlayingCard
                      suit={card.suit as any}
                      rank={card.rank}
                      className="w-16 sm:w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-slate-400"></div>
          <p>Next round starting in {Math.floor(delay / 1000)} seconds...</p>
        </div>
      </div>
    </div>
  );
}
