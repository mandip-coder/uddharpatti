import { motion, AnimatePresence } from 'framer-motion';

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
  } | null;
  seatIndex: number;
  visualIndex: number;
  isMe: boolean;
  isTurn: boolean;
  myBalance?: number;
  timerProgress?: number;
  onInvite?: () => void;
  onSeeCards?: () => void;
}

const Seat: React.FC<SeatProps> = ({ player, seatIndex, visualIndex, isMe, isTurn, myBalance, timerProgress = 0, onInvite, onSeeCards }) => {
  if (!player) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onInvite}
        className="flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-all cursor-pointer group"
      >
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300 shadow-inner">
          <svg className="w-8 h-8 text-white/20 group-hover:text-emerald-400 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </div>
        <span className="mt-3 text-[10px] text-white/40 font-bold tracking-widest uppercase group-hover:text-emerald-400">Invite</span>
      </motion.div>
    );
  }

  const renderCard = (index: number, card?: { suit: string; rank: string }) => {
    // POLISH: Cards positioned beside seat, NO rotation, clean and straight
    const spreadOffsets = [-20, 0, 20]; // Increased spacing for better visibility
    const spread = spreadOffsets[index];

    // POLISH: NO rotation - all cards straight and clean
    const finalRotateZ = 0;
    const finalRotateX = 0;

    // POLISH: Reduced size for better balance - w-20 h-28 (80x112px)
    const cardSize = 'w-26 h-28';

    return (
      <motion.div
        key={`card-${seatIndex}-${index}-${card?.rank}${card?.suit}`}
        initial={false}
        animate={{
          x: index * 30 - 30, // Increased spacing for better underlayer card visibility
          y: 0,
          scale: 1,
          rotateZ: finalRotateZ,
          rotateX: finalRotateX,
          opacity: 1
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 25,
          mass: 1.2
        }}
        style={{ perspective: 1000 }}
        className={`absolute ${cardSize} rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_0_2px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden border-2 border-white/15 bg-slate-900 transform-gpu`}
      >
        {player.folded ? (
          <div className="w-full h-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-white/20 font-black text-xl italic mt-2">FOLD</div>
          </div>
        ) : player.isSeen && card ? (
          <motion.div
            initial={false}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full bg-white relative"
          >
            <img
              src={`/assets/cards/${card.rank}${card.suit}.png`}
              alt={`${card.rank}${card.suit}`}
              className="w-full h-full object-contain"
            />
          </motion.div>
        ) : (
          <img src="/assets/cards/back.png" alt="Card Back" className="w-full h-full object-cover" />
        )}
      </motion.div>
    );
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${player.folded ? 'opacity-60 grayscale' : ''}`}>

      {/* Cards Area - POLISH: Positioned beside seat, not above */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-28 h-28 flex items-center justify-center">
        <AnimatePresence>
          {!player.folded && [0, 1, 2].map(i => renderCard(i, player.hand ? player.hand[i] : undefined))}
          {player.folded && (
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 10 }}
              exit={{ opacity: 0, y: 50 }}
              className="z-50 text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-lg border border-red-400/50 uppercase tracking-tighter"
            >
              Folded
            </motion.div>
          )}

          {/* See Cards Button - Only show for current player when not seen and it's their turn */}
          {isMe && !player.isSeen && !player.folded && isTurn && onSeeCards && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSeeCards}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.5)] uppercase tracking-widest border border-white/20 whitespace-nowrap"
            >
              👁️ See Cards
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Player Avatar & Status */}
      <div className="relative group">
        {/* POLISH: Subtle turn indicator - soft, not aggressive */}
        <AnimatePresence>
          {isTurn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-2 bg-amber-400/20 rounded-full blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Timer Ring - DO NOT TOUCH (per user request) */}
        <div className="relative z-10">
          {isTurn && (
            <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg] drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]">
              <circle cx="50%" cy="50%" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <motion.circle
                cx="50%" cy="50%" r="50" fill="none"
                animate={{
                  stroke: timerProgress > 66.7
                    ? "#22c55e" // Green (safe)
                    : timerProgress > 33.3
                      ? "#f59e0b" // Amber (warning)
                      : "#ef4444", // Red (danger)
                  strokeDashoffset: 314.16 - (314.16 * timerProgress) / 100
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                strokeWidth="10"
                strokeDasharray="314.16"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Avatar Circle - PREMIUM: Larger (88x88px), thicker borders */}
          <div className={`w-22 h-22 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center transition-all duration-300 shadow-2xl
              ${isTurn ? 'border-[5px] border-amber-400 scale-105 shadow-[0_0_0_3px_rgba(245,158,11,0.3)]' : 'border-[3px] border-white/15'}
              ${player.folded ? 'opacity-40' : 'opacity-100'}
            `}>
            {player.avatarId ? (
              <img src={`/assets/avatars/${player.avatarId}.png`} alt={player.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-2xl font-black text-white/50">
                {player.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Seen/Blind Badge - PREMIUM: Larger, bolder, stronger shadows - Hidden for current user */}
          {!player.folded && !isMe && (
            <motion.div
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`absolute -top-1 -right-2 px-3 py-2 rounded-lg text-[11px] font-black border-2 shadow-2xl z-20 flex items-center gap-1.5 tracking-wider
                  ${player.isSeen
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.5)]'
                  : 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.5)]'} text-white uppercase
                `}
            >
              {player.isSeen ? (
                <><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Seen</>
              ) : (
                <><span className="w-1.5 h-1.5 bg-white/50 rounded-full" /> Blind</>
              )}
            </motion.div>
          )}

          {/* Dealer Chip */}
          {player.isDealer && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-slate-300 shadow-lg flex items-center justify-center z-30 overflow-hidden"
            >
              <div className="w-full h-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-900">DEALER</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Player Label */}
      <div className={`mt-4 z-20 px-4 py-1.5 rounded-xl border flex flex-col items-center min-w-[100px] shadow-xl backdrop-blur-md transition-all duration-300
        ${isTurn ? 'bg-amber-500 border-amber-400 text-black' : 'bg-black/60 border-white/10 text-white/80'}
      `}>
        <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[90px]">{player.username}</span>

        {isMe && myBalance !== undefined && (
          <span className={`text-[10px] font-mono font-bold mt-0.5 ${isTurn ? 'text-black/60' : 'text-emerald-400'}`}>
            ₹{myBalance.toLocaleString()}
          </span>
        )}

        {!isMe && player.currentBet > 0 && (
          <span className={`text-sm font-extrabold mt-0.5 bg-black/60 px-3 py-1.5 rounded-xl border ${isTurn ? 'text-black/60 border-black/20' : 'text-amber-400 border-amber-400/30'}`}>
            ₹{player.currentBet}
          </span>
        )}
      </div>

    </div>
  );
};

export default Seat;
