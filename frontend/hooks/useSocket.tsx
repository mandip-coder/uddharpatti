"use client";

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './useAuthStore';
import { useNotificationStore } from './useNotificationStore';
import { useSocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';

export const useSocket = (roomId?: string) => {
  const { socket, isConnected, isReconnecting, connectError } = useSocketContext();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState<number>(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [matchResult, setMatchResult] = useState<{ roomId: string } | null>(null);
  const [tableTypes, setTableTypes] = useState<any[]>([]);
  const [betOptions, setBetOptions] = useState<any>(null);
  const [isBetting, setIsBetting] = useState(false);
  const [sideShowRequest, setSideShowRequest] = useState<{ from: string; fromUsername: string } | null>(null);
  const [consentRequest, setConsentRequest] = useState<{ timeoutSeconds: number; timestamp: number } | null>(null);

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !isConnected || !user) {
      if (!isConnected) {
        hasJoinedRef.current = false;
      }
      return;
    }

    // 1. JOIN LOGIC
    if (roomId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      console.log('[useSocket] Joining room:', roomId, 'User:', user.username);

      socket.emit('join_chat', roomId);
      socket.emit('join_game', {
        roomId,
        userId: user.id,
        username: user.username,
        balance: Number(user.walletBalance || 0),
        avatarId: user.avatarId || 'avatar_1'
      });
    }

    // 2. GAME LISTENERS
    const onGameUpdate = (data: any) => {
      console.log('[useSocket] game_update:', data);
      setGameState({
        roomId: data.roomId,
        status: data.gameState,
        pot: data.pot,
        currentTurn: data.currentTurnPlayerId,
        turnStartTime: data.turnStartTime,
        turnDuration: data.turnDuration,
        currentStake: data.currentStake,
        roundResult: data.roundResult,
        players: data.players
      });
      setPlayers(data.players);
    };

    const onGameStateRestored = (data: any) => {
      console.log('[useSocket] game_state_restored:', data);
      setGameState({
        roomId: data.roomId,
        status: data.gameState,
        pot: data.pot,
        currentTurn: data.currentTurn,
        turnStartTime: data.turnStartTime,
        turnDuration: data.turnDuration,
        currentStake: data.currentStake,
        roundResult: data.roundResult,
        players: data.players
      });
      setPlayers(data.players);

      // Also update balance if available in players list
      const me = data.players.find((p: any) => p.userId === user.id);
      if (me) {
        // Note: Full state might not have balance for opponents, but for 'me' it should be consistent
        // However, backend sends 'your_balance' separately, which is better.
      }
    };

    const onYourCards = (cards: any[]) => {
      console.log('[useSocket] your_cards:', cards);
      setMyHand(cards);
    };

    const onYourBalance = (balance: number) => {
      setMyBalance(balance);
    };

    const onRoundResult = (data: any) => {
      setGameState((prev: any) => ({ ...prev, status: 'ROUND_END', roundResult: data }));
      const isWinner = data.winner.userId === user.id;
      toast(isWinner ? '🎉 You won the round!' : `${data.winner.username} won!`, { duration: 4000 });
    };

    const onNextRoundStart = (data: any) => {
      setGameState({
        status: 'PLAYING',
        pot: data.pot,
        currentTurn: data.currentTurn,
        turnStartTime: data.turnStartTime,
        turnDuration: data.turnDuration,
        currentStake: data.currentStake,
        raiseCount: data.raiseCount,
        roundResult: null
      });
      setPlayers(data.players);
      setConsentRequest(null);
    };

    const onNextRoundConsentRequest = (data: any) => {
      setConsentRequest(data);
      toast('Next round starting soon...', { icon: '⏳' });
    };

    const onSideShowRequest = (data: any) => {
      setSideShowRequest({ from: data.from, fromUsername: data.fromUsername });
      toast(`Side Show requested by ${data.fromUsername}`, { icon: '🤝' });
    };

    const onSideShowResult = (data: any) => {
      toast(`${data.winnerName} won the Side Show!`, { icon: data.winnerId === user.id ? '✅' : '🤝' });
    };

    const onShowResult = (data: any) => {
      toast(`${data.winnerName} won the Showdown with ${data.handName}!`, { icon: '🏆' });
    };

    const onPlayerRemoved = (data: any) => {
      if (data.reason === 'insufficient_balance') {
        toast.error('You were removed: Insufficient Balance');
        window.location.href = '/dashboard';
      }
    };

    const onReceiveMessage = (msg: any) => {
      setMessages((prev: any) => [...prev, msg]);
    };

    const onGameNotification = (data: any) => {
      toast(data.message);
      addNotification({
        title: 'Game Alert',
        message: data.message,
        type: 'info'
      });
    };

    const onBetOptions = (options: any) => setBetOptions(options);
    const onBetAccepted = (data: any) => {
      setIsBetting(false);
      toast.success(`Bet placed: ₹${data.amount}`);
      setMyBalance(data.newBalance);
    };
    const onBetRejected = (data: any) => {
      setIsBetting(false);
      toast.error(data.reason);
    };

    const onMatchFound = (data: any) => setMatchResult(data);
    const onTableTypes = (types: any[]) => setTableTypes(types);
    const onMatchError = (err: any) => toast.error(err.message);
    const onJoinRejected = (data: any) => toast.error(data.reason || 'Cannot join');

    // Register all
    socket.on('game_update', onGameUpdate);
    socket.on('game_state_restored', onGameStateRestored);
    socket.on('your_cards', onYourCards);
    socket.on('your_balance', onYourBalance);
    socket.on('round_result', onRoundResult);
    socket.on('next_round_start', onNextRoundStart);
    socket.on('next_round_consent_request', onNextRoundConsentRequest);
    socket.on('side_show_request', onSideShowRequest);
    socket.on('side_show_result', onSideShowResult);
    socket.on('show_result', onShowResult);
    socket.on('player_removed', onPlayerRemoved);
    socket.on('receive_message', onReceiveMessage);
    socket.on('game_notification', onGameNotification);
    socket.on('bet_options', onBetOptions);
    socket.on('bet_accepted', onBetAccepted);
    socket.on('bet_rejected', onBetRejected);
    socket.on('match_found', onMatchFound);
    socket.on('table_types', onTableTypes);
    socket.on('match_error', onMatchError);
    socket.on('join_rejected', onJoinRejected);

    return () => {
      socket.off('game_update', onGameUpdate);
      socket.off('game_state_restored', onGameStateRestored);
      socket.off('your_cards', onYourCards);
      socket.off('your_balance', onYourBalance);
      socket.off('round_result', onRoundResult);
      socket.off('next_round_start', onNextRoundStart);
      socket.off('next_round_consent_request', onNextRoundConsentRequest);
      socket.off('side_show_request', onSideShowRequest);
      socket.off('side_show_result', onSideShowResult);
      socket.off('show_result', onShowResult);
      socket.off('player_removed', onPlayerRemoved);
      socket.off('receive_message', onReceiveMessage);
      socket.off('game_notification', onGameNotification);
      socket.off('bet_options', onBetOptions);
      socket.off('bet_accepted', onBetAccepted);
      socket.off('bet_rejected', onBetRejected);
      socket.off('match_found', onMatchFound);
      socket.off('table_types', onTableTypes);
      socket.off('match_error', onMatchError);
      socket.off('join_rejected', onJoinRejected);
    };
  }, [socket, isConnected, roomId, user?.id]);

  // EMITTERS
  const findMatch = (typeId: string) => socket?.emit('find_match', { typeId, userId: user?.id });
  const getTableTypes = () => socket?.emit('get_table_types');
  const sendInvite = (targetUserId: string) => roomId && socket?.emit('send_game_invite', { roomId, targetUserId });
  const startGame = () => socket?.emit('start_game', { roomId });

  const placeBet = (amount: number) => {
    setIsBetting(true);
    socket?.emit('place_bet', { roomId, amount });
    setTimeout(() => setIsBetting(false), 3000);
  };

  const getBetOptions = () => socket?.emit('get_bet_options', { roomId });
  const seeCards = () => socket?.emit('see_cards', { roomId });
  const fold = () => socket?.emit('fold', { roomId });
  const show = () => socket?.emit('show', { roomId });
  const requestSideShow = (targetId: string) => socket?.emit('request_side_show', { roomId, targetId });

  const respondToSideShow = (accept: boolean) => {
    socket?.emit('respond_side_show', { roomId, accept });
    setSideShowRequest(null);
  };

  const respondToConsent = (consent: boolean) => socket?.emit('next_round_consent', { roomId, consent });
  const sendMessage = (text: string) => socket?.emit('send_message', { roomId, message: text, sender: user?.username });
  const exitGame = () => socket?.emit('exit_game', { roomId, userId: user?.id });

  return {
    isConnected,
    isReconnecting,
    connectError,
    players,
    gameState,
    myHand,
    myBalance,
    messages,
    startGame,
    placeBet,
    fold,
    sendMessage,
    exitGame,
    findMatch,
    matchResult,
    getTableTypes,
    tableTypes,
    sendInvite,
    betOptions,
    isBetting,
    getBetOptions,
    seeCards,
    show,
    requestSideShow,
    sideShowRequest, // CRITICAL: This is what SideShowModal uses
    respondToSideShow,
    consentRequest,
    respondToConsent
  };
};
