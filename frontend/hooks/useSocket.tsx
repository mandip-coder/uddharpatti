import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import { useNotificationStore } from './useNotificationStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const useSocket = (roomId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const { user, token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState<number>(0); // RULE 1: Track own balance separately
  const [messages, setMessages] = useState<any[]>([]);
  const [matchResult, setMatchResult] = useState<{ roomId: string } | null>(null);
  const [tableTypes, setTableTypes] = useState<any[]>([]);
  const [betOptions, setBetOptions] = useState<any>(null); // Dynamic bet options
  const [isBetting, setIsBetting] = useState(false); // Loading state for bets
  const hasJoinedRef = useRef(false); // Prevent duplicate joins
  const { addNotification } = useNotificationStore();
  // CRITICAL FIX: Side Show State
  const [sideShowRequest, setSideShowRequest] = useState<{ from: string; fromUsername: string } | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    // RoomId is now optional for Lobby connection

    // DISABLED: Reconnection detection causing issues
    // Check if this is a reconnection (page refresh)
    // if (typeof window !== 'undefined') {
    //   const savedRoom = sessionStorage.getItem('currentRoom');
    //   const savedUserId = sessionStorage.getItem('currentUserId');

    //   if (savedRoom === roomId && savedUserId === user.id) {
    //     setIsReconnecting(true);
    //     console.log('Detected page refresh - attempting reconnection');
    //   }

    //   // Save current session
    //   if (roomId) {
    //     sessionStorage.setItem('currentRoom', roomId);
    //   }
    //   sessionStorage.setItem('currentUserId', user.id);
    // }

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    const socket = socketRef.current;

    // Connection Timeout Logic
    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        setConnectError('Connection timed out. Check your internet or server status.');
      }
    }, 10000); // 10s strict timeout

    socket.on('connect', () => {
      clearTimeout(connectionTimeout); // Clear timeout on success
      setIsConnected(true);
      setConnectError(null);
      console.log('Connected to socket', socket.id);

      // DEBUG: Check join conditions
      console.log('[DEBUG] roomId:', roomId, 'hasJoinedRef.current:', hasJoinedRef.current, 'user:', user?.username);

      // Only join once to prevent duplicate joins
      if (roomId && !hasJoinedRef.current) {
        hasJoinedRef.current = true;

        console.log('[JOIN_GAME] Attempting to join room:', roomId, 'User:', user);




        // TEST: Emit join_chat FIRST to verify socket works
        socket.emit('join_chat', roomId);
        console.log('[JOIN_GAME] Emitted join_chat event');

        const payload = {
          roomId,
          userId: user.id,
          username: user.username,
          balance: Number(user.walletBalance || 0), // Force number conversion
          avatarId: user.avatarId || 'avatar_1'
        };

        console.log('[JOIN_GAME] Emitting payload:', payload);

        // Join Room with Try-Catch
        try {
          socket.emit('join_game', payload);
          console.log('[JOIN_GAME] Emitted join_game event');
        } catch (err) {
          console.error('[JOIN_GAME] EMIT FAILED:', err);
        }
      } else {
        console.log('[JOIN_GAME] Skipped - roomId:', roomId, 'hasJoinedRef:', hasJoinedRef.current);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      hasJoinedRef.current = false; // Reset join flag on disconnect
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      // Only set error if not already connected (avoid flickering on minor re-connects)
      if (!socket.connected) {
        setConnectError(err.message || 'Connection failed');
      }
    });

    // RECONNECTION: Full game state restored
    socket.on('game_state_restored', (data) => {
      console.log('Game state restored:', data);
      setIsReconnecting(false);
      setPlayers(data.players);
      setGameState({
        status: data.gameState,
        pot: data.pot,
        currentTurn: data.currentTurn,
        turnStartTime: data.turnStartTime,
        turnDuration: data.turnDuration,
        currentStake: data.currentStake,
        raiseCount: data.raiseCount
      });
      toast.success('Reconnected to game!', { duration: 2000 });
    });

    // Player reconnected notification
    socket.on('player_reconnected', (data) => {
      if (data.userId !== user.id) {
        toast(`${data.username} reconnected`, { icon: '🔄', duration: 2000 });
      }
    });

    // Player connection lost (grace period started)
    socket.on('player_connection_lost', (data) => {
      if (data.userId !== user.id) {
        toast(`${data.username} lost connection. Waiting ${data.gracePeriod / 1000}s...`, {
          icon: '⚠️',
          duration: data.gracePeriod
        });
      }
    });

    // Player removed (Grace period or Insufficient Balance)
    socket.on('player_removed', (data) => {
      // RULE 1: Strict Removal for Low Balance
      if (data.reason === 'insufficient_balance') {
        toast.error('You were removed: Insufficient Balance', {
          duration: 5000,
          position: 'top-center',
          icon: '🚫'
        });

        // Force redirect
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('currentRoom');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
        return;
      }

      toast(`${data.username || 'Player'} was removed (${data.reason})`, {
        icon: '❌',
        duration: 3000
      });
    });

    // Duplicate connection (multiple tabs)
    socket.on('duplicate_connection', (data) => {
      toast.error(data.message, { duration: 5000 });
      // Optionally redirect to dashboard
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        }
      }, 2000);
    });

    // RULE 1: Receive private balance updates
    socket.on('your_balance', (balance: number) => {
      setMyBalance(balance);
    });

    // RULE 1: Receive private cards
    socket.on('your_cards', (cards) => {
      console.log('[SOCKET] Received your_cards:', cards, 'Is Empty?', cards.length === 0);
      setMyHand(cards);
    });

    // RULE 1: SINGLE SOURCE OF TRUTH
    // Unified Game State Update
    socket.on('game_update', (data: any) => { // Type as PublicGameState eventually
      console.log('Received Game Update:', data);
      setGameState({
        roomId: data.roomId,
        status: data.gameState,
        pot: data.pot,
        currentTurn: data.currentTurnPlayerId,
        turnStartTime: data.turnStartTime,
        turnDuration: data.turnDuration,
        currentStake: data.currentStake,
        roundResult: data.roundResult,
        players: data.players // Keep players in gameState or separate?
        // The hook exposes 'players' separately. Let's sync both.
      });
      setPlayers(data.players);
    });

    // Legacy Support (can gradually remove)
    socket.on('player_joined', (data) => {
      // Just for toast, state is handled by game_update
    });

    socket.on('game_auto_started', (data) => {
      // Just for toast/sound
    });

    socket.on('turn_played', (data) => {
      // Just for sound effects if needed, verify logic
    });

    // BET FEEDBACK: Bet accepted
    socket.on('bet_accepted', (data) => {
      setIsBetting(false);
      toast.success(`Bet placed: ₹${data.amount}`, { duration: 2000 });
      setMyBalance(data.newBalance);
    });

    // BET FEEDBACK: Bet rejected
    socket.on('bet_rejected', (data) => {
      setIsBetting(false);
      toast.error(data.reason, { duration: 3000 });
      if (data.validOptions) {
        setBetOptions(data.validOptions);
      }
    });

    // BET OPTIONS: Receive valid bet options
    socket.on('bet_options', (options) => {
      setBetOptions(options);
    });

    // RULE 3: Player disconnected
    socket.on('player_disconnected', (data) => {
      console.log(`Player ${data.username} disconnected`);
    });

    socket.on('game_over', (data) => {
      setGameState((prev: any) => ({
        ...prev,
        status: 'FINISHED',
        winner: data.winner,
        reason: data.reason
      }));

      // Clear session storage when game ends
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('currentRoom');
        sessionStorage.removeItem('currentUserId');
      }
    });

    // Chat Events
    socket.on('receive_message', (msg) => {
      setMessages((prev: any) => [...prev, msg]);
    });

    // EXIT GAME: Confirmed
    socket.on('exit_confirmed', () => {
      // Clear session storage
      sessionStorage.removeItem('currentRoom');
      sessionStorage.removeItem('currentUserId');

      // Redirect to dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    });

    // Player exited notification
    socket.on('player_exited', (data) => {
      if (data.userId !== user.id) {
        toast(`${data.username} left the game`, { icon: '👋', duration: 3000 });
      }
    });

    // BUG 1 & 2 FIX: Listen for player_saw_cards and update state
    socket.on('player_saw_cards', (data) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.userId === data.playerId ? { ...p, isSeen: true } : p
        )
      );
    });

    // BUG 5 FIX: Listen for game notifications
    socket.on('game_notification', (data) => {
      const icons: any = {
        'your_turn': '🔔',
        'game_over': '🏆',
        'opponent_left': '👋',
        'side_show_request': '🤝'
      };

      toast(data.message, {
        icon: icons[data.type] || '📢',
        duration: 4000
      });

      addNotification({
        title: 'Game Alert',
        message: data.message,
        type: 'info'
      });
    });

    // CRITICAL FIX: Side Show Request Listener
    socket.on('side_show_request', (data) => {
      console.log('Received side show request:', data);
      setSideShowRequest({
        from: data.from,
        fromUsername: data.fromUsername
      });
      // Also toast for visibility
      toast(`Side Show requested by ${data.fromUsername}`, { icon: '🤝', duration: 5000 });
    });

    // ROUND RESULT: Display winner and reason
    socket.on('round_result', (data) => {
      console.log('Round result received:', data);
      setGameState((prev: any) => ({
        ...prev,
        status: 'ROUND_END',
        roundResult: data
      }));

      const isWinner = data.winner.userId === user.id;
      toast(isWinner ? '🎉 You won the round!' : `${data.winner.username} won!`, {
        duration: data.delay
      });
    });

    // NEXT ROUND START: Auto-continue to next round
    socket.on('next_round_start', (data) => {
      console.log('Next round starting:', data);
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
    });

    // AVATAR CHANGED: Update player avatar in real-time
    socket.on('avatar_changed', (data: { userId: string; avatarId: string }) => {
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.userId === data.userId ? { ...p, avatarId: data.avatarId } : p
        )
      );

      // Also update round result winner if applicable
      setGameState((prev: any) => {
        if (prev?.roundResult?.winner?.userId === data.userId) {
          return {
            ...prev,
            roundResult: {
              ...prev.roundResult,
              winner: {
                ...prev.roundResult.winner,
                avatarId: data.avatarId
              }
            }
          };
        }
        return prev;
      });
    });

    // MATCHMAKING EVENTS
    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      setMatchResult(data);
    });

    socket.on('table_types', (types) => {
      setTableTypes(types);
    });

    socket.on('match_error', (err) => {
      toast.error(err.message);
    });

    // JOIN REJECTED
    socket.on('join_rejected', (data) => {
      toast.error(data.reason || 'Cannot join this table', { duration: 5000 });
    });

    // ENHANCED INVITE EVENTS
    socket.on('game_invite_received', (data) => {
      addNotification({
        title: 'Game Invite',
        message: `${data.inviterName} invited you to ${data.tableName}`,
        type: 'success'
      });

      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-bold">{data.inviterName} invited you!</p>
          <p className="text-sm">{data.tableName} ({data.tableType})</p>
          <p className="text-xs text-gray-400">Boot: ₹{data.bootAmount} | Players: {data.currentPlayers}/{data.maxPlayers}</p>
          <div className="flex gap-2">
            <button
              className="bg-violet-600 text-white px-3 py-1 rounded text-sm font-bold flex-1"
              onClick={() => {
                socket.emit('accept_game_invite', { inviteId: data.inviteId });
                toast.dismiss(t.id);
              }}
            >
              Accept
            </button>
            <button
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-bold flex-1"
              onClick={() => {
                socket.emit('reject_game_invite', { inviteId: data.inviteId });
                toast.dismiss(t.id);
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ), { duration: 30000, icon: '💌' });
    });

    socket.on('invite_sent', (data) => {
      toast.success(`Invite sent to ${data.targetUsername || 'friend'}!`, { duration: 2000 });
    });

    socket.on('invite_error', (data) => {
      toast.error(data.message);
    });

    socket.on('invite_accepted', (data) => {
      toast.success(`${data.acceptedBy} accepted your invite!`, { icon: '✅', duration: 3000 });
    });

    socket.on('invite_rejected', (data) => {
      toast(`Your invite was declined`, { icon: '❌', duration: 3000 });
    });

    socket.on('invite_cancelled', (data) => {
      toast(`Game invite was cancelled${data.reason ? `: ${data.reason}` : ''}`, { icon: '⚠️', duration: 3000 });
    });

    socket.on('invite_cancelled_confirm', () => {
      toast('Invite cancelled', { duration: 2000 });
    });

    socket.on('invite_rejected_confirm', () => {
      toast('Invite declined', { duration: 2000 });
    });


    return () => {
      clearTimeout(connectionTimeout);
      socket.disconnect();
      hasJoinedRef.current = false;
    };
  }, [roomId, user, token]);

  const findMatch = (typeId: string) => {
    socketRef.current?.emit('find_match', { typeId, userId: user?.id });
  };

  const getTableTypes = () => {
    socketRef.current?.emit('get_table_types');
  };

  const sendInvite = (targetUserId: string) => {
    if (!roomId) return;
    socketRef.current?.emit('send_game_invite', { roomId, targetUserId });
  };

  const startGame = () => {
    socketRef.current?.emit('start_game', { roomId });
  };

  const placeBet = (amount: number) => {
    setIsBetting(true);
    socketRef.current?.emit('place_bet', { roomId, amount });
    // Reset after timeout as fallback
    setTimeout(() => setIsBetting(false), 3000);
  };

  const getBetOptions = () => {
    socketRef.current?.emit('get_bet_options', { roomId });
  };

  const seeCards = () => {
    socketRef.current?.emit('see_cards', { roomId });
  };

  const fold = () => {
    socketRef.current?.emit('fold', { roomId });
  };

  const sendMessage = (text: string) => {
    if (!user) return;
    socketRef.current?.emit('send_message', {
      roomId,
      message: text,
      sender: user.username
    });
  };

  const exitGame = () => {
    if (!user) return;
    socketRef.current?.emit('exit_game', { roomId, userId: user.id });
  };

  const show = () => {
    socketRef.current?.emit('show', { roomId });
  };

  const requestSideShow = (targetId: string) => {
    socketRef.current?.emit('request_side_show', { roomId, targetId });
  };

  // CRITICAL FIX: Respond to Side Show
  const respondToSideShow = (accept: boolean) => {
    socketRef.current?.emit('respond_side_show', { roomId, accept });
    setSideShowRequest(null); // Clear local state
  };

  // CRITICAL FIX: Consent Flow State
  const [consentRequest, setConsentRequest] = useState<{ timeoutSeconds: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    // ... (existing code omitted for brevity in thought, but must match existing structure)
    // Actually I can't easily insert into useEffect middle.
    // I will append listeners at the end of useEffect block or create a new useEffect.
    // Creating a new useEffect is cleaner for this specific feature.
  }, [user, token]); // THIS IS WRONG. I cannot modify existing useEffect easily without context.

  // Let's rely on finding where to insert in the BIG useEffect.
  // It starts at line 29. Ends at 491.

  // I will add a NEW useEffect for consent handling to separate concerns and make insertion easier.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleConsentRequest = (data: { timeoutSeconds: number; timestamp: number }) => {
      console.log('Consent Request Received:', data);
      setConsentRequest(data);
      toast('Next round starting soon...', { icon: '⏳', duration: 3000 });
    };

    socket.on('next_round_consent_request', handleConsentRequest);

    return () => {
      socket.off('next_round_consent_request', handleConsentRequest);
    };
  }, [isConnected]); // Re-bind if connection changes (socket ref might change or just stay same)
  // Actually socketRef.current is stable usually.

  // Also enable clearing it when round starts
  // I can hook into existing 'next_round_start' listener in the main useEffect.
  // OR just add another listener here. SocketIO allows multiple listeners.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const clearConsent = () => setConsentRequest(null);

    socket.on('next_round_start', clearConsent);

    return () => {
      socket.off('next_round_start', clearConsent);
    }
  }, [isConnected]);

  // Handler
  const respondToConsent = (consent: boolean) => {
    socketRef.current?.emit('next_round_consent', { roomId, consent });
    // If denied, we will be removed via 'player_removed' or 'disconnect' logic
    // If accepted, we wait for 'next_round_start'
  };

  return {
    isConnected,
    connectError,
    isReconnecting,
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
    sideShowRequest,
    respondToSideShow,
    consentRequest, // EXPORTED
    respondToConsent // EXPORTED
  };
};
