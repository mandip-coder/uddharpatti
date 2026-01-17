'use client';

import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface BetControlsProps {
  isMyTurn: boolean;
  gameStatus: string;
  betOptions: {
    chaal: number;
    raise2x: number;
    raise4x: number;
    canShow: boolean;
    showCost?: number;
    canSideShow: boolean;
    sideShowTarget?: string;
    allIn?: number;
  } | null;
  isBetting: boolean;
  isBlind: boolean;
  onPlaceBet: (amount: number) => void;
  onFold: () => void;
  onSeeCards: () => void;
  onShow: () => void;
  onSideShow: () => void;
}

export function BetControls({
  isMyTurn,
  gameStatus,
  betOptions,
  isBetting,
  isBlind,
  onPlaceBet,
  onFold,
  onSeeCards,
  onShow,
  onSideShow
}: BetControlsProps) {
  const [showFoldConfirm, setShowFoldConfirm] = useState(false);

  if (gameStatus !== 'PLAYING') {
    return (
      <div className="text-slate-500 text-sm">
        Game setup in progress...
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="text-slate-400 text-sm animate-pulse">
        Waiting for opponent&apos;s move...
      </div>
    );
  }

  if (!betOptions) {
    return (
      <div className="text-slate-400 text-sm">
        Loading options...
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-center flex-wrap justify-center">
      {/* Fold Button - Always visible on turn */}
      {!showFoldConfirm ? (
        <Button
          variant="danger"
          onClick={() => setShowFoldConfirm(true)}
          disabled={isBetting}
          className="w-24"
        >
          Fold
        </Button>
      ) : (
        <div className="flex gap-2 items-center bg-red-900/30 px-3 py-2 rounded border border-red-500/50">
          <span className="text-red-400 text-sm">Confirm?</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onFold();
              setShowFoldConfirm(false);
            }}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFoldConfirm(false)}
          >
            No
          </Button>
        </div>
      )}

      <div className="h-8 w-px bg-slate-700"></div>

      {/* See Cards Button - Only for blind players */}
      {isBlind && (
        <>
          <Button
            variant="primary"
            onClick={onSeeCards}
            disabled={isBetting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            👁️ See Cards
          </Button>
          <div className="h-8 w-px bg-slate-700"></div>
        </>
      )}

      {/* Betting Options */}
      <div className="flex gap-2 items-center">
        {/* Chaal (Normal Bet) */}
        <Button
          variant="secondary"
          onClick={() => onPlaceBet(betOptions.chaal)}
          disabled={isBetting || betOptions.chaal <= 0}
          className="min-w-[80px]"
        >
          {isBetting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>Chaal ₹{betOptions.chaal}</>
          )}
        </Button>

        {/* Raise 2x */}
        <Button
          variant="secondary"
          onClick={() => onPlaceBet(betOptions.raise2x)}
          disabled={isBetting || betOptions.raise2x <= 0}
          className="min-w-[80px] bg-orange-600 hover:bg-orange-700"
        >
          {isBetting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>Raise 2x ₹{betOptions.raise2x}</>
          )}
        </Button>

        {/* Raise 4x */}
        <Button
          variant="secondary"
          onClick={() => onPlaceBet(betOptions.raise4x)}
          disabled={isBetting || betOptions.raise4x <= 0}
          className="min-w-[80px] bg-red-600 hover:bg-red-700"
        >
          {isBetting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>Raise 4x ₹{betOptions.raise4x}</>
          )}
        </Button>

        {/* All In - Only if player can't afford minimum */}
        {betOptions.allIn && betOptions.allIn < betOptions.chaal && (
          <Button
            variant="danger"
            onClick={() => onPlaceBet(betOptions.allIn!)}
            disabled={isBetting}
            className="min-w-[80px] animate-pulse"
          >
            All In ₹{betOptions.allIn}
          </Button>
        )}
      </div>

      {/* Show Button - Only when eligible */}
      {betOptions.canShow && (
        <>
          <div className="h-8 w-px bg-slate-700"></div>
          <Button
            variant="primary"
            onClick={onShow}
            disabled={isBetting}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            🃏 Show ₹{betOptions.showCost}
          </Button>
        </>
      )}

      {/* Side Show Button - Only when eligible */}
      {betOptions.canSideShow && (
        <>
          <div className="h-8 w-px bg-slate-700"></div>
          <Button
            variant="primary"
            onClick={onSideShow}
            disabled={isBetting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            🤝 Side Show
          </Button>
        </>
      )}
    </div>
  );
}
