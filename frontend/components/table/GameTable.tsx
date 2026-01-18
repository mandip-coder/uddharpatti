"use client";

import React from 'react';
import Seat from './Seat';
import ActionControls from './ActionControls';
import ResultOverlay from './ResultOverlay';
import toast from 'react-hot-toast';

interface GameTableProps {
  gameState: 'WAITING' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  currentTurnIndex: number;
  pot: number;
  players: any[];
  mySeatIndex: number;
  roomId: string;
  isMyTurn: boolean;
  betOptions?: any;
  currentStake: number; // FIX: Added prop
  roundResult?: any; // FIX: Added prop
  onAction: (action: string, amount?: number) => void;
  onExit: () => void; // FIX: Added Exit handler
  onNextRound: () => void;
  turnStartTime?: number;
  turnDuration?: number;
  myUserId?: string; // Added for perspective checks
  // NEW: Consent Flow
  consentRequest?: { timeoutSeconds: number; timestamp: number } | null;
  onConsent?: (consent: boolean) => void;
}

const GameTable: React.FC<GameTableProps> = ({
  gameState,
  currentTurnIndex,
  pot,
  players,
  mySeatIndex,
  roomId,
  isMyTurn,
  betOptions,
  currentStake,
  roundResult,
  onAction,
  onExit,
  onNextRound,
  turnStartTime,
  turnDuration = 30000, // default 30s
  myUserId,
  consentRequest,
  onConsent
}) => {

  // ... (Position logic remains same)
  // Postions for 6-max table (relative to center)
  // We need to rotate these based on mySeatIndex so I am always at bottom (index 0)
  const basePositions = [
    'bottom-0 left-1/2 -translate-x-1/2 translate-y-10',      // 0
    'bottom-16 left-8',                                        // 1
    'top-16 left-8',                                           // 2
    'top-0 left-1/2 -translate-x-1/2 -translate-y-10',        // 3
    'top-16 right-8',                                          // 4
    'bottom-16 right-8',                                       // 5
  ];

  // Helper to get visual position
  const getVisualPosition = (seatIndex: number) => {
    // If Max seats is 6.
    // My visual index should be 0.
    // formula: (seatIndex - mySeatIndex + 6) % 6
    const visualIndex = (seatIndex - mySeatIndex + 6) % 6;
    return basePositions[visualIndex];
  };

  // Timer Logic
  const [timerProgress, setTimerProgress] = React.useState(100);

  React.useEffect(() => {
    if (gameState !== 'PLAYING' || !turnStartTime) {
      setTimerProgress(100);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - turnStartTime;
      const remaining = Math.max(0, turnDuration - elapsed);
      const progress = (remaining / turnDuration) * 100;
      setTimerProgress(progress);
    };

    updateTimer(); // Immediate update
    const interval = setInterval(updateTimer, 100); // 10fps

    return () => clearInterval(interval);
  }, [gameState, turnStartTime, turnDuration]);

  return (
    <div className="relative w-full h-full min-h-[600px] flex items-center justify-center overflow-hidden bg-slate-950 p-4">

      {/* Room Info */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-400">
        Room: <span className="text-emerald-400 font-mono">{roomId}</span>
      </div>

      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-10 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors font-bold"
        title="Exit Game"
      >
        ✕
      </button>

      {/* Table Surface */}
      <div className="relative w-full max-w-4xl aspect-[1.8] bg-slate-800 rounded-[200px] border-[12px] border-slate-900 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] flex items-center justify-center">
        {/* Felt Pattern/Texture */}
        <div className="absolute inset-4 rounded-[180px] bg-slate-800 border-2 border-slate-700/30 opacity-50"></div>

        {/* Logo in center */}
        <div className="opacity-10 font-bold text-4xl tracking-widest text-slate-500 select-none pointer-events-none">
          UDDHAR PATTI
        </div>

        {/* Pot Display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0">
          <div className="bg-slate-900/80 px-4 py-1 rounded-full border border-slate-700 backdrop-blur text-emerald-400 font-mono font-bold text-lg mb-2 shadow-lg">
            Pot: ₹{pot.toLocaleString()}
          </div>
        </div>

        {/* Seats */}
        {/* Seats - Render fixed 6 positions */}
        {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
          // Find player at this seat
          const player = players.find(p => p.seatIndex === seatIndex);
          const isMySeat = seatIndex === mySeatIndex;

          return (
            <div key={seatIndex} className={`absolute ${getVisualPosition(seatIndex)}`}>
              <Seat
                player={player ? {
                  username: player.username,
                  avatarId: player.avatarId,
                  active: player.active,
                  folded: player.folded,
                  isSeen: player.isSeen,
                  currentBet: player.currentBet,
                  hand: player.hand
                } : null}
                seatIndex={seatIndex}
                isMe={isMySeat}
                myBalance={isMySeat ? player?.balance : undefined}
                isTurn={gameState === 'PLAYING' && currentTurnIndex === seatIndex}
                timerProgress={timerProgress}
                onInvite={() => {
                  const inviteLink = `${window.location.origin}/game/${roomId}`;
                  navigator.clipboard.writeText(inviteLink);
                  toast.success(`Room Link Copied!`);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Action Controls */}
      {
        gameState === 'PLAYING' && isMyTurn && (
          <ActionControls
            currentStake={currentStake || 0} // FIX: Use passed prop
            walletBalance={players.find(p => p.seatIndex === mySeatIndex)?.balance || 0}
            isSeen={players.find(p => p.seatIndex === mySeatIndex)?.isSeen || false}
            onPack={() => onAction('pack')}
            onChaal={(amt) => onAction('chaal', amt)}
            onSeeCards={() => onAction('see')}
            onSideShow={() => onAction('sideshow')} // logic for target needed
            onShow={() => onAction('show')}
            canShow={betOptions?.canShow}
            canSideShow={betOptions?.canSideShow}
            betOptions={betOptions} // FIX: Pass full options for Slider
          />
        )
      }

      {/* Round Result Overlay */}
      {
        gameState === 'ROUND_END' && roundResult && (
          <ResultOverlay
            winner={{
              username: roundResult?.winner?.username || 'Winner',
              amount: roundResult?.pot || pot,
              avatarId: roundResult?.winner?.avatarId,
              userId: roundResult?.winner?.userId || 'unknown'
            }}
            reason={roundResult?.reason || 'show'}
            playerHands={roundResult?.playerHands || []}
            actionSourceUserId={roundResult?.actionSourceUserId}
            myUserId={myUserId}
            onNextRound={onNextRound}
            // NEW: Consent Props
            consentRequest={consentRequest}
            onConsent={onConsent}
          />
        )
      }

    </div >
  );
};

export default GameTable;
