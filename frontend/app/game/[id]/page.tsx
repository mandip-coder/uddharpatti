'use client';

import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import GameTable from '@/components/table/GameTable';
import SideShowModal from '@/components/table/SideShowModal';

export default function GamePage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();

  // Use Socket Hook
  const {
    isConnected,
    connectError,
    isReconnecting,
    players,
    gameState,
    myHand, // FIX: get myHand from hook
    myBalance,
    betOptions,
    placeBet,
    fold,
    seeCards,
    show,
    requestSideShow,
    getBetOptions,
    sideShowRequest,
    respondToSideShow,
    exitGame,
    consentRequest, // Add this
    respondToConsent // Add this
  } = useSocket(roomId);



  const isMyTurn = gameState?.currentTurn === user?.id;
  const myPlayer = players.find(p => p.userId === user?.id);
  const mySeatIndex = myPlayer?.seatIndex ?? 0;

  // DEBUG: Log state changes
  useEffect(() => {
    console.log('[GAME_PAGE] State Update:', {
      isConnected,
      hasGameState: !!gameState,
      gameStatus: gameState?.status,
      playersCount: players.length,
      isReconnecting,
      connectError
    });
  }, [isConnected, gameState, players, isReconnecting, connectError]);

  // Turn Notification
  useEffect(() => {
    if (isMyTurn && gameState?.status === 'PLAYING') {
      getBetOptions();
    }
  }, [isMyTurn, gameState?.status]);


  if (isAuthLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div></div>;
  if (!user) { router.push('/login'); return null; }

  // DEFENSIVE RENDERING: Connection Error
  if (connectError) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Connection Failed</h2>
          <p className="text-slate-400 mb-6">{connectError}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // DEFENSIVE RENDERING: Loading State (waiting for first game_update)
  // Only show loading if we don't have gameState yet
  if (!gameState) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500 mx-auto mb-6"></div>
          <p className="text-slate-300 text-xl font-bold mb-2">
            {isReconnecting ? 'Reconnecting to game...' : 'Connecting to game...'}
          </p>
          <p className="text-slate-500 text-sm">Room: <span className="text-emerald-400 font-mono">{roomId}</span></p>
        </div>
      </div>
    );
  }

  // DEFENSIVE RENDERING: Waiting for Players
  // Show if game is WAITING and we don't have enough players to start
  if (gameState.status === 'WAITING' && players.length < 2) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🎴</div>
          <h2 className="text-2xl font-bold text-slate-200 mb-3">Waiting for Players</h2>
          <p className="text-slate-400 mb-4">
            {players.length === 0
              ? 'Share this room code with friends to join:'
              : `${players.length}/2 players joined. Waiting for one more...`}
          </p>
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg px-6 py-4 mb-6">
            <p className="text-emerald-400 font-mono text-2xl font-bold tracking-wider mb-2">{roomId}</p>
            <div className="text-xs text-slate-500 border-t border-slate-700 pt-2 mt-2">
              <p>Your Identity:</p>
              <p className="font-mono text-slate-300">{user?.username}</p>
              <p className="font-mono text-slate-600 text-[10px]">{user?.id}</p>
            </div>
          </div>
          {players.length > 0 && (
            <div className="mb-6">
              <p className="text-slate-500 text-sm mb-2">Players in room:</p>
              <div className="flex justify-center gap-2">
                {players.map((p, i) => (
                  <div key={i} className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-300">
                    {p.username}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Exit Room
          </button>
        </div>
      </div>
    );
  }

  // Map backend players to UI players
  const uiPlayers = players.map(p => ({
    username: p.username,
    balance: p.userId === user?.id ? myBalance : 0, // Hide opponent balance
    avatarId: p.avatarId,
    active: p.active,        // FIX: was isActive
    folded: p.folded,        // FIX: was isFolded
    seatIndex: p.seatIndex,
    isSeen: p.isSeen,
    currentBet: p.currentBet || 0,
    // FIX: Pass hand data ONLY for me
    hand: p.userId === user?.id ? myHand : undefined
  }));

  // Handle Actions
  const handleAction = (action: string, amount?: number) => {
    switch (action) {
      case 'pack': fold(); break;
      case 'chaal': if (amount) placeBet(amount); break;
      case 'see': seeCards(); break;
      case 'show': show(); break;
      case 'sideshow':
        if (betOptions?.sideShowTarget) requestSideShow(betOptions.sideShowTarget);
        break;
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950">
      <Toaster position="top-center" />

      {/* Side Show Request Modal - CRITICAL FIX */}
      <SideShowModal
        isOpen={!!sideShowRequest}
        requesterName={sideShowRequest?.fromUsername || 'Opponent'}
        onAccept={() => {
          respondToSideShow(true);
        }}
        onDecline={() => {
          respondToSideShow(false);
        }}
      />

      <GameTable
        roomId={roomId}
        gameState={gameState?.status as any} // Map status string
        currentTurnIndex={players.find(p => p.userId === gameState?.currentTurn)?.seatIndex ?? 0}
        pot={gameState?.pot || 0}
        players={uiPlayers}
        mySeatIndex={mySeatIndex}
        isMyTurn={isMyTurn}
        betOptions={betOptions}
        currentStake={gameState?.currentStake || 0} // FIX: Pass currentStake
        roundResult={gameState?.roundResult} // FIX: Pass roundResult
        onAction={handleAction}
        onExit={exitGame} // FIX: Pass exit handler
        onNextRound={() => { }} // Auto handled by backend
        turnStartTime={gameState?.turnStartTime}
        turnDuration={gameState?.turnDuration}
        myUserId={user?.id}
        // NEW: Consent Flow
        consentRequest={consentRequest}
        onConsent={respondToConsent}
      />
    </div>
  );
}
