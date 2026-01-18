"use client";

import React from 'react';
import { motion } from 'framer-motion';
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
    <div className="relative w-full h-screen flex flex-col bg-[#0a0a0a] font-sans">
      {/* Main table area */}
      <div className="flex-1 relative flex items-center justify-center p-2">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-black to-black opacity-60"></div>

        {/* Room Info */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          <div className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-[8px] uppercase tracking-widest text-slate-400 font-semibold">
            <span className="text-white/50">Room</span>
            <span className="ml-1.5 text-emerald-400 font-mono">{roomId}</span>
          </div>
        </div>

        <button
          onClick={onExit}
          className="absolute top-3 right-3 z-20 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all duration-300 group font-bold text-xs"
          title="Exit Game"
        >
          <span className="">Leave</span>
          ✕
        </button>

        {/* Table Container with Outer Rail shadow */}
        <div className="relative w-full max-w-3xl aspect-[1.9] flex items-center justify-center p-4 bg-[#1a1a1a] rounded-[180px] shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.1)] border-[10px] border-[#2a2a2a]">

          {/* Table Felt Surface */}
          <div className="absolute inset-2 bg-[#0a3d2c] rounded-[160px] shadow-[inset_0_0_120px_rgba(0,0,0,0.6)] border-2 border-[#072d21]">
            {/* Subtle Felt Texture Overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00000022] to-[#00000044]"></div>
          </div>

          {/* Central Deck / Dealer Area */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] z-0 flex flex-col items-center">
            {/* Invisible Deck Source for Animations */}
            <div id="deck-source" className="w-8 h-12 bg-slate-900 rounded-md border border-white/20 shadow-2xl relative">
              <img src="/assets/cards/back.png" alt="Deck" className="w-full h-full object-cover rounded-md opacity-40 shrink-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border border-white/10 animate-ping"></div>
              </div>
            </div>
          </div>

          {/* Logo in center */}
          <div className="relative z-0 opacity-10 font-black text-4xl tracking-[0.2em] text-white select-none pointer-events-none italic uppercase">
            Uddhar Patti
          </div>

          {/* Pot Display - PREMIUM: Larger, always glowing, animated updates */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col items-center z-10">
            <motion.div
              key={pot}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative group"
            >
              {/* PREMIUM: Permanent glow (not just on hover) */}
              <div className="absolute -inset-4 bg-emerald-500/30 rounded-full blur-xl opacity-100" />
              <div className="bg-gradient-to-b from-[#1a1a1a] to-black px-6 py-2 rounded-full border-2 border-emerald-500/40 backdrop-blur-xl text-emerald-400 font-mono font-black text-xl shadow-[0_0_40px_rgba(16,185,129,0.3),0_20px_40px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.1)] flex items-center gap-2">
                <span className="text-emerald-500/50 text-xs">POT</span>
                <span>₹{pot.toLocaleString()}</span>
              </div>
            </motion.div>
          </div>

          {/* Seats */}
          {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
            const player = players.find(p => p.seatIndex === seatIndex);
            const isMySeat = seatIndex === mySeatIndex;

            const visualIndex = (seatIndex - mySeatIndex + 6) % 6;

            return (
              <div key={seatIndex} className={`absolute z-20 ${basePositions[visualIndex]}`}>
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
                  visualIndex={visualIndex}
                  isMe={isMySeat}
                  myBalance={isMySeat ? player?.balance : undefined}
                  isTurn={gameState === 'PLAYING' && currentTurnIndex === seatIndex}
                  timerProgress={timerProgress}
                  onInvite={() => {
                    const inviteLink = `${window.location.origin}/game/${roomId}`;
                    navigator.clipboard.writeText(inviteLink);
                    toast.success(`Room Link Copied!`);
                  }}
                  onSeeCards={isMySeat && gameState === 'PLAYING' && currentTurnIndex === seatIndex ? () => onAction('see') : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls - Now outside table area */}
      {
        gameState === 'PLAYING' && isMyTurn && (
          <ActionControls
            currentStake={currentStake || 0} // FIX: Use passed prop
            walletBalance={players.find(p => p.seatIndex === mySeatIndex)?.balance || 0}
            onPack={() => onAction('pack')}
            onChaal={(amt) => onAction('chaal', amt)}
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

    </div>
  );
};

export default GameTable;
