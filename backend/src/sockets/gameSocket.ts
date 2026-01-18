import { Server, Socket } from 'socket.io';
import { TeenPattiGame } from '../utils/TeenPattiGame';
import { emitIfAllowed } from '../utils/notificationService';
import { onlineStatusManager } from '../utils/onlineStatusManager';
import User from '../models/User';
import MatchHistory from '../models/MatchHistory';
import { TABLE_TYPES, TableConfig } from '../config/tableConfig';
import { v4 as uuidv4 } from 'uuid';
import { guaranteedNotificationService } from '../utils/guaranteedNotificationService';

// Helper to sync stats and balance
const syncGameResultToDb = async (winnerId: string, players: any[], roomId: string, potAmount: number, tableType: string = 'STANDARD') => {
  try {
    const participantIds = players.map(p => p.userId);

    // 1. Update User Stats and Balance
    const promises = players.map(async (p) => {
      const isWinner = p.userId === winnerId;

      const update: any = {
        $inc: {
          'stats.gamesPlayed': 1,
          'stats.wins': isWinner ? 1 : 0,
          'stats.losses': isWinner ? 0 : 1
        },
        $set: {
          walletBalance: p.balance
        }
      };

      await User.findByIdAndUpdate(p.userId, update);
    });

    await Promise.all(promises);

    // 2. Create Match History Record
    await MatchHistory.create({
      roomId,
      tableType,
      participants: participantIds,
      winners: [winnerId],
      potAmount,
      endedAt: new Date()
    });

    console.log(`Synced stats and history for room ${roomId}. Winner: ${winnerId}`);
  } catch (err) {
    console.error('Error syncing game stats:', err);
  }
};

// Helper: Sync single user balance to DB
const syncUserBalance = async (userId: string, balance: number) => {
  try {
    await User.findByIdAndUpdate(userId, { $set: { walletBalance: balance } });
    console.log(`[SYNC] Balance synced for user ${userId}: ₹${balance}`);
  } catch (err) {
    console.error(`[SYNC_ERROR] Failed to sync balance for ${userId}:`, err);
  }
};

const games: { [roomId: string]: TeenPattiGame } = {};
const actionTimestamps = new Map<string, number>(); // Rate limiting
const playerDisconnectTimers = new Map<string, NodeJS.Timeout>(); // Grace period timers
let isGameLoopRunning = false;

