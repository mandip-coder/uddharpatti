"use client";

import React, { useState, useEffect } from 'react';

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
  // Default bounds if options not yet loaded
  const minBet = betOptions?.minBet || currentStake * (isSeen ? 2 : 1);
  const maxBet = betOptions?.maxBet || walletBalance;

  const [betAmount, setBetAmount] = useState(minBet);

  // Update local slider when options change (e.g. turn start)
  useEffect(() => {
    if (betOptions?.minBet) {
      setBetAmount(betOptions.minBet);
    }
  }, [betOptions, currentStake, isSeen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(Number(e.target.value));
  };

  return (
    <div className="absolute bottom-4 left-0 right-0 max-w-2xl mx-auto px-4">
      {/* Main Control Bar - Compact Design */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-2 shadow-2xl flex items-center justify-between gap-3">

        {/* Left: Utility Actions */}
        <div className="flex flex-col gap-1.5 min-w-[80px]">
          {!isSeen ? (
            <button
              onClick={onSeeCards}
              className="btn bg-slate-700 text-white hover:bg-slate-600 text-[10px] py-1.5 px-3 shadow-md rounded-lg font-bold tracking-wide uppercase transition-colors"
            >
              <span className="mr-1">👁️</span> See
            </button>
          ) : (
            <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-1 rounded text-center border border-emerald-500/20 uppercase tracking-wide">
              Seen
            </div>
          )}

          {canSideShow && (
            <button
              onClick={onSideShow}
              className="btn bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 text-[10px] py-1 px-2 rounded uppercase font-bold tracking-wide transition-colors"
            >
              Side Show
            </button>
          )}
        </div>

        {/* Center: Betting Mobile Console Style */}
        <div className="flex flex-col flex-1 px-2 gap-1 border-x border-slate-700/50">
          {/* Raise Presets & Slider */}
          <div className="flex items-center gap-2 justify-center w-full">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setBetAmount(betOptions?.raise2x || minBet * 2)}
                disabled={walletBalance < (betOptions?.raise2x || minBet * 2)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded border border-emerald-500/30 text-[10px] font-bold transition-all uppercase"
              >
                +2x
              </button>
              <button
                onClick={() => setBetAmount(betOptions?.raise4x || minBet * 4)}
                disabled={walletBalance < (betOptions?.raise4x || minBet * 4)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded border border-emerald-500/30 text-[10px] font-bold transition-all uppercase"
              >
                +4x
              </button>
            </div>

            {/* Slider for Custom Raise */}
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                <span>Raise Amount</span>
                <span className="text-white font-mono">₹{betAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 h-6">
                <button onClick={() => setBetAmount(Math.max(minBet, betAmount - currentStake))} className="text-slate-500 hover:text-white text-xs">-</button>
                <input
                  type="range"
                  min={minBet}
                  max={maxBet}
                  step={currentStake}
                  value={betAmount}
                  onChange={handleSliderChange}
                  className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                />
                <button onClick={() => setBetAmount(Math.min(maxBet, betAmount + currentStake))} className="text-slate-500 hover:text-white text-xs">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPack}
            className="px-3 py-2 bg-red-900/30 text-red-300 border border-red-800/50 rounded-lg hover:bg-red-900/50 font-bold text-xs uppercase tracking-wide transition-all"
          >
            Pack
          </button>

          {canShow && (
            <button
              onClick={onShow}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg shadow-lg font-bold hover:bg-amber-500 border-t border-amber-400 text-sm uppercase tracking-wide transition-all hover:-translate-y-0.5"
            >
              Show
            </button>
          )}

          {/* Logic: If Slider > MinBet, it's a RAISE button. Else it's CHAAL */}
          {betAmount > minBet ? (
            <button
              onClick={() => onChaal(betAmount)}
              disabled={walletBalance < betAmount}
              className="px-5 py-2 bg-sky-600 text-white rounded-lg shadow-lg font-bold hover:bg-sky-500 border-t border-sky-400 min-w-[90px] text-sm uppercase tracking-wide transition-all hover:-translate-y-0.5"
            >
              Raise ₹{betAmount}
            </button>
          ) : (
            <button
              // Strict Chaal: Always execute minBet regardless of slider if button says Chaal
              onClick={() => onChaal(minBet)}
              disabled={walletBalance < minBet}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg shadow-lg font-bold hover:bg-emerald-500 border-t border-emerald-400 min-w-[90px] text-sm uppercase tracking-wide transition-all hover:-translate-y-0.5"
            >
              Chaal ₹{minBet}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ActionControls;
