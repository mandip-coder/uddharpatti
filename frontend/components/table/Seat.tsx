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
}

const Seat: React.FC<SeatProps> = ({ player, seatIndex, visualIndex, isMe, isTurn, myBalance, timerProgress = 0, onInvite }) => {
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
    // 0: Bottom, 1: B-Left, 2: T-Left, 3: Top, 4: T-Right, 5: B-Right
    const spreadOffsets = [-15, 0, 15];
    const spread = spreadOffsets[index];

    const seatBaseRotations = [0, -45, -135, 180, 135, 45];
    const finalRotateZ = seatBaseRotations[visualIndex] + spread;

    const seatTilts = [25, 15, -15, -25, -15, 15];

    return (
      <motion.div
        key={index}
        layoutId={`card-${seatIndex}-${index}`}
        initial={{
          x: -100,
          y: -100,
          scale: 0.2,
          rotateZ: 0,
          rotateX: 0,
          opacity: 0
        }}
        animate={{
          x: index * 16 - 16,
          y: 0,
          scale: 1,
          rotateZ: finalRotateZ,
          rotateX: seatTilts[visualIndex],
          opacity: 1
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: index * 0.1
        }}
        style={{ perspective: 1000 }}
        className="absolute w-20 h-28 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.05)] overflow-hidden border border-white/20 bg-slate-900 transform-gpu"
      >
        {player.folded ? (
          <div className="w-full h-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-white/20 font-black text-xl italic mt-2">FOLD</div>
          </div>
        ) : player.isSeen && card ? (
          <motion.div
            initial={{ rotateY: 180 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full bg-white relative"
          >
            <img
              src={`/assets/cards/${card.rank}${card.suit}.png`}
              alt={`${card.rank}${card.suit}`}
              className="w-full h-full object-contain p-1"
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

      {/* Cards Area */}
      <div className="mb-6 relative w-32 h-32 flex items-center justify-center">
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
        </AnimatePresence>
      </div>

      {/* Player Avatar & Status */}
      <div className="relative group">
        {/* Animated Turn Glow */}
        <AnimatePresence>
          {isTurn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-2 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full blur-md opacity-40 animate-pulse"
            />
          )}
        </AnimatePresence>

        {/* Timer Ring */}
        <div className="relative z-10">
          {isTurn && (
            <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] rotate-[-90deg] drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">
              <circle cx="50%" cy="50%" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <motion.circle
                cx="50%" cy="50%" r="38" fill="none"
                animate={{
                  stroke: timerProgress > 50
                    ? "#22c55e" // Green
                    : timerProgress > 23.3
                      ? "#f59e0b" // Yellow/Amber
                      : "#ef4444", // Red
                  strokeDashoffset: 238.7 - (238.7 * timerProgress) / 100
                }}
                transition={{ duration: 0.2, ease: "linear" }}
                strokeWidth="6"
                strokeDasharray="238.7"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Avatar Circle */}
          <div className={`w-20 h-20 rounded-full border-4 overflow-hidden bg-[#1a1a1a] flex items-center justify-center transition-all duration-300 shadow-2xl
              ${isTurn ? 'border-amber-400 scale-105' : 'border-white/10'}
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

          {/* Seen/Blind Badge */}
          {!player.folded && (
            <motion.div
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`absolute -top-1 -right-2 px-2.5 py-1 rounded-lg text-[9px] font-black border shadow-2xl z-20 flex items-center gap-1.5
                  ${player.isSeen ? 'bg-blue-600 border-blue-400' : 'bg-purple-600 border-purple-400'} text-white uppercase tracking-wider
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
          <span className={`text-[10px] font-mono font-bold mt-0.5 ${isTurn ? 'text-black/60' : 'text-amber-400'}`}>
            ₹{player.currentBet}
          </span>
        )}
      </div>

    </div>
  );
};

export default Seat;
