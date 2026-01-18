import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultOverlayProps {
  winner: {
    username: string;
    avatarId?: string;
    amount: number;
    userId: string;
  };
  reason: string;
  actionSourceUserId?: string;
  myUserId?: string;
  playerHands: Array<{
    userId: string;
    username: string;
    avatarId: string;
    hand: any[];
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
  consentRequest,
  onConsent
}) => {
  const [hasResponded, setHasResponded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (consentRequest) {
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
        if (actionSourceUserId === myUserId) return 'You Folded';
        return `${playerHands.find(p => p.userId === actionSourceUserId)?.username || 'Opponent'} Folded`;
      case 'player_exit':
        if (actionSourceUserId === myUserId) return 'You Left';
        return `${playerHands.find(p => p.userId === actionSourceUserId)?.username || 'Opponent'} Left`;
      case 'disconnect_timeout': return 'Opponent Disconnected';
      default: return 'Winner';
    }
  }

  const renderCard = (card: any, index: number) => {
    if (!card) return null;
    return (
      <motion.div
        key={index}
        initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
        className="w-16 h-24 bg-white rounded-md shadow-[0_8px_20px_rgba(0,0,0,0.4)] border-2 border-slate-200 overflow-hidden relative"
      >
        <img
          src={`/assets/cards/${card.rank}${card.suit}.png`}
          alt={`${card.rank}${card.suit}`}
          className="w-full h-full object-contain p-0.5"
        />
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 overflow-hidden"
      >
        {/* Ambient Lights */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          className="w-full max-w-4xl max-h-[90vh] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col items-center overflow-hidden relative"
        >
          {/* Winner Section */}
          <div className="w-full bg-gradient-to-b from-white/5 to-transparent p-4 flex flex-col items-center relative gap-2">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-emerald-400 font-black tracking-[0.3em] text-[9px] uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
            >
              Round Victory
            </motion.div>

            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-amber-500/60 rounded-full blur-[60px] animate-pulse" />
              <div className="relative w-20 h-20 rounded-full border-[4px] border-amber-400 p-1 bg-black shadow-[0_0_60px_rgba(245,158,11,0.6),0_0_120px_rgba(245,158,11,0.3)]">
                {winner.avatarId ? (
                  <img src={`/assets/avatars/${winner.avatarId}.png`} alt={winner.username} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-400">
                    {winner.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>

            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter drop-shadow-2xl">
              {winner.username}
            </h2>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white px-6 py-2 rounded-xl font-mono text-2xl font-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-t border-white/40"
            >
              ₹{winner.amount.toLocaleString()}
            </motion.div>

            <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{getReasonText(reason)}</div>
          </div>

          {/* Player Recap */}
          <div className="flex-1 w-full bg-[#0a0a0a] p-3 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[280px]">
              {playerHands.map((player) => (
                <motion.div
                  key={player.userId}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`relative flex items-center p-3 rounded-xl border transition-all
                    ${player.isWinner ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 opacity-80'}
                  `}>

                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-black mr-3 border border-white/10 shrink-0">
                    {player.avatarId ? (
                      <img src={`/assets/avatars/${player.avatarId}.png`} alt={player.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-sm">
                        {player.username.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-black text-white uppercase text-xs tracking-wide truncate pr-2">{player.username}</div>
                      {player.handName && (
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest
                                ${player.isWinner ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'}
                            `}>
                          {player.handName}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {player.hand && player.hand.length > 0 ? (
                        player.hand.map((card, idx) => renderCard(card, idx))
                      ) : (
                        <span className="text-white/10 text-[9px] uppercase font-black tracking-widest italic pt-2">Folded / Out</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer / Control */}
          <div className="w-full p-4 bg-black/60 border-t border-white/5 flex items-center justify-center">
            {consentRequest ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-md">
                <div className="flex gap-2 w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleConsent(true)}
                    disabled={hasResponded}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all
                                ${hasResponded ? 'bg-white/5 text-white/20' : 'bg-white text-black hover:bg-emerald-400'}
                            `}
                  >
                    {hasResponded ? 'Locked In' : 'Continue'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleConsent(false)}
                    disabled={hasResponded}
                    className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-xs"
                  >
                    Quit
                  </motion.button>
                </div>

                <div className="w-full flex items-center gap-2">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Round</div>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(timeLeft / consentRequest.timeoutSeconds) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                  <div className="font-mono text-emerald-400 font-black text-sm">{timeLeft}s</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 group">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Preparing next deal...</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResultOverlay;

