"use client";

import React, { useEffect, useState } from 'react';

// Removed external type imports to avoid errors
// Using inline types or 'any' for now since we haven't defined global types file yet.
// I should probably duplicate card rendering logic or use a shared one.
// Seat uses internal logic? I'll check Seat.tsx later.
// For now, I'll assume I can render cards simply or re-use logic if possible.
// Wait, I haven't seen PlayingCard. I saw Seat.tsx in file list.
// I'll stick to simple rendering for now using standard UI or import if I find one.
// Actually, I should use a simple representation.

// Let's assume standard card display.

interface ResultOverlayProps {
  winner: {
    username: string;
    avatarId?: string;
    amount: number;
    userId: string;
  };
  reason: string;
  actionSourceUserId?: string; // Who caused the round end (folder/leaver)
  myUserId?: string; // To check perspective
  playerHands: Array<{
    userId: string;
    username: string;
    avatarId: string;
    hand: any[]; // Card[]
    handName: string;
    isWinner: boolean;
    isFolded?: boolean;
  }>;
  onNextRound: () => void;
  consentRequest?: { timeoutSeconds: number; timestamp: number } | null;
  onConsent?: (consent: boolean) => void;
}

const ResultOverlay: React.FC<ResultOverlayProps> = ({
  winner,
  reason,
  actionSourceUserId,
  myUserId,
  playerHands,
  onNextRound,
  consentRequest, // NEW
  onConsent       // NEW
}) => {
  // Existing state
  const [show, setShow] = useState(false);
  // NEW: Response state (to disable buttons after click)
  const [hasResponded, setHasResponded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    setShow(true);
    return () => setShow(false);
  }, []);

  // NEW: Timer Logic for Consent
  useEffect(() => {
    if (consentRequest) {
      // Calculate finish time based on server timestamp
      const deadline = consentRequest.timestamp + (consentRequest.timeoutSeconds * 1000);

      const updateTimer = () => {
        const now = Date.now();
        const left = Math.max(0, Math.ceil((deadline - now) / 1000));
        setTimeLeft(left);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 200);
      return () => clearInterval(interval);
    }
  }, [consentRequest]);

  const handleConsent = (decision: boolean) => {
    if (hasResponded || !onConsent) return;
    setHasResponded(true);
    onConsent(decision);
  };

  const getReasonText = (r: string) => {
    switch (r) {
      case 'show': return 'Winning Hand';
      case 'side_show': return 'Won via Side Show';
      case 'fold':
        if (actionSourceUserId) {
          if (actionSourceUserId === myUserId) return 'You Folded';
          const folder = playerHands.find(p => p.userId === actionSourceUserId);
          return `${folder?.username || 'Opponent'} Folded`;
        }
        return 'Opponent Folded';
      case 'player_exit':
        if (actionSourceUserId) {
          if (actionSourceUserId === myUserId) return 'You Left';
          const leaver = playerHands.find(p => p.userId === actionSourceUserId);
          return `${leaver?.username || 'Opponent'} Left`;
        }
        return 'Opponent Left';
      case 'disconnect_timeout': return 'Opponent Disconnected';
      default: return 'Winner';
    }
  }

  // CONDITIONAL RENDER: CONSENT VIEW
  if (consentRequest) {
    return (
      <div className={`absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95">

          <div className="text-6xl mb-6">⏱️</div>

          <h2 className="text-3xl font-bold text-white mb-2">Next Round?</h2>
          <p className="text-slate-400 text-center mb-8">
            Game will continue in <span className="text-emerald-400 font-mono text-xl">{timeLeft}</span> seconds.
          </p>

          {hasResponded ? (
            <div className="bg-slate-800 px-6 py-3 rounded-lg text-slate-300 animate-pulse">
              Waiting for other players...
            </div>
          ) : (
            <div className="flex gap-4 w-full">
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/20"
              >
                Continue
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 active:scale-95"
              >
                Leave
              </button>
            </div>
          )}

          <div className="mt-8 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / consentRequest.timeoutSeconds) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-4xl h-[90%] bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="w-full bg-slate-900 border-b border-slate-800 p-6 flex flex-col items-center relative overflow-hidden">
          {/* Spotlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="text-emerald-400 font-bold tracking-widest text-sm uppercase mb-2">Round Winner</div>
          <h2 className="text-4xl font-black text-white italic drop-shadow-xl mb-2">
            {winner.username}
          </h2>
          <div className="bg-emerald-500/20 text-emerald-300 px-4 py-1 rounded-full border border-emerald-500/50 font-mono text-xl font-bold">
            ₹{winner.amount.toLocaleString()}
          </div>
          <div className="text-slate-500 text-xs mt-2 uppercase tracking-wider">{getReasonText(reason)}</div>
        </div>

        {/* Content - Player List */}
        <div className="flex-1 w-full overflow-y-auto p-6 space-y-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Round Recap - All Hands</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playerHands && playerHands.map((player) => (
              <div key={player.userId}
                className={`relative flex items-center p-4 rounded-xl border ${player.isWinner ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700'} transition-all`}>

                {player.isWinner && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">
                    WINNER
                  </div>
                )}

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full border-2 border-slate-600 overflow-hidden bg-slate-950 mr-4 shrink-0">
                  {player.avatarId ? (
                    <img src={`/assets/avatars/${player.avatarId}.png`} alt={player.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                      {player.username.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-200 truncate">{player.username}</div>
                    {player.handName && (
                      <div className={`text-xs font-medium px-2 py-0.5 rounded ${player.isWinner ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                        {player.handName}
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex gap-2">
                    {player.hand && player.hand.length > 0 ? (
                      player.hand.map((card, idx) => (
                        renderCardImage(card, idx)
                      ))
                    ) : (
                      <span className="text-slate-600 text-xs italic">Folded / No Cards</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="w-full p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          {/* Only show progress bar if NO consent request yet */}
          {!consentRequest && (
            <>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[width_5s_linear_forward]" style={{ width: '100%' }}></div>
              </div>
              <div className="text-center text-xs text-slate-500">Starting next round...</div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

// Helper to render card image
const renderCardImage = (card: any, index: number) => {
  if (!card) return null;
  const assetName = `${card.rank}${card.suit}.png`;
  return (
    <div key={index} className="w-16 h-20 bg-white rounded shadow-sm overflow-hidden border border-slate-300">
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
};

export default ResultOverlay;
