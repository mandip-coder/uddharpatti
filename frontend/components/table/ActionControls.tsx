import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ActionControlsProps {
  currentStake: number;
  walletBalance: number;
  isSeen: boolean;
  onPack: () => void;
  onChaal: (amount: number) => void;
  onShow?: () => void;
  onSideShow?: () => void;
  onSeeCards: () => void;
  canShow: boolean;
  canSideShow: boolean;
  betOptions?: {
    minBet: number;
    maxBet: number;
    chaal: number;
    raise2x?: number;
    raise4x?: number;
  };
}

const ActionControls: React.FC<ActionControlsProps> = ({
  currentStake,
  walletBalance,
  isSeen,
  onPack,
  onChaal,
  onShow,
  onSideShow,
  onSeeCards,
  canShow,
  canSideShow,
  betOptions
}) => {
  const minBet = betOptions?.minBet || currentStake * (isSeen ? 2 : 1);
  const maxBet = betOptions?.maxBet || walletBalance;

  const [betAmount, setBetAmount] = useState(minBet);

  useEffect(() => {
    if (betOptions?.minBet) {
      setBetAmount(betOptions.minBet);
    }
  }, [betOptions, currentStake, isSeen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(Number(e.target.value));
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-6 left-0 right-0 max-w-4xl mx-auto px-6 z-50"
    >
      <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-white/10 rounded-[2rem] p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex items-center justify-between gap-6">

        {/* Left: Utility Actions */}
        <div className="flex items-center gap-3 min-w-[140px]">
          {!isSeen ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSeeCards}
              className="relative overflow-hidden group bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-[10px] font-black px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] uppercase tracking-widest border-t border-white/20"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">👁️ See Cards</span>
            </motion.button>
          ) : (
            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center shadow-inner">
              👁️ Seen
            </div>
          )}

          {canSideShow && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSideShow}
              className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 text-[10px] font-black px-4 py-3 rounded-2xl uppercase tracking-widest transition-all"
            >
              Side Show
            </motion.button>
          )}
        </div>

        {/* Center: Betting Console */}
        <div className="flex-1 px-8 border-x border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <div className="flex gap-2">
              {[2, 4].map(mult => {
                const amt = mult === 2 ? (betOptions?.raise2x || minBet * 2) : (betOptions?.raise4x || minBet * 4);
                const disabled = walletBalance < amt;
                return (
                  <motion.button
                    key={mult}
                    whileHover={!disabled ? { scale: 1.1 } : {}}
                    whileTap={!disabled ? { scale: 0.9 } : {}}
                    onClick={() => setBetAmount(amt)}
                    disabled={disabled}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all
                                ${disabled
                        ? 'bg-white/5 border-white/5 text-white/10'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-400'}
                            `}
                  >
                    {mult}X
                  </motion.button>
                )
              })}
            </div>

            <div className="text-right">
              <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Current Raise</div>
              <div className="text-xl font-mono font-black text-white leading-none">₹{betAmount.toLocaleString()}</div>
            </div>
          </div>

          <div className="relative h-2 flex items-center">
            <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((betAmount - minBet) / (maxBet - minBet)) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              />
            </div>
            <input
              type="range"
              min={minBet}
              max={maxBet}
              step={currentStake}
              value={betAmount}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>

        {/* Right: Primary Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onPack}
            className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
          >
            Pack
          </motion.button>

          {canShow && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShow}
              className="px-8 py-4 bg-gradient-to-t from-amber-600 to-amber-400 text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] rounded-2xl font-black text-sm uppercase tracking-widest border-t border-white/40"
            >
              Show
            </motion.button>
          )}

          <motion.button
            whileHover={walletBalance >= betAmount ? { scale: 1.05, y: -2 } : {}}
            whileTap={walletBalance >= betAmount ? { scale: 0.95 } : {}}
            onClick={() => onChaal(betAmount > minBet ? betAmount : minBet)}
            disabled={walletBalance < (betAmount > minBet ? betAmount : minBet)}
            className={`px-10 py-4 shadow-2xl rounded-2xl font-black text-sm uppercase tracking-[0.2em] border-t border-white/30 transition-all min-w-[160px]
                ${betAmount > minBet
                ? 'bg-gradient-to-t from-sky-600 to-sky-400 text-white shadow-sky-500/30'
                : 'bg-gradient-to-t from-emerald-600 to-emerald-400 text-white shadow-emerald-500/40'}
                ${walletBalance < (betAmount > minBet ? betAmount : minBet) && 'opacity-30 grayscale'}
            `}
          >
            {betAmount > minBet ? `Raise ₹${betAmount}` : `Chaal ₹${minBet}`}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ActionControls;