// CLEANUP: Global interval to remove zombie games
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const roomId in games) {
    const game = games[roomId];
    // If empty and older than 1 minute (safety buffer), or purely empty for a while
    if (game.players.length === 0) {
      game.cleanup();
      delete games[roomId];
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`[GLOBAL_CLEANUP] Removed ${cleanedCount} empty game rooms.`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes


// Helper to handle Consent Flow centrally
const handleConsentFlow = (io: Server, roomId: string, game: TeenPattiGame) => {
  // 1. Initialize Consent Phase
  game.initiateConsentPhase();

  // 2. Emit Request to Frontend
  io.to(roomId).emit('next_round_consent_request', {
    timeoutSeconds: 5,
    timestamp: Date.now()
  });

  // 3. Start Server-side Timer (5s + 1s buffer)
  if (game.consentTimer) clearTimeout(game.consentTimer);

  game.consentTimer = setTimeout(() => {
    // HANDLE TIMEOUT
    const allReady = game.handleConsentTimeout();

    if (allReady) {
      startNextRoundExclusively(io, roomId, game);
    }
  }, 5500); // 5.5s allow for latency
};

// Helper to actually start the round (used after consent or timeout)
const startNextRoundExclusively = (io: Server, roomId: string, game: TeenPattiGame) => {
  const { started, removedPlayers } = game.startNextRound();

  // Notify removed players
  if (removedPlayers && removedPlayers.length > 0) {
    removedPlayers.forEach(p => {
      io.to(p.socketId).emit('player_removed', {
        reason: 'insufficient_balance',
        roomId
      });
      onlineStatusManager.setUserLeftGame(p.userId);
    });
    io.to(roomId).emit('game_update', game.getPublicGameState());
  }

  if (started) {
    const fullState = game.getFullGameState();
    io.to(roomId).emit('next_round_start', fullState); // Legacy/Transition event
    io.to(roomId).emit('game_update', game.getPublicGameState()); // Main State Update

    // Send cards
    game.players.forEach(p => {
      io.to(p.socketId).emit('your_cards', []); // Strict Blind Rule
      io.to(p.socketId).emit('your_balance', p.balance);
    });
  } else {
    // Not enough players or other issue
    console.log(`[NEXT_ROUND] Could not start round in ${roomId}. Players: ${game.players.length}`);
  }
};

export const gameSocket = (io: Server, socket: Socket) => {

  // LOBBY: Get available table types
  socket.on('get_table_types', () => {
    socket.emit('table_types', TABLE_TYPES);
  });

  // MATCHMAKING: Find or create a room for specific tier
  // MATCHMAKING: Find or create a room for specific tier
  socket.on('find_match', ({ typeId, userId }) => {
    try {
      const config = TABLE_TYPES.find(t => t.id === typeId);
      if (!config) {
        socket.emit('match_error', { message: 'Invalid table type' });
        return;
      }

      // Find available room
      let targetRoomId = '';
      for (const roomId in games) {
        const g = games[roomId];
        // Check if matching type and has space
        if (g.tableConfig.id === typeId && g.players.length < g.tableConfig.maxPlayers && g.gameState === 'WAITING') {
          targetRoomId = roomId;
          break;
        }
      }

      // Create new if none found
      if (!targetRoomId) {
        targetRoomId = uuidv4();
        games[targetRoomId] = new TeenPattiGame(targetRoomId, config);
        games[targetRoomId].setEventEmitter((event, data) => {
          io.to(targetRoomId).emit(event, data);
        });
        console.log(`Created new ${config.name} room: ${targetRoomId}`);
      }

      socket.emit('match_found', { roomId: targetRoomId });
    } catch (err) {
      console.error('Error in find_match:', err);
    }
  });

  // RULE 2: Auto-start when 2nd player joins / Reconnection support
  socket.on('join_game', async ({ roomId, userId, username, balance, avatarId }) => {
    try {
      console.log(`[JOIN_GAME] Received request - Room: ${roomId}, User: ${username} (${userId}), Balance: ${balance}`);

      // AWAIT JOIN - Critical for ensuring room membership before broadcast
      await socket.join(roomId);
      await socket.join(userId); // Join personal room for notifications
      console.log(`[JOIN_GAME] Socket ${socket.id} joined rooms: [${roomId}, ${userId}]`);


      // DEBUG: Trace Global Games Object
      const existingGame = games[roomId];
      console.log(`[DEBUG_GLOBAL] Current games keys: ${Object.keys(games).join(', ')}`);
      console.log(`[DEBUG_GLOBAL] Checking roomId: '${roomId}' (Type: ${typeof roomId})`);
      console.log(`[DEBUG_GLOBAL] Game exists? ${!!existingGame}`);

      if (!existingGame) {
        // FIX: Explicitly create a "Friend Room" if it doesn't exist
        // This supports the new "Enter Code" flow
        console.log(`[JOIN_GAME] Room ${roomId} not found. Creating new Friend Room.`);

        const friendTableConfig: TableConfig = {
          id: 'friend_room',
          name: 'Private Table',
          type: 'private',
          tier: 'medium',
          entryFee: 0,
          bootAmount: 100, // Standard boot for friends
          maxBetLimit: 10000,
          minBalanceToSit: 500,
          maxPlayers: 6,
          minPlayers: 2,
          description: 'Private game with friends'
        };

        games[roomId] = new TeenPattiGame(roomId, friendTableConfig);
        games[roomId].setEventEmitter((event, data) => {
          console.log(`[GAME_EVENT][${roomId}] Emitting: ${event}`);
          io.to(roomId).emit(event, data);

          // FIX: Auto-restart for Friend Rooms too
          // UPDATED: Now uses Consent Flow
          if (event === 'game_update' && data.gameState === 'ROUND_END') {
            // ... (handled in show/result logic)
          }
        });

        console.log(`[JOIN_GAME] Success: Created Friend Room: ${roomId}`);
      }


      const game = games[roomId];

      // Validate user balance meets table requirements
      if (balance < game.tableConfig.minBalanceToSit) {
        socket.emit('join_rejected', {
          reason: `Insufficient balance. Minimum required: ₹${game.tableConfig.minBalanceToSit}`,
          minBalance: game.tableConfig.minBalanceToSit,
          yourBalance: balance
        });
        return;
      }

      const existingPlayer = game.getPlayerByUserId(userId);

      // RECONNECTION FLOW - Intent-Based (FIX: Auto-Start Bug)
      if (existingPlayer) {
        console.log(`[JOIN_GAME] Player ${username} found in room ${roomId}. Checking reconnection eligibility...`);

        // Validate if this is a legitimate reconnection
        const timeSinceLastActivity = Date.now() - (existingPlayer.lastActivityTime || 0);
        const isRecentDisconnect = timeSinceLastActivity < 60000; // 1 minute threshold
        const isGameActive = game.gameState === 'PLAYING';

        console.log(`[RECONNECT_CHECK] TimeSinceActivity: ${timeSinceLastActivity}ms, IsRecent: ${isRecentDisconnect}, GameActive: ${isGameActive}`);

        if (isRecentDisconnect && isGameActive) {
          // LEGITIMATE RECONNECTION: Offer to resume
          console.log(`[RECONNECT_OFFER] Offering reconnection to ${username}`);

          // Clear disconnect timer if exists
          const disconnectTimer = playerDisconnectTimers.get(userId);
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            playerDisconnectTimers.delete(userId);
          }

          // Join socket to room so they can receive events while waiting
          await socket.join(roomId);
          await socket.join(userId);

          // Send reconnection offer (don't auto-reconnect)
          socket.emit('reconnection_available', {
            roomId,
            gameState: game.gameState,
            timeSinceDisconnect: timeSinceLastActivity,
            playerCount: game.players.length
          });

          console.log(`[RECONNECT_OFFER] Sent reconnection offer to ${username}. Waiting for confirmation.`);
          return; // Wait for explicit 'confirm_reconnection' event
        } else {
          // STALE SESSION: Remove old player, treat as fresh join
          console.log(`[STALE_SESSION] Removing stale player ${username} from ${roomId}. Reason: ${!isRecentDisconnect ? 'Old session' : 'Game not active'}`);

          // Remove stale player
          game.removePlayer(existingPlayer.socketId);

          // Continue to NEW PLAYER FLOW below (don't return)
        }
      }

      // NEW PLAYER FLOW (original logic)
      const { player, autoStart } = game.addPlayer(socket.id, userId, username, balance, avatarId || 'avatar_1');

      // Track user joining game
      onlineStatusManager.setUserInGame(userId, roomId, game.gameState);

      // FRIEND LIST: Notify friends that user joined a game
      try {
        const user = await User.findById(userId).populate('friends');
        if (user && user.friends && user.friends.length > 0) {
          user.friends.forEach((friend: any) => {
            io.to(friend._id.toString()).emit('friend_game_status_update', {
              userId: user._id.toString(),
              status: 'in_game',
              gameInfo: {
                roomId,
                gameState: game.gameState
              }
            });
          });
          console.log(`Notified ${user.friends.length} friends that ${username} joined game ${roomId}`);
        }
      } catch (err) {
        console.error('Error notifying friends of game join:', err);
      }

      // RULE 1: Send sanitized public data
      // CRITICAL FIX: Emit to ROOM (others) AND direct to SOCKET (self)
      // This ensures the joiner gets the state even if the room broadcast hasn't propagated
      const publicState = game.getPublicGameState();
      socket.broadcast.to(roomId).emit('game_update', publicState);
      socket.emit('game_update', publicState);

      console.log(`[JOIN_GAME] Emitted initial game_update to Room: ${roomId} and Socket: ${socket.id}`);

      // Maintain legacy event for notification if needed, or remove if frontend is fully migrated.
      // For now, let's keep it for toast notifications but rely on game_update for state.
      io.to(roomId).emit('player_joined', {
        players: game.getPublicPlayerData(), // Legacy payload for compatibility/toasts
        gameState: game.gameState
      });

      // RULE 1: Send private balance only to this player
      socket.emit('your_balance', player.balance);

      console.log(`[JOIN_GAME] Finalized join for user ${username} in room ${roomId}`);

      // DEBUG: Check autoStart conditions
      console.log(`[DEBUG] autoStart=${autoStart}, players.length=${game.players.length}, gameState=${game.gameState}`);

      // RULE 2: Auto-start game if 2 players present
      if (autoStart) {
        console.log(`[JOIN_GAME][${roomId}] Conditions met for Auto-Start. Players: ${game.players.length}, State: ${game.gameState}`);

        // Force start the game logic
        const started = game.startGame();

        if (started) {
          console.log(`[JOIN_GAME][${roomId}] ✅ Game Started! Emitting updates.`);
          // CRITICAL: Emit 'game_update' immediately to switch UI to Playing State
          const publicState = game.getPublicGameState();
          io.to(roomId).emit('game_update', publicState);
          console.log(`[JOIN_GAME] AUTO_START: Game started & update emitted for ${roomId}. State: ${publicState.gameState}`);

          // Legacy event for toasts
          io.to(roomId).emit('game_auto_started', {
            players: game.getPublicPlayerData(),
            pot: game.pot
          });

          // Send private cards to each user
          game.players.forEach(p => {
            // FIX: Strict Blind Rule
            // Send empty array initially. Cards only sent on 'see_cards'
            io.to(p.socketId).emit('your_cards', []);
            io.to(p.socketId).emit('your_balance', p.balance);
          });
        } else {
          console.warn(`[JOIN_GAME] Auto-start triggered but game failed to start in ${roomId}`);
        }
      } else {
        console.log(`[JOIN_GAME] Player joined ${roomId}. Waiting for more players to start.`);
      }
    } catch (err) {
      console.error('Error in join_game:', err);
    }
  });

  // NEW: CONSENT HANDLER
  socket.on('next_round_consent', async ({ roomId, consent }) => {
    try {
      const game = games[roomId];
      if (!game) return;

      const player = game.players.find(p => p.socketId === socket.id);
      if (!player) return;

      const { allReady, removedPlayerId, removedPlayerBalance } = game.handlePlayerConsent(player.userId, consent);

      // Notify room about update (optional, but good for UI like "2/3 players ready")
      // io.to(roomId).emit('next_round_consent_update', { userId: player.userId, status: consent ? 'READY' : 'DENIED' });

      if (removedPlayerId) {
        // Sync balance of the player who left via denial
        if (removedPlayerBalance !== undefined) {
          await syncUserBalance(removedPlayerId, removedPlayerBalance);
        }

        // RULE 2: Backend Controls Exit (Strict)
        socket.leave(roomId);
        socket.emit('exit_confirmed', { redirectUrl: '/dashboard' });

        io.to(roomId).emit('player_left_game', { userId: removedPlayerId }); // Legacy
        io.to(roomId).emit('game_update', game.getPublicGameState());
        // Clear status
        onlineStatusManager.setUserLeftGame(removedPlayerId);
      }

      if (allReady) {
        // If everyone responded (and at least 1 remains), start immediately
        if (game.consentTimer) clearTimeout(game.consentTimer);
        startNextRoundExclusively(io, roomId, game);
      }

    } catch (err) {
      console.error('Error in next_round_consent:', err);
    }
  });

  // NEW: Explicit Reconnection Confirmation (FIX: Auto-Start Bug)
  socket.on('confirm_reconnection', async ({ roomId }) => {
    try {
      // @ts-ignore
      const userId = socket.user?.id;
      if (!userId) return;

      const game = games[roomId];
      if (!game) {
        socket.emit('reconnection_failed', { reason: 'Game room not found' });
        return;
      }

      const existingPlayer = game.getPlayerByUserId(userId);
      if (!existingPlayer) {
        socket.emit('reconnection_failed', { reason: 'Player not found in game' });
        return;
      }

      console.log(`[CONFIRM_RECONNECT] User ${userId} confirmed reconnection to ${roomId}`);

      // Join rooms
      await socket.join(roomId);
      await socket.join(userId);

      // Handle duplicate connection (multiple tabs)
      if (existingPlayer.socketId !== socket.id) {
        const oldSocketId = existingPlayer.socketId;

        // Disconnect old socket
        io.to(oldSocketId).emit('duplicate_connection', {
          message: 'Game opened in another tab'
        });

        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }

        console.log(`[CONFIRM_RECONNECT] Disconnected old socket ${oldSocketId}`);
      }

      // Reconnect player with new socket ID
      game.reconnectPlayer(userId, socket.id);

      // Send full game state for restoration
      const fullState = game.getFullGameState();
      socket.emit('game_state_restored', fullState);

      // Send private data
      socket.emit('your_cards', existingPlayer.isSeen ? existingPlayer.hand : []);
      socket.emit('your_balance', existingPlayer.balance);

      // Send pending side show request if exists
      if (existingPlayer.sideShowRequest) {
        const requester = game.players.find(p => p.socketId === existingPlayer.sideShowRequest!.from);
        if (requester) {
          socket.emit('side_show_request', {
            from: requester.userId,
            fromUsername: requester.username
          });
        }
      }

      // Notify room of reconnection
      io.to(roomId).emit('player_reconnected', {
        userId: existingPlayer.userId,
        username: existingPlayer.username
      });

      // Update online status
      onlineStatusManager.setUserInGame(userId, roomId, game.gameState);

      console.log(`[CONFIRM_RECONNECT] ✅ Player ${existingPlayer.username} successfully reconnected to ${roomId}`);

    } catch (err) {
      console.error('Error in confirm_reconnection:', err);
      socket.emit('reconnection_failed', { reason: 'Internal server error' });
    }
  });

  // NEW: Decline Reconnection Handler (FIX: Auto-Start Bug)
  socket.on('decline_reconnection', async ({ roomId }) => {
    try {
      // @ts-ignore
      const userId = socket.user?.id;
      if (!userId) return;

      const game = games[roomId];
      if (!game) return;

      const existingPlayer = game.getPlayerByUserId(userId);
      if (!existingPlayer) return;

      console.log(`[DECLINE_RECONNECT] User ${userId} declined reconnection to ${roomId}. Removing old player.`);

      // Use exitPlayer instead of removePlayer to handle auto-win
      const { exitedPlayer, autoWinner, wasInRound } = game.exitPlayer(userId, false);

      if (!exitedPlayer) return;

      // Sync balance
      await syncUserBalance(userId, exitedPlayer.balance);

      // Leave the room
      socket.leave(roomId);

      // Notify room
      io.to(roomId).emit('player_exited', {
        userId: exitedPlayer.userId,
        username: exitedPlayer.username,
        wasInRound,
        reason: 'declined_reconnection'
      });

      io.to(roomId).emit('game_update', game.getPublicGameState());

      // Handle auto-win if triggered
      if (autoWinner && game.roundResult) {
        io.to(roomId).emit('round_result', {
          winner: {
            userId: autoWinner.userId,
            username: autoWinner.username,
            avatarId: autoWinner.avatarId
          },
          reason: game.roundResult.reason,
          pot: game.roundResult.pot,
          delay: game.roundEndDelay,
          actionSourceUserId: userId,
          playerHands: game.roundResult.playerHands
        });

        await syncGameResultToDb(autoWinner.userId, game.players, roomId, game.pot, game.tableConfig.id);

        // Only start consent flow if enough players remain
        if (game.players.length >= game.tableConfig.minPlayers) {
          setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);
        } else {
          console.log(`[DECLINE_RECONNECT] Only ${game.players.length} player(s) remaining. Game reset to WAITING.`);
          io.to(roomId).emit('game_update', game.getPublicGameState());
        }
      }

      // Notify user they can now join fresh
      socket.emit('reconnection_declined_success');

      console.log(`[DECLINE_RECONNECT] ✅ Old player removed. User can now join fresh.`);

    } catch (err) {
      console.error('Error in decline_reconnection:', err);
    }
  });

  // NEW: User Logout Handler (FIX: Auto-Start Bug)
  socket.on('user_logout', async ({ userId }) => {
    try {
      console.log(`[USER_LOGOUT] User ${userId} logging out. Removing from all games.`);

      // Remove user from ALL games
      for (const roomId in games) {
        const game = games[roomId];
        const player = game.getPlayerByUserId(userId);

        if (player) {
          console.log(`[USER_LOGOUT] Removing ${userId} from game ${roomId}`);

          // Exit player (voluntary=false to avoid penalties)
          const { exitedPlayer, autoWinner } = game.exitPlayer(userId, false);

          if (exitedPlayer) {
            // Sync balance
            await syncUserBalance(userId, exitedPlayer.balance);

            // Notify room
            io.to(roomId).emit('player_exited', {
              userId: exitedPlayer.userId,
              username: exitedPlayer.username,
              reason: 'logout'
            });

            io.to(roomId).emit('game_update', game.getPublicGameState());

            // Handle auto-win if triggered
            if (autoWinner && game.roundResult) {
              io.to(roomId).emit('round_result', {
                winner: {
                  userId: autoWinner.userId,
                  username: autoWinner.username,
                  avatarId: autoWinner.avatarId
                },
                reason: game.roundResult.reason,
                pot: game.roundResult.pot,
                delay: game.roundEndDelay,
                actionSourceUserId: userId,
                playerHands: game.roundResult.playerHands
              });

              await syncGameResultToDb(autoWinner.userId, game.players, roomId, game.pot, game.tableConfig.id);
            }
          }

          socket.leave(roomId);
        }
      }

      // Mark user as offline
      onlineStatusManager.setUserOffline(userId);

      console.log(`[USER_LOGOUT] ✅ User ${userId} removed from all games`);

    } catch (err) {
      console.error('Error in user_logout:', err);
    }
  });

  // Manual start (for restarting after a round)
  socket.on('start_game', ({ roomId }) => {
    try {
      const game = games[roomId];
      if (game && game.startGame()) {
        const publicPlayers = game.getPublicPlayerData();

        io.to(roomId).emit('game_started', {
          players: publicPlayers,
          pot: game.pot,
          currentTurn: game.players[game.currentTurnIndex].userId,
          turnStartTime: game.turnStartTime,
          turnDuration: game.turnTimeLimit
        });

        // Send private cards to each user
        game.players.forEach(p => {
          io.to(p.socketId).emit('your_cards', []); // FIX: Strict Blind Rule
          io.to(p.socketId).emit('your_balance', p.balance);
        });
      }
    } catch (err) {
      console.error('Error in start_game:', err);
    }
  });

  // RULE 4: Get bet options (conditional betting)
  socket.on('get_bet_options', ({ roomId }) => {
    try {
      const game = games[roomId];
      if (!game) return;

      const options = game.getValidBetOptions(socket.id);
      if (options) {
        socket.emit('bet_options', options);
      }
    } catch (err) {
      console.error('Error in get_bet_options:', err);
    }
  });

  // See cards (mark player as seen)
  socket.on('see_cards', ({ roomId }) => {
    try {
      const game = games[roomId];
      if (game && game.seeCards(socket.id)) {
        const player = game.players.find(p => p.socketId === socket.id);
        if (player) {
          io.to(roomId).emit('game_update', game.getPublicGameState());

          // FIX: Strict Blind Rule - Send cards NOW
          io.to(player.socketId).emit('your_cards', player.hand);

          // Legacy event
          io.to(roomId).emit('player_saw_cards', {
            playerId: player.userId,
            isSeen: true
          });

          // FIX: If a player sees cards, it might change the betting multiplier (e.g. All Seen Rule)
          // We must update the bet options for the CURRENT turn player immediately
          if (game.gameState === 'PLAYING') {
            const currentTurnPlayer = game.players[game.currentTurnIndex];
            if (currentTurnPlayer && currentTurnPlayer.active && !currentTurnPlayer.folded) {
              const options = game.getValidBetOptions(currentTurnPlayer.socketId);
              if (options) {
                io.to(currentTurnPlayer.socketId).emit('bet_options', options);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in see_cards:', err);
    }
  });

  // RULE 4: Place bet with server validation
  socket.on('place_bet', ({ roomId, amount }) => {
    try {
      // Rate limiting - prevent spam betting
      const lastAction = actionTimestamps.get(socket.id) || 0;
      const now = Date.now();

      if (now - lastAction < 500) { // 500ms cooldown
        return; // Ignore spam
      }

      actionTimestamps.set(socket.id, now);

      const game = games[roomId];
      if (!game) {
        socket.emit('bet_rejected', { reason: 'Game room not found' });
        return;
      }

      const player = game.players.find(p => p.socketId === socket.id);
      if (!player) {
        socket.emit('bet_rejected', { reason: 'You are not in this game' });
        return;
      }

      // Attempt to place bet
      const betResult = game.placeBet(socket.id, amount);

      if (betResult) {
        // Bet accepted - send confirmation to player
        socket.emit('bet_accepted', {
          amount,
          newBalance: player.balance,
          pot: game.pot,
          currentStake: game.currentStake
        });

        // Broadcast turn played and FULL STATE
        io.to(roomId).emit('game_update', game.getPublicGameState());

        // Legacy for specific animations if needed
        io.to(roomId).emit('turn_played', {
          playerId: player.userId,
          action: 'bet',
          amount,
          pot: game.pot
        });

        // Send updated balance to player
        io.to(player.socketId).emit('your_balance', player.balance);
      } else {
        // Bet rejected - send detailed reason
        const options = game.getValidBetOptions(socket.id);
        let reason = 'Invalid bet amount or not your turn';

        if (game.players[game.currentTurnIndex].socketId !== socket.id) {
          reason = 'Please wait for your turn';
        } else if (!player.active || player.folded) {
          reason = 'Please wait for the next round to play';
        } else if (!amount || amount <= 0 || isNaN(amount)) {
          reason = 'Invalid bet amount';
        } else if (player.balance < amount) {
          reason = `Insufficient balance. You have ₹${player.balance}`;
        } else if (options) {
          const validAmounts = [options.chaal, options.raise2x, options.raise4x];
          if (options.allIn) validAmounts.push(options.allIn);
          reason = `Invalid bet amount. Valid options: ${validAmounts.map(a => `₹${a}`).join(', ')}`;
        }

        socket.emit('bet_rejected', {
          reason,
          validOptions: options
        });
      }
    } catch (err) {
      console.error('Error in place_bet:', err);
    }
  });


  // RULE 5: Request side show
  socket.on('request_side_show', ({ roomId, targetId }) => {
    try {
      const game = games[roomId];
      if (game && game.requestSideShow(socket.id, targetId)) {
        const requester = game.players.find(p => p.socketId === socket.id);
        const target = game.players.find(p => p.userId === targetId);

        if (requester && target) {
          // Notify target player (if enabled)
          emitIfAllowed(io, target.userId, 'side_show_request', {
            from: requester.userId,
            fromUsername: requester.username
          }, 'game.sideShowRequest');

          // Notify requester
          socket.emit('side_show_requested', {
            target: targetId
          });
        }
      }
    } catch (err) {
      console.error('Error in request_side_show:', err);
    }
  });

  // RULE 5: Respond to side show
  socket.on('respond_side_show', ({ roomId, accept }) => {
    try {
      const game = games[roomId];
      if (!game) return;

      const result = game.respondToSideShow(socket.id, accept);
      if (!result) return;

      if (!result.accepted) {
        // Side show rejected
        const target = game.players.find(p => p.socketId === socket.id);
        io.to(roomId).emit('side_show_rejected', {
          playerId: target?.userId
        });
      } else {
        // Side show resolved
        const { winner, loser } = result;

        if (!winner || !loser) return; // Safety check

        io.to(roomId).emit('side_show_result', {
          winner: winner.userId,
          loser: loser.userId,
          winnerHand: winner.hand,
          loserHand: loser.hand
        });

        // Update balance of winner/loser
        io.to(winner.socketId).emit('your_balance', winner.balance);
        io.to(loser.socketId).emit('your_balance', loser.balance);

        // Emit Game Update for Turn Change
        io.to(roomId).emit('game_update', game.getPublicGameState());

        // Check if game ended (Round End)
        if (game.gameState === 'ROUND_END' && game.roundResult) {
          // FIX: Send round_result instead of game_over
          io.to(roomId).emit('round_result', {
            winner: {
              userId: winner.userId,
              username: winner.username,
              avatarId: winner.avatarId
            },
            reason: game.roundResult.reason,
            pot: game.pot,
            delay: game.roundEndDelay,
            actionSourceUserId: game.roundResult.actionSourceUserId,
            playerHands: game.roundResult.playerHands
          });

          // Notify players about game over (if enabled)
          game.players.forEach(p => {
            emitIfAllowed(io, p.userId, 'game_notification', {
              type: 'game_over',
              message: `Round Over! ${winner.username} won the pot via Side Show`
            }, 'game.roundResult');
          });

          // Sync Stats to DB
          syncGameResultToDb(winner.userId, game.players, roomId, game.pot, game.tableConfig.id);


          // UPDATED: Start Consent Flow instead of immediate timeout
          setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);


        } else {
          // Continue game
          io.to(roomId).emit('turn_update', {
            nextTurn: game.players[game.currentTurnIndex].userId,
            turnStartTime: game.turnStartTime,
            turnDuration: game.turnTimeLimit
          });

          // Notify next player (if enabled)
          const nextPlayer = game.players[game.currentTurnIndex];
          emitIfAllowed(io, nextPlayer.userId, 'game_notification', {
            type: 'your_turn',
            message: 'It is your turn!'
          }, 'game.yourTurn');
        }
      }
    } catch (err) {
      console.error('Error in respond_side_show:', err);
    }
  });

  // Show (final showdown)
  socket.on('show', ({ roomId }) => {
    try {
      const game = games[roomId];
      if (!game) return;

      const result = game.show(socket.id);
      if (!result) {
        socket.emit('show_rejected', { reason: 'Cannot show yet' });
        return;
      }

      const { winner, results } = result;

      // Broadcast all hands and winner
      // Emit Full Game Update
      io.to(roomId).emit('game_update', game.getPublicGameState());

      io.to(roomId).emit('show_result', {
        winner: winner.userId,
        results: results.map(r => ({
          playerId: r.player.userId,
          username: r.player.username,
          hand: r.player.hand,
          handName: r.handName
        }))
      });

      // Update balance for ALL players involved in showdown (since they might have paid for show)
      results.forEach(r => {
        io.to(r.player.socketId).emit('your_balance', r.player.balance);
      });

      // FIX: BUG 3 - Send round_result instead of game_over and auto-start next round
      if (game.roundResult) {
        io.to(roomId).emit('round_result', {
          winner: {
            userId: winner.userId,
            username: winner.username,
            avatarId: winner.avatarId
          },
          reason: game.roundResult.reason,
          pot: game.roundResult.pot,
          delay: game.roundEndDelay,
          actionSourceUserId: game.roundResult.actionSourceUserId,
          playerHands: game.roundResult.playerHands
        });


        // UPDATED: Start Consent Flow
        setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);
      }

      // Sync Stats to DB
      syncGameResultToDb(winner.userId, game.players, roomId, game.pot, game.tableConfig.id);

    } catch (err) {
      console.error('Error in show:', err);
    }
  });

  // RULE 6: Fold
  socket.on('fold', ({ roomId }) => {
    try {
      // Rate limiting - prevent spam folding
      const lastAction = actionTimestamps.get(socket.id) || 0;
      const now = Date.now();

      if (now - lastAction < 500) { // 500ms cooldown
        return; // Ignore spam
      }

      actionTimestamps.set(socket.id, now);

      const game = games[roomId];
      if (game && game.fold(socket.id)) {
        const player = game.players.find(p => p.socketId === socket.id);

        io.to(roomId).emit('game_update', game.getPublicGameState());

        io.to(roomId).emit('turn_played', {
          playerId: player?.userId,
          action: 'fold'
        });

        // RULE 6: Game ends only if one player left
        if (game.gameState === 'ROUND_END' && game.roundResult) {
          const winner = game.roundResult.winner;

          // Send round result instead of game_over
          io.to(roomId).emit('round_result', {
            winner: {
              userId: winner.userId,
              username: winner.username,
              avatarId: winner.avatarId
            },
            reason: game.roundResult.reason,
            pot: game.roundResult.pot,
            delay: game.roundEndDelay,
            actionSourceUserId: game.roundResult.actionSourceUserId,
            playerHands: game.roundResult.playerHands
          });

          // Update winner balance
          io.to(winner.socketId).emit('your_balance', winner.balance);


          // UPDATED: Start Consent Flow
          setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);

          // Sync Stats to DB
          syncGameResultToDb(winner.userId, game.players, roomId, game.pot, game.tableConfig.id);

        }
      }
    } catch (err) {
      console.error('Error in fold:', err);
    }
  });

  // EXIT GAME: Voluntary exit
  socket.on('exit_game', async ({ roomId, userId }) => {
    try {
      const game = games[roomId];
      if (!game) return;

      const { exitedPlayer, autoWinner, wasInRound } = game.exitPlayer(userId, true);

      if (!exitedPlayer) return;

      console.log(`[EXIT_GAME] Player ${exitedPlayer.username} voluntarily exited ${roomId}`);
      console.log(`[EXIT_GAME] wasInRound: ${wasInRound}, autoWinner: ${autoWinner?.username || 'none'}`);
      console.log(`[EXIT_GAME] Remaining players: ${game.players.length}, Game state: ${game.gameState}`);

      // RULE 2: Backend Controls Exit (Strict)
      // 1. Sync exiting player's balance immediately
      await syncUserBalance(userId, exitedPlayer.balance);

      // Clear user's game status (mark as online but not in game)
      onlineStatusManager.setUserLeftGame(userId);

      // FRIEND LIST: Notify friends that user left the game
      try {
        const user = await User.findById(userId).populate('friends');
        if (user && user.friends && user.friends.length > 0) {
          user.friends.forEach((friend: any) => {
            io.to(friend._id.toString()).emit('friend_game_status_update', {
              userId: user._id.toString(),
              status: 'online',
              gameInfo: undefined
            });
          });
          console.log(`Notified ${user.friends.length} friends that ${exitedPlayer.username} left game`);
        }
      } catch (err) {
        console.error('Error notifying friends of game exit:', err);
      }

      // Clear any disconnect timers
      const timer = playerDisconnectTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        playerDisconnectTimers.delete(userId);
      }

      // Notify room
      io.to(roomId).emit('player_exited', {
        userId: exitedPlayer.userId,
        username: exitedPlayer.username,
        wasInRound
      });

      // Emit game update to show current state (WAITING if only 1 player left)
      io.to(roomId).emit('game_update', game.getPublicGameState());

      // Notify other players about opponent exit (if enabled)
      game.players.forEach(p => {
        if (p.userId !== userId) {
          emitIfAllowed(io, p.userId, 'game_notification', {
            type: 'opponent_left',
            message: `${exitedPlayer.username} left the game`
          }, 'game.opponentLeft');
        }
      });

      // If auto-win triggered (player exited during active round)
      if (autoWinner && game.roundResult) {
        // Send round result
        io.to(roomId).emit('round_result', {
          winner: {
            userId: autoWinner.userId,
            username: autoWinner.username,
            avatarId: autoWinner.avatarId
          },
          reason: game.roundResult.reason,
          pot: game.roundResult.pot,
          delay: game.roundEndDelay,
          actionSourceUserId: game.roundResult.actionSourceUserId,
          playerHands: game.roundResult.playerHands
        });

        // Update winner balance
        io.to(autoWinner.socketId).emit('your_balance', autoWinner.balance);

        // SYNC WINNER BALANCE IMMEDIATELY
        await syncGameResultToDb(autoWinner.userId, game.players, roomId, game.pot, game.tableConfig.id);

        // UPDATED: Only start consent flow if enough players remain
        // If only 1 player left, game should be in WAITING state (set by exitPlayer)
        if (game.players.length >= game.tableConfig.minPlayers) {
          setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);
        } else {
          console.log(`[EXIT_GAME] Only ${game.players.length} player(s) remaining. Game reset to WAITING.`);
          // Emit game update to show WAITING state
          io.to(roomId).emit('game_update', game.getPublicGameState());
        }
      }

      // Cancel all pending invites from this user
      const cancelledInvites = game.cancelInvitesFromUser(userId);
      cancelledInvites.forEach(inviteId => {
        const invite = game.getInvite(inviteId);
        if (invite) {
          io.to(invite.targetUserId).emit('invite_cancelled', {
            inviteId,
            roomId,
            reason: 'Inviter left the game'
          });
        }
      });


      // Disconnect the exiting player
      socket.leave(roomId);

      // RULE 1: EXIT MEANS EXIT IMMEDIATELY
      socket.emit('exit_confirmed', { redirectUrl: '/dashboard' });

      // Clean up empty games (DESTROY room when last player leaves)
      if (game.players.length === 0) {
        game.cleanup(); // Cancel timers
        delete games[roomId];
        console.log(`[ROOM_DESTRUCTION] Deleted empty game room ${roomId}`);
      }
    } catch (err) {
      console.error('Error in exit_game:', err);
    }
  });


  // RULE 3: Enhanced disconnect with grace period
  socket.on('disconnect', () => {
    for (const roomId in games) {
      const game = games[roomId];
      const player = game.players.find(p => p.socketId === socket.id);

      if (player) {
        console.log(`Player ${player.username} disconnected from ${roomId}`);

        // If game is in progress, set grace period timer
        if (game.gameState === 'PLAYING') {
          const gracePeriod = 30000; // 30 seconds

          // Notify room of temporary disconnect
          io.to(roomId).emit('player_connection_lost', {
            userId: player.userId,
            username: player.username,
            gracePeriod: gracePeriod
          });

          // Set timer to remove player after grace period
          const timer = setTimeout(async () => {
            console.log(`Grace period expired for ${player.username}. Removing from game.`);

            // Mark user as offline after grace period
            onlineStatusManager.setUserOffline(player.userId);

            // Sync balance of the disconnected player before removal
            await syncUserBalance(player.userId, player.balance);

            // Remove player and check for auto-win
            const { autoWinner } = game.removePlayer(socket.id);

            if (autoWinner) {
              // Auto-win triggered
              io.to(roomId).emit('player_removed', {
                userId: player.userId,
                username: player.username,
                reason: 'disconnect_timeout'
              });

              // FIX: Send round_result instead of game_over
              if (game.roundResult) {
                io.to(roomId).emit('round_result', {
                  winner: {
                    userId: autoWinner.userId,
                    username: autoWinner.username,
                    avatarId: autoWinner.avatarId
                  },
                  reason: game.roundResult.reason,
                  pot: game.pot,
                  delay: game.roundEndDelay,
                  actionSourceUserId: game.roundResult.actionSourceUserId,
                  playerHands: game.roundResult.playerHands
                });
              }

              // Emit Game Update for Disconnect Auto-Win
              io.to(roomId).emit('game_update', game.getPublicGameState());

              // Update winner balance
              io.to(autoWinner.socketId).emit('your_balance', autoWinner.balance);

              // Sync Stats and Winner Balance to DB
              await syncGameResultToDb(autoWinner.userId, game.players, roomId, game.pot, game.tableConfig.id);


              console.log(`Auto-win: ${autoWinner.username} wins due to player disconnect`);


              // UPDATED: Start Consent Flow
              setTimeout(() => handleConsentFlow(io, roomId, game), game.roundEndDelay);
            } else {
              // Just notify player left
              io.to(roomId).emit('player_removed', {
                userId: player.userId,
                username: player.username,
                reason: 'disconnect_timeout'
              });

              // Emit Game Update
              io.to(roomId).emit('game_update', game.getPublicGameState());
            }

            // Clean up timer
            playerDisconnectTimers.delete(player.userId);

            // Clean up empty games if it became empty after player removal
            if (game.players.length === 0) {
              game.cleanup(); // Cancel game timers
              delete games[roomId];
              console.log(`[ROOM_DESTRUCTION] Deleted empty game room ${roomId} after disconnect timeout.`);
            }

          }, gracePeriod);

          playerDisconnectTimers.set(player.userId, timer);
          console.log(`Set ${gracePeriod}ms grace period for ${player.username}`);
        } else {
          // Not playing (WAITING/FINISHED) - remove immediately
          console.log(`Player left waiting room ${roomId}`);
          onlineStatusManager.setUserOffline(player.userId);

          // Remove player
          game.removePlayer(socket.id);

          // Notify room
          io.to(roomId).emit('player_left_lobby', {
            userId: player.userId,
            username: player.username
          });

          // Clean up empty games
          if (game.players.length === 0) {
            game.cleanup(); // Cancel game timers
            delete games[roomId];
            console.log(`Deleted empty game room ${roomId}`);
          }
        }
      }
    }

    // Clean up rate limiting
    actionTimestamps.delete(socket.id);
  });


  // FEATURE 1: Enhanced Invite Friend with Validation
  socket.on('send_game_invite', async ({ roomId, targetUserId }) => {
    const game = games[roomId];
    if (!game) {
      socket.emit('invite_error', { message: 'Game room not found' });
      return;
    }

    const sender = game.players.find(p => p.socketId === socket.id);
    if (!sender) {
      socket.emit('invite_error', { message: 'You are not in this game' });
      return;
    }

    // Check if room has space
    if (game.players.length >= game.tableConfig.maxPlayers) {
      socket.emit('invite_error', { message: 'Room is full' });
      return;
    }

    try {
      // Fetch target user from database
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        socket.emit('invite_error', { message: 'User not found' });
        return;
      }

      // Check if target user is blocked
      const senderUser = await User.findById(sender.userId);
      const targetUserIdObj = targetUser._id;
      if (senderUser?.blockedUsers.some(id => id.toString() === targetUserId)) {
        socket.emit('invite_error', { message: 'Cannot invite blocked user' });
        return;
      }

      // Check if sender is blocked by target
      if (targetUser.blockedUsers.some(id => id.toString() === sender.userId)) {
        socket.emit('invite_error', { message: 'Cannot invite this user' });
        return;
      }

      // Check if target has sufficient balance
      if (targetUser.walletBalance < game.tableConfig.minBalanceToSit) {
        socket.emit('invite_error', {
          message: `Friend doesn't have enough balance. Required: ₹${game.tableConfig.minBalanceToSit}`
        });
        return;
      }

      // Check if target is already in this game
      if (game.getPlayerByUserId(targetUserId)) {
        socket.emit('invite_error', { message: 'User is already in this game' });
        return;
      }

      // Check if target is in another game
      let isInAnotherGame = false;
      for (const otherRoomId in games) {
        if (otherRoomId !== roomId) {
          const otherGame = games[otherRoomId];
          if (otherGame.getPlayerByUserId(targetUserId)) {
            isInAnotherGame = true;
            break;
          }
        }
      }

      if (isInAnotherGame) {
        socket.emit('invite_error', { message: 'User is already in another game' });
        return;
      }

      // Create invite
      const inviteResult = game.createInvite(sender.userId, sender.username, targetUserId);
      if (!inviteResult) {
        socket.emit('invite_error', { message: 'Failed to create invite. Invite may already exist.' });
        return;
      }

      // Send invite to target user (if they're online)
      await guaranteedNotificationService.sendNotification(io, targetUserId, {
        type: 'game_invite',
        sourceUserId: sender.userId,
        data: {
          inviterId: sender.userId,
          inviterName: sender.username,
          inviterAvatar: sender.avatarId,
          tableId: roomId,
          betAmount: game.tableConfig.bootAmount,
          requiresConfirmation: true, // Invites from inside a game usually require jumping
          currentState: 'available', // Will be refined by service/target status
          message: `${sender.username} invited you to join their table!`,
          tableName: game.tableConfig.name,
          tableType: game.tableConfig.tier,
          minBalance: game.tableConfig.minBalanceToSit,
          currentPlayers: game.players.length,
          maxPlayers: game.tableConfig.maxPlayers,
          expiresAt: inviteResult.invite.expiresAt
        }
      });

      socket.emit('invite_sent', {
        targetUserId,
        targetUsername: targetUser.username,
        inviteId: inviteResult.inviteId
      });

    } catch (error) {
      console.error('Error sending invite:', error);
      socket.emit('invite_error', { message: 'Failed to send invite' });
    }
  });

  // Accept game invite
  socket.on('accept_game_invite', async ({ inviteId }) => {
    try {
      // Find the game with this invite
      let targetGame: TeenPattiGame | null = null;
      let invite: any = null;

      for (const roomId in games) {
        const game = games[roomId];
        const foundInvite = game.getInvite(inviteId);
        if (foundInvite) {
          targetGame = game;
          invite = foundInvite;
          break;
        }
      }

      if (!targetGame || !invite) {
        socket.emit('invite_error', { message: 'Invite not found or expired' });
        return;
      }

      // Get user data
      const user = await User.findById(invite.targetUserId);
      if (!user) {
        socket.emit('invite_error', { message: 'User not found' });
        return;
      }

      // Validate user can join
      const canJoin = targetGame.canAcceptPlayer(user._id.toString(), user.walletBalance);
      if (!canJoin.canJoin) {
        socket.emit('invite_error', { message: canJoin.reason || 'Cannot join game' });
        targetGame.removeInvite(inviteId);
        return;
      }

      // Remove the invite
      targetGame.removeInvite(inviteId);

      // Emit match found to redirect user to game
      socket.emit('match_found', { roomId: targetGame.roomId });

      // Notify inviter
      const inviter = targetGame.getPlayerByUserId(invite.inviterId);
      if (inviter) {
        io.to(inviter.socketId).emit('invite_accepted', {
          inviteId,
          acceptedBy: user.username,
          acceptedByAvatar: user.avatarId
        });
      }

    } catch (error) {
      console.error('Error accepting invite:', error);
      socket.emit('invite_error', { message: 'Failed to accept invite' });
    }
  });

  // Reject game invite
  socket.on('reject_game_invite', ({ inviteId }) => {
    // Find the game with this invite
    let targetGame: TeenPattiGame | null = null;
    let invite: any = null;

    for (const roomId in games) {
      const game = games[roomId];
      const foundInvite = game.getInvite(inviteId);
      if (foundInvite) {
        targetGame = game;
        invite = foundInvite;
        break;
      }
    }

    if (!targetGame || !invite) {
      return;
    }

    // Remove the invite
    targetGame.removeInvite(inviteId);

    // Notify inviter
    const inviter = targetGame.getPlayerByUserId(invite.inviterId);
    if (inviter) {
      io.to(inviter.socketId).emit('invite_rejected', {
        inviteId,
        rejectedBy: invite.targetUserId
      });
    }

    socket.emit('invite_rejected_confirm', { inviteId });
  });

  // Cancel game invite (by inviter)
  socket.on('cancel_game_invite', ({ inviteId }) => {
    // Find the game with this invite
    let targetGame: TeenPattiGame | null = null;
    let invite: any = null;

    for (const roomId in games) {
      const game = games[roomId];
      const foundInvite = game.getInvite(inviteId);
      if (foundInvite) {
        targetGame = game;
        invite = foundInvite;
        break;
      }
    }

    if (!targetGame || !invite) {
      return;
    }

    // Verify the canceller is the inviter
    const player = targetGame.players.find(p => p.socketId === socket.id);
    if (!player || player.userId !== invite.inviterId) {
      return;
    }

    // Remove the invite
    targetGame.removeInvite(inviteId);

    // Notify target user
    io.to(invite.targetUserId).emit('invite_cancelled', {
      inviteId,
      roomId: targetGame.roomId
    });

    socket.emit('invite_cancelled_confirm', { inviteId });
  });

  // Get pending invites for current user
  socket.on('get_pending_invites', async ({ userId }) => {
    const pendingInvites: any[] = [];

    // Search all games for invites to this user
    for (const roomId in games) {
      const game = games[roomId];
      const userInvites = game.getPendingInvitesForUser(userId);

      userInvites.forEach(invite => {
        pendingInvites.push({
          ...invite,
          tableName: game.tableConfig.name,
          tableType: game.tableConfig.tier,
          bootAmount: game.tableConfig.bootAmount,
          currentPlayers: game.players.length,
          maxPlayers: game.tableConfig.maxPlayers
        });
      });
    }

    socket.emit('pending_invites', { invites: pendingInvites });
  });


  // Start Global Game Loop (once)
  if (!isGameLoopRunning) {
    isGameLoopRunning = true;
    console.log('Starting global game loop...');

    setInterval(() => {
      for (const roomId in games) {
        const game = games[roomId];
        if (game.gameState === 'PLAYING') {
          const currentPlayer = game.players[game.currentTurnIndex];
          // Check dynamic turn limit
          if (Date.now() - game.turnStartTime > game.turnTimeLimit) {
            console.log(`Auto-folding player ${currentPlayer.username} due to timeout`);

            // Fold the player (this may change game state to FINISHED)
            game.fold(currentPlayer.socketId);

            // Capture state after fold (may have changed) - use type assertion to avoid TS narrowing issue
            const gameStateAfterFold = game.gameState as 'WAITING' | 'PLAYING' | 'FINISHED';

            io.to(roomId).emit('turn_played', {
              playerId: currentPlayer.userId,
              action: 'fold (timeout)',
              nextTurn: gameStateAfterFold === 'FINISHED' ? null : game.players[game.currentTurnIndex].userId,
              turnStartTime: game.turnStartTime,
              turnDuration: game.turnTimeLimit
            });

            // Optional: Explicit timeout event for UI animations
            io.to(roomId).emit('turn_timeout', {
              playerId: currentPlayer.userId
            });

            // Notify player about timeout (if enabled)
            emitIfAllowed(io, currentPlayer.userId, 'game_notification', {
              type: 'turn_timeout',
              message: 'You have been folded due to timeout'
            }, 'game.turnTimerWarning');

            // Check if game ended after fold (ROUND_END check matches other logic)
            if (gameStateAfterFold !== 'PLAYING' && gameStateAfterFold !== 'WAITING') {
              const winner = game.players.find(p => p.active && !p.folded);
              if (winner && game.roundResult) {
                // Send round result instead of game_over
                io.to(roomId).emit('round_result', {
                  winner: {
                    userId: winner.userId,
                    username: winner.username,
                    avatarId: winner.avatarId
                  },
                  reason: 'fold (timeout)',
                  pot: game.roundResult.pot || game.pot,
                  delay: game.roundEndDelay,
                  playerHands: game.roundResult.playerHands || []
                });

                io.to(winner.socketId).emit('your_balance', winner.balance);

                // Sync Stats to DB - CORRECTED ARGUMENTS
                syncGameResultToDb(winner.userId, game.players, roomId, game.pot, game.tableConfig.id);

                // Schedule next round
                setTimeout(() => {
                  if (game.startNextRound()) {
                    const fullState = game.getFullGameState();
                    io.to(roomId).emit('next_round_start', fullState);

                    // Send cards to remaining players
                    game.players.forEach(p => {
                      io.to(p.socketId).emit('your_cards', p.hand);
                      io.to(p.socketId).emit('your_balance', p.balance);
                    });
                  }
                }, game.roundEndDelay);
              }
            }
          }
        }
      }
    }, 1000);
  }
}

