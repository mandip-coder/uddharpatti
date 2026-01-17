import { Card, createDeck, shuffleDeck } from './cardUtils';
import { compareHands, evaluateHand, getHandName } from './handEvaluator';
import { TableConfig } from '../config/tableConfig';

interface Player {
  socketId: string;
  userId: string;
  username: string;
  avatarId: string;
  hand: Card[];
  folded: boolean;
  active: boolean; // if they are in the current hand
  balance: number; // Table balance (chips)
  currentBet: number;
  isSeen: boolean; // Has the player looked at their cards?
  seatIndex: number; // 0-5
  sideShowRequest?: {
    from: string; // socketId of requester
    timestamp: number;
  };
}

export interface PublicPlayer {
  socketId: string;
  userId: string;
  username: string;
  avatarId: string;
  active: boolean;
  folded: boolean;
  currentBet: number;
  cardCount: number;
  isSeen: boolean;
  seatIndex: number;
}

export interface RoundResult {
  winner: Player;
  reason: 'fold' | 'show' | 'side_show' | 'timeout' | 'player_exit';
  pot: number;
  timestamp: number;
  actionSourceUserId?: string; // Optional: userId of player who caused the round end (folder/leaver)
  // Card reveal data for showdown transparency
  playerHands?: Array<{
    userId: string;
    username: string;
    avatarId: string;
    hand: Card[];
    handName: string;
    isWinner: boolean;
  }>;
}

export interface BetOptions {
  chaal: number;
  raise2x: number;
  raise4x: number;
  minBet: number; // For slider
  maxBet: number; // For slider
  canShow: boolean;
  showCost?: number;
  canSideShow: boolean;
  sideShowTarget?: string; // userId of eligible target
  allIn?: number; // If player can't afford minimum bet
}

// UNIFIED GAME STATE CONTRACT
export interface PublicGameState {
  roomId: string;
  gameState: 'WAITING' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  pot: number;
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  currentStake: number;
  turnStartTime: number;
  turnDuration: number;
  players: PublicPlayer[];
  roundResult: RoundResult | null;
  timerExpiresAt: number; // Server timestamp for turn expiry
}

export interface GameInvite {
  inviteId: string;
  roomId: string;
  inviterId: string;
  inviterName: string;
  targetUserId: string;
  timestamp: number;
  expiresAt: number;
}

export class TeenPattiGame {
  roomId: string;
  players: Player[];
  deck: Card[];
  pot: number;
  currentTurnIndex: number;
  gameState: 'WAITING' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  currentStake: number; // Current bet amount required
  turnStartTime: number;
  turnTimeLimit: number = 30000; // 30 Seconds (RULE 1)
  rake: number = 0.02; // 2% House Fee
  userIdToSocketId: Map<string, string>; // Track current socket per user for reconnection
  roundResult: RoundResult | null; // Track round result for display
  roundEndDelay: number = 5000; // 5 seconds delay before next round
  pendingInvites: Map<string, GameInvite>; // Track pending invites by inviteId

  // Timer for strict turn enforcement
  private turnTimer: NodeJS.Timeout | null = null;
  private eventEmitter: ((eventName: string, data: any) => void) | null = null;

  // Constants
  readonly blindBetMultiplier: number = 1;
  readonly seenBetMultiplier: number = 2;
  readonly maxRaises: number = 10;

  raiseCount: number = 0;

  tableConfig: TableConfig;

  constructor(roomId: string, config: TableConfig) {
    this.roomId = roomId;
    this.tableConfig = config;
    this.players = [];
    this.deck = [];
    this.pot = 0;
    this.currentTurnIndex = 0;
    this.gameState = 'WAITING';
    this.currentStake = 0;
    this.turnStartTime = 0;
    this.turnTimeLimit = 30000; // 30 Seconds
    this.raiseCount = 0;
    this.userIdToSocketId = new Map();
    this.roundResult = null;
    this.roundEndDelay = 5000;
    this.pendingInvites = new Map();
  }

  // Hook for socket events
  setEventEmitter(emitter: (eventName: string, data: any) => void) {
    this.eventEmitter = emitter;
  }

  // CLEANUP: Dispose of resources
  cleanup() {
    this.clearTurnTimer();
    this.eventEmitter = null;
    this.userIdToSocketId.clear();
    this.pendingInvites.clear();
    console.log(`[GAME_CLEANUP] Resources disposed for room ${this.roomId}`);
  }

  // RULE 1: Server-side Timer Management
  private startTurnTimer() {
    this.clearTurnTimer();

    if (this.gameState !== 'PLAYING') return;

    this.turnStartTime = Date.now();

    // Auto-chaal after timeout
    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, this.turnTimeLimit);
  }

  private clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  // RULE 2 & 3: Handle Timeout with Auto-Chaal
  private handleTurnTimeout() {
    if (this.gameState !== 'PLAYING') return;

    const currentPlayer = this.players[this.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.active || currentPlayer.folded) return;

    console.log(`Turn timeout for ${currentPlayer.username}. Executing Auto-Chaal.`);

    // Determine Auto-Action (Chaal or All-In)
    const options = this.getValidBetOptions(currentPlayer.socketId);
    if (!options) {
      // Should not happen if game logic is correct, but safety fallback: Fold
      console.error(`No valid options for ${currentPlayer.username} on timeout. Forcing fold.`);
      this.fold(currentPlayer.socketId);
      return;
    }

    // Default to Chaal, fallback to All-In if unaffordable
    let amount = options.chaal;
    let actionType = 'auto_chaal';

    if (currentPlayer.balance < amount) {
      amount = currentPlayer.balance;
      actionType = 'auto_all_in';
    }

    // Execute the bet
    const betSuccess = this.placeBet(currentPlayer.socketId, amount, true); // true = isAutoAction

    if (betSuccess) {
      // Notify via event hook
      if (this.eventEmitter) {
        this.eventEmitter('auto_action', {
          playerId: currentPlayer.userId,
          action: actionType,
          amount: amount,
          pot: this.pot,
          currentStake: this.currentStake,
          nextTurn: this.players[this.currentTurnIndex].userId,
          turnStartTime: this.turnStartTime,
          turnDuration: this.turnTimeLimit
        });

        // Also emit standard turn played for frontend consistency
        this.eventEmitter('turn_played', {
          playerId: currentPlayer.userId,
          action: 'bet', // generic bet for compatibility
          amount,
          pot: this.pot,
          currentStake: this.currentStake,
          nextTurn: this.players[this.currentTurnIndex].userId,
          turnStartTime: this.turnStartTime,
          turnDuration: this.turnTimeLimit,
          isAutoAction: true
        });

        // RULE 1: Emit Full Game State Update
        this.eventEmitter('game_update', this.getPublicGameState());

        // Update balance for the specific player
        // Note: We can't emit to specific socket here easily without passing io.
      }
    } else {
      // If bet failed for some reason, Fold to prevent stuck state
      this.fold(currentPlayer.socketId);
    }
  }

  addPlayer(socketId: string, userId: string, username: string, balance: number, avatarId: string): { player: Player; autoStart: boolean } {
    // Find first available seat
    const takenSeats = this.players.map(p => p.seatIndex);
    let seatIndex = 0;
    while (takenSeats.includes(seatIndex)) {
      seatIndex++;
    }

    const player: Player = {
      socketId,
      userId,
      username,
      avatarId,
      hand: [],
      folded: false,
      active: false,
      balance,
      currentBet: 0,
      isSeen: false,
      seatIndex
    };
    this.players.push(player);
    this.userIdToSocketId.set(userId, socketId); // Track userId to socketId mapping

    // RULE 2: Auto-start when minimum players condition is met
    // Improved logic: Check >= minPlayers to handle race conditions where multiple join quickly
    const shouldAutoStart = this.players.length >= this.tableConfig.minPlayers && this.gameState === 'WAITING';

    return { player, autoStart: shouldAutoStart };
  }

  // RULE 3: Enhanced removePlayer with auto-win detection
  removePlayer(socketId: string): { removedPlayer: Player | null; autoWinner: Player | null } {
    const removedPlayer = this.players.find(p => p.socketId === socketId) || null;
    this.players = this.players.filter((p) => p.socketId !== socketId);

    // Clean up userId mapping
    if (removedPlayer) {
      this.userIdToSocketId.delete(removedPlayer.userId);
    }

    let autoWinner: Player | null = null;

    // If game is in progress and player was active
    if (this.gameState === 'PLAYING' && removedPlayer?.active) {
      const activePlayers = this.players.filter(p => p.active && !p.folded);

      // RULE 3: Auto-win if only one player remains
      if (activePlayers.length === 1) {
        autoWinner = activePlayers[0];
        this.finishGame(autoWinner, 'player_exit', removedPlayer.userId);
      } else if (activePlayers.length > 1) {
        // Game continues, adjust turn if needed
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
        }
        this.nextTurn();
      }
    }

    if (this.players.length < this.tableConfig.minPlayers) {
      this.gameState = 'WAITING';
    }

    return { removedPlayer, autoWinner };
  }

  // Get player by userId (for reconnection detection)
  getPlayerByUserId(userId: string): Player | null {
    return this.players.find(p => p.userId === userId) || null;
  }

  // Reconnect player with new socket ID
  reconnectPlayer(userId: string, newSocketId: string): { player: Player; reconnected: true } | null {
    const player = this.getPlayerByUserId(userId);
    if (!player) return null;

    // Update socket ID
    const oldSocketId = player.socketId;
    player.socketId = newSocketId;
    this.userIdToSocketId.set(userId, newSocketId);

    console.log(`Player ${player.username} reconnected. Old socket: ${oldSocketId}, New socket: ${newSocketId}`);

    return { player, reconnected: true };
  }

  // Get full game state for reconnection
  getFullGameState() {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      pot: this.pot,
      currentStake: this.currentStake,
      currentTurn: this.gameState === 'PLAYING' && this.players.length > 0
        ? this.players[this.currentTurnIndex]?.userId
        : null,
      turnStartTime: this.turnStartTime,
      turnDuration: this.turnTimeLimit,
      raiseCount: this.raiseCount,
      players: this.getPublicPlayerData(),
      roundResult: this.roundResult
    };
  }

  // Exit player (voluntary leave)
  exitPlayer(userId: string, isVoluntary: boolean): {
    exitedPlayer: Player | null;
    autoWinner: Player | null;
    wasInRound: boolean;
  } {
    const player = this.getPlayerByUserId(userId);
    if (!player) return { exitedPlayer: null, autoWinner: null, wasInRound: false };

    const wasInRound = this.gameState === 'PLAYING' && player.active;

    // Remove player
    this.players = this.players.filter(p => p.userId !== userId);
    this.userIdToSocketId.delete(userId);

    let autoWinner: Player | null = null;

    // If exiting during active round, trigger auto-win
    if (wasInRound) {
      const activePlayers = this.players.filter(p => p.active && !p.folded);
      if (activePlayers.length === 1) {
        autoWinner = activePlayers[0];
        this.finishGame(autoWinner, 'player_exit', userId);
      } else if (activePlayers.length > 1) {
        // Game continues with remaining players
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
        }
        this.nextTurn();
      }
    }

    // Check if we need to reset to WAITING
    if (this.players.length < this.tableConfig.minPlayers && this.gameState !== 'ROUND_END') {
      this.gameState = 'WAITING';
    }

    return { exitedPlayer: player, autoWinner, wasInRound };
  }

  startGame(): boolean {
    console.log(`[START_GAME] Attempting to start game. Players: ${this.players.length}, MinPlayers: ${this.tableConfig.minPlayers}`);

    if (this.players.length < this.tableConfig.minPlayers) {
      console.log(`[START_GAME] Failed: Not enough players (${this.players.length}/${this.tableConfig.minPlayers})`);
      return false;
    }

    this.gameState = 'PLAYING';
    this.deck = shuffleDeck(createDeck());
    this.pot = 0;
    this.currentStake = this.tableConfig.bootAmount;
    this.raiseCount = 0;

    // Deal cards (3 each) and collect boot
    this.players.forEach((player) => {
      player.active = true;
      player.folded = false;
      player.isSeen = false;
      player.hand = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
      player.currentBet = 0;
      player.sideShowRequest = undefined;

      // Deduct boot amount
      if (player.balance >= this.tableConfig.bootAmount) {
        player.balance -= this.tableConfig.bootAmount;
        this.pot += this.tableConfig.bootAmount;
      }
    });

    this.currentTurnIndex = 0;
    this.turnStartTime = Date.now();
    this.startTurnTimer(); // RULE 1: Start timer for first player

    console.log(`[START_GAME] ✅ Game started successfully! Pot: ${this.pot}, CurrentTurn: ${this.currentTurnIndex}`);
    return true;
  }

  // RULE 1: Get sanitized player data (no opponent balances)
  getPublicPlayerData(): PublicPlayer[] {
    return this.players.map(p => ({
      socketId: p.socketId,
      userId: p.userId,
      username: p.username,
      avatarId: p.avatarId,
      active: p.active,
      folded: p.folded,
      currentBet: p.currentBet,
      cardCount: p.hand.length,
      isSeen: p.isSeen,
      seatIndex: p.seatIndex
    }));
  }

  // RULE 1: SINGLE SOURCE OF TRUTH
  getPublicGameState(): PublicGameState {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      pot: this.pot,
      currentTurnIndex: this.currentTurnIndex,
      currentTurnPlayerId: this.gameState === 'PLAYING' && this.players[this.currentTurnIndex] ? this.players[this.currentTurnIndex].userId : null,
      currentStake: this.currentStake,
      turnStartTime: this.turnStartTime,
      turnDuration: this.turnTimeLimit,
      timerExpiresAt: this.turnStartTime + this.turnTimeLimit,
      players: this.getPublicPlayerData(),
      roundResult: this.roundResult
    };
  }

  // RULE 1: Get private data for specific player only
  getPlayerPrivateData(socketId: string): { balance: number; hand: Card[] } | null {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player) return null;

    return {
      balance: player.balance,
      hand: player.hand,
    };
  }

  // RULE 4: Calculate valid bet options based on game state
  getValidBetOptions(socketId: string): BetOptions | null {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || !player.active || player.folded) return null;

    // Check if it's player's turn
    if (this.players[this.currentTurnIndex].socketId !== socketId) return null;

    // RULE: If ALL active players are seen, everyone pays 1x (blind rate)
    // Otherwise, Seen players pay 2x, Blind players pay 1x
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    const areAllSeen = activePlayers.every(p => p.isSeen);

    // If I am seen, and not everyone is seen (meaning there is a blind player), I pay 2x.
    // If everyone is seen, I pay 1x.
    // If I am blind, I always pay 1x.
    const multiplier = (player.isSeen && !areAllSeen) ? this.seenBetMultiplier : this.blindBetMultiplier;
    const baseStake = this.currentStake || this.tableConfig.bootAmount;

    // Chaal: Match current stake with multiplier
    const chaal = baseStake * multiplier;

    // Raises: 2x and 4x the chaal amount
    const raise2x = chaal * 2;
    const raise4x = chaal * 4;

    // Check if player can afford minimum bet
    let allIn: number | undefined;
    if (player.balance < chaal) {
      allIn = player.balance; // Player must go all-in
    }

    // Can show if only 2 active players remain and player has bet at least once
    // Can show if only 2 active players remain and player has bet at least once
    // activePlayers is already defined above
    const canShow = activePlayers.length === 2 && player.currentBet > 0;

    // RULE 5: Can side show if eligible
    // STRICT RULE: Only possible if MORE THAN 2 active players remain.
    // If only 2 active players, you must either Chaal or Show.
    const canSideShow = activePlayers.length > 2 && this.canRequestSideShow(socketId);
    const sideShowTarget = canSideShow ? this.getSideShowTarget(socketId) : undefined;

    return {
      chaal: Math.min(chaal, player.balance),
      raise2x: Math.min(raise2x, player.balance),
      raise4x: Math.min(raise4x, player.balance),
      minBet: Math.min(chaal, player.balance), // Custom slider lower bound
      maxBet: player.balance, // Custom slider upper bound (Balance Limit)
      canShow,
      showCost: canShow ? chaal : undefined,
      canSideShow,
      sideShowTarget,
      allIn,
    };
  }

  placeBet(socketId: string, amount: number, isAutoAction: boolean = false): boolean {
    const player = this.players.find((p) => p.socketId === socketId);
    if (!player || !player.active || player.folded) return false;

    // Check turn
    if (this.players[this.currentTurnIndex].socketId !== socketId) return false;

    // Validate amount is positive and not NaN
    if (!amount || amount <= 0 || isNaN(amount)) return false;

    // Validate player has sufficient balance
    if (player.balance < amount) return false;

    // RULE 4: Validate bet against calculated options
    // Skip validating "your turn" again if it's auto-action (we already checked in handleTimeout)
    // but keep existing checks for safety.

    // Clear timer immediately on valid action attempt to prevent race conditions
    // Only if explicit manual action. For auto-action, timer effectively ended.
    if (!isAutoAction) {
      this.clearTurnTimer();
    }

    const options = this.getValidBetOptions(socketId);
    if (!options) {
      if (!isAutoAction) this.startTurnTimer(); // Resume if invalid
      return false;
    }

    // Allow exact match to any valid option or all-in
    // FIX: Allow any amount between minBet (chaal) and maxBet (balance) for Custom Slider
    if (!isAutoAction) {
      if (options.allIn && amount === options.allIn) {
        // Valid all-in
      } else if (amount >= options.minBet && amount <= options.maxBet) {
        // Valid range
      } else {
        console.log(`Invalid bet amount: ${amount}. Valid Range: ${options.minBet} - ${options.maxBet}`);
        this.startTurnTimer(); // Resume if invalid
        return false;
      }
    }

    // Track raises - only increment when bet is above chaal amount
    // RULE RE-CHECK: Use exact same multiplier logic as getValidBetOptions
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    const areAllSeen = activePlayers.every(p => p.isSeen);
    const multiplier = (player.isSeen && !areAllSeen) ? this.seenBetMultiplier : this.blindBetMultiplier;

    const chaalAmount = (this.currentStake || this.tableConfig.bootAmount) * multiplier;

    if (amount > chaalAmount) {
      this.raiseCount++;
    }

    player.balance -= amount;
    player.currentBet += amount;
    this.pot += amount;

    // Update current stake - normalize by dividing by multiplier
    const normalizedStake = amount / multiplier;
    this.currentStake = Math.max(this.currentStake, normalizedStake);

    this.nextTurn();
    return true;
  }

  // Mark player as having seen their cards
  seeCards(socketId: string): boolean {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || !player.active || player.folded) return false;

    player.isSeen = true;
    return true;
  }

  // RULE 5: Side show eligibility check
  canRequestSideShow(socketId: string): boolean {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || !player.active || player.folded || !player.isSeen) return false;

    // Must have bet at least once
    if (player.currentBet === 0) return false;

    // Must be at least 2 active players
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    if (activePlayers.length < 2) return false;

    // Find previous active player
    const target = this.getPreviousActivePlayer(socketId);
    if (!target || !target.isSeen) return false;

    return true;
  }

  // Get the eligible side show target (previous active player)
  getSideShowTarget(socketId: string): string | undefined {
    const target = this.getPreviousActivePlayer(socketId);
    return target?.userId;
  }

  getPreviousActivePlayer(socketId: string): Player | null {
    const currentIndex = this.players.findIndex(p => p.socketId === socketId);
    if (currentIndex === -1) return null;

    let checkIndex = currentIndex - 1;
    if (checkIndex < 0) checkIndex = this.players.length - 1;

    let loopCount = 0;
    while (loopCount < this.players.length) {
      const player = this.players[checkIndex];
      if (player.active && !player.folded && player.socketId !== socketId) {
        return player;
      }
      checkIndex--;
      if (checkIndex < 0) checkIndex = this.players.length - 1;
      loopCount++;
    }

    return null;
  }

  // RULE 5: Request side show
  requestSideShow(requesterId: string, targetId: string): boolean {
    const requester = this.players.find(p => p.socketId === requesterId);
    const target = this.players.find(p => p.userId === targetId);

    if (!requester || !target) return false;
    if (!this.canRequestSideShow(requesterId)) return false;

    // Set side show request
    target.sideShowRequest = {
      from: requesterId,
      timestamp: Date.now(),
    };

    return true;
  }

  // RULE 5: Respond to side show
  respondToSideShow(targetSocketId: string, accept: boolean): { accepted: boolean; winner?: Player; loser?: Player } | null {
    const target = this.players.find(p => p.socketId === targetSocketId);
    if (!target || !target.sideShowRequest) return null;

    const requester = this.players.find(p => p.socketId === target.sideShowRequest!.from);
    if (!requester) return null;

    // Clear request
    target.sideShowRequest = undefined;

    if (!accept) {
      return { accepted: false };
    }

    // Resolve side show
    return this.resolveSideShow(requester, target);
  }

  // RULE 5: Resolve side show (compare hands)
  resolveSideShow(player1: Player, player2: Player): { accepted: true; winner: Player; loser: Player } {
    const result = compareHands(player1.hand, player2.hand);

    let winner: Player;
    let loser: Player;

    if (result > 0) {
      // Player 1 wins
      winner = player1;
      loser = player2;
    } else if (result < 0) {
      // Player 2 wins
      winner = player2;
      loser = player1;
    } else {
      // Tie: Challenger (player1) loses
      winner = player2;
      loser = player1;
    }

    // Loser folds
    loser.folded = true;
    loser.active = false;

    // Check if game ends
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    if (activePlayers.length === 1) {
      this.finishGame(activePlayers[0], 'side_show');
    }

    // Side show counts as a turn.
    // However, usually we wait for response.
    // If we are here, response received and resolved.
    // Turn should pass to NEXT player after this resolution.
    this.nextTurn();

    return { accepted: true, winner, loser };
  }

  // Show (final showdown)
  show(socketId: string): { winner: Player; results: Array<{ player: Player; handName: string }> } | null {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || !player.active || player.folded) return null;

    const options = this.getValidBetOptions(socketId);
    if (!options?.canShow) return null;

    // RULE: Show is NOT free. Must pay Chaal amount.
    const showCost = options.showCost || 0;
    if (player.balance < showCost) {
      console.log(`[SHOW_REJECTED] Player ${player.username} has insufficient balance for show. Req: ${showCost}, Has: ${player.balance}`);
      return null;
    }

    // Get all active players
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    if (activePlayers.length < 2) return null;

    // DEDUCT SHOW COST
    player.balance -= showCost;
    player.currentBet += showCost;
    this.pot += showCost;

    console.log(`[SHOW_ACCEPTED] Players: ${player.username}, Cost: ${showCost}, NewPot: ${this.pot}`);

    // Compare all hands
    let winner = activePlayers[0];
    const results = activePlayers.map(p => ({
      player: p,
      handName: getHandName(p.hand),
    }));

    for (let i = 1; i < activePlayers.length; i++) {
      if (compareHands(activePlayers[i].hand, winner.hand) > 0) {
        winner = activePlayers[i];
      }
    }

    this.finishGame(winner, 'show');
    this.clearTurnTimer(); // Game Over

    return { winner, results };
  }

  // RULE 6: Fold (already correct - game continues)
  fold(socketId: string): boolean {
    const player = this.players.find((p) => p.socketId === socketId);
    if (!player || !player.active) return false;

    // Check turn
    if (this.players[this.currentTurnIndex].socketId !== socketId) return false;

    this.clearTurnTimer(); // Valid fold action

    player.folded = true;
    player.active = false;

    // RULE 6: Check if only one player left
    const activePlayers = this.players.filter(p => p.active && !p.folded);
    if (activePlayers.length === 1) {
      // Winner declared
      this.finishGame(activePlayers[0], 'fold', player.userId);
    } else {
      // Game continues
      this.nextTurn();
    }
    return true;
  }

  nextTurn() {
    let loopCount = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      loopCount++;
    } while ((!this.players[this.currentTurnIndex].active || this.players[this.currentTurnIndex].folded) && loopCount < this.players.length);
    this.turnStartTime = Date.now();
    this.startTurnTimer(); // Start timer for new turn
  }

  finishGame(winner: Player, reason: 'fold' | 'show' | 'side_show' | 'timeout' | 'player_exit' = 'fold', actionSourceUserId?: string) {
    this.gameState = 'ROUND_END'; // Set to ROUND_END, not FINISHED

    // Determine if we should reveal cards (for transparency)
    // RULE 2: ALWAYS Reveal Cards at Round End (Transparency)
    // Only exception might be if no cards were dealt yet, but 'activePlayers' handles that.
    // We include ALL players who have cards, even if folded.
    const playersWithCards = this.players.filter(p => p.hand && p.hand.length > 0);

    const playerHands = playersWithCards.map(p => ({
      userId: p.userId,
      username: p.username,
      avatarId: p.avatarId,
      hand: p.hand,
      handName: getHandName(p.hand),
      isWinner: p.userId === winner.userId,
      isFolded: p.folded // Add metadata if needed by frontend
    }));

    // Store round result for display
    this.roundResult = {
      winner,
      reason,
      pot: this.pot,
      timestamp: Date.now(),
      actionSourceUserId,
      playerHands
    };

    // Apply rake
    const houseFee = Math.floor(this.pot * this.rake);
    const winningAmount = this.pot - houseFee;

    winner.balance += winningAmount;
    console.log(`Round Finished. Winner: ${winner.username}, Pot: ${this.pot}, Fee: ${houseFee}, Won: ${winningAmount}, Reason: ${reason}`);
  }

  // RULE 1: Post-round balance validation
  // Returns list of removed players
  validateBalances(): Player[] {
    const minBalance = this.tableConfig.bootAmount; // Or minBalanceToSit
    // Use minBalanceToSit as the strict rule, or bootAmount if lenient.
    // Prompt says: "At least the minimum required bet / chaal for the next round".
    // Usually that's the Boot Amount.
    const limit = this.tableConfig.bootAmount;

    const removedPlayers: Player[] = [];
    const remainingPlayers: Player[] = [];

    for (const player of this.players) {
      if (player.balance < limit) {
        removedPlayers.push(player);
        // Clean up mappings
        this.userIdToSocketId.delete(player.userId);
      } else {
        remainingPlayers.push(player);
      }
    }

    this.players = remainingPlayers;

    // Check if we need to reset to WAITING if players dropped below min
    if (this.players.length < this.tableConfig.minPlayers) {
      // We do this check in startNextRound usually, but good to have state consistent
    }

    if (removedPlayers.length > 0) {
      console.log(`[BALANCE_CHECK] Removed ${removedPlayers.length} players due to insufficient balance.`);
    }

    return removedPlayers;
  }

  // Start next round after result display
  startNextRound(): { started: boolean; removedPlayers: Player[] } {
    if (this.gameState !== 'ROUND_END') return { started: false, removedPlayers: [] };

    // RULE 1: Validate balances BEFORE starting next round
    const removedPlayers = this.validateBalances();

    if (this.players.length < this.tableConfig.minPlayers) {
      this.gameState = 'WAITING';
      this.roundResult = null;
      return { started: false, removedPlayers };
    }

    // Reset for next round
    this.gameState = 'WAITING';
    this.roundResult = null;

    // Auto-start if enough players
    if (this.players.length >= this.tableConfig.minPlayers) {
      const started = this.startGame();
      return { started, removedPlayers };
    }

    return { started: false, removedPlayers };
  }

  // Reset for next round
  resetForNextRound(): boolean {
    if (this.players.length < this.tableConfig.minPlayers) return false;

    this.gameState = 'WAITING';
    this.deck = [];
    this.pot = 0;
    this.currentStake = 0;
    this.currentTurnIndex = 0;
    this.raiseCount = 0;

    this.players.forEach(p => {
      p.hand = [];
      p.active = false;
      p.folded = false;
      p.currentBet = 0;
      p.isSeen = false;
      p.sideShowRequest = undefined;
    });

    return true;
  }

  // INVITE MANAGEMENT METHODS

  // Get number of empty chairs
  getEmptyChairCount(): number {
    return this.tableConfig.maxPlayers - this.players.length;
  }

  // Check if a player can be added to the game
  canAcceptPlayer(userId: string, balance: number): { canJoin: boolean; reason?: string } {
    // Check if player is already in the game
    if (this.getPlayerByUserId(userId)) {
      return { canJoin: false, reason: 'Already in this game' };
    }

    // Check if room is full
    if (this.players.length >= this.tableConfig.maxPlayers) {
      return { canJoin: false, reason: 'Room is full' };
    }

    // Check if player has sufficient balance
    if (balance < this.tableConfig.minBalanceToSit) {
      return { canJoin: false, reason: `Insufficient balance. Minimum required: ₹${this.tableConfig.minBalanceToSit}` };
    }

    // Check if game allows joining (only in WAITING state for now)
    if (this.gameState === 'PLAYING') {
      return { canJoin: false, reason: 'Game is in progress. Please wait for next round.' };
    }

    return { canJoin: true };
  }

  // Create a new invite
  createInvite(inviterId: string, inviterName: string, targetUserId: string): { invite: GameInvite; inviteId: string } | null {
    // Check if inviter is in the game
    const inviter = this.getPlayerByUserId(inviterId);
    if (!inviter) {
      return null;
    }

    // Check if room has space
    if (this.players.length >= this.tableConfig.maxPlayers) {
      return null;
    }

    // Check if invite already exists for this target
    const existingInvite = Array.from(this.pendingInvites.values()).find(
      inv => inv.targetUserId === targetUserId && inv.roomId === this.roomId
    );
    if (existingInvite) {
      return null; // Prevent duplicate invites
    }

    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invite: GameInvite = {
      inviteId,
      roomId: this.roomId,
      inviterId,
      inviterName,
      targetUserId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000 // 60 seconds expiry
    };

    this.pendingInvites.set(inviteId, invite);
    return { invite, inviteId };
  }

  // Get invite by ID
  getInvite(inviteId: string): GameInvite | null {
    return this.pendingInvites.get(inviteId) || null;
  }

  // Remove expired invites
  cleanupExpiredInvites(): string[] {
    const now = Date.now();
    const expiredInviteIds: string[] = [];

    this.pendingInvites.forEach((invite, inviteId) => {
      if (now > invite.expiresAt) {
        expiredInviteIds.push(inviteId);
        this.pendingInvites.delete(inviteId);
      }
    });

    return expiredInviteIds;
  }

  // Remove invite
  removeInvite(inviteId: string): boolean {
    return this.pendingInvites.delete(inviteId);
  }

  // Get all pending invites for a user
  getPendingInvitesForUser(userId: string): GameInvite[] {
    const invites: GameInvite[] = [];
    this.pendingInvites.forEach(invite => {
      if (invite.targetUserId === userId) {
        invites.push(invite);
      }
    });
    return invites;
  }

  // Cancel all invites from a specific user (when they leave)
  cancelInvitesFromUser(userId: string): string[] {
    const cancelledInviteIds: string[] = [];
    this.pendingInvites.forEach((invite, inviteId) => {
      if (invite.inviterId === userId) {
        cancelledInviteIds.push(inviteId);
        this.pendingInvites.delete(inviteId);
      }
    });
    return cancelledInviteIds;
  }

  // ==========================================
  // NEXT ROUND CONSENT FLOW
  // ==========================================

  // Map to track consent status: userId -> status
  playerConsents: Map<string, 'PENDING' | 'READY' | 'DENIED'> = new Map();
  consentTimer: NodeJS.Timeout | null = null;
  consentTimeoutMs: number = 5000; // 5 seconds

  // Initialize consent phase after round end
  initiateConsentPhase() {
    this.playerConsents.clear();

    // Set all active players to PENDING
    this.players.forEach(p => {
      this.playerConsents.set(p.userId, 'PENDING');
    });

    console.log(`[CONSENT] Phase initiated for Room ${this.roomId}. Waiting for ${this.playerConsents.size} players.`);
  }

  // Handle player response
  handlePlayerConsent(userId: string, isConsenting: boolean): { allReady: boolean; removedPlayerId?: string } {
    if (this.gameState !== 'ROUND_END') return { allReady: false };

    if (isConsenting) {
      this.playerConsents.set(userId, 'READY');
      console.log(`[CONSENT] Player ${userId} ACCEPTED.`);
    } else {
      this.playerConsents.set(userId, 'DENIED');
      console.log(`[CONSENT] Player ${userId} DENIED. Removing from game.`);

      // Remove player immediately
      const player = this.getPlayerByUserId(userId);
      if (player) {
        this.removePlayer(player.socketId);
        // Also remove from consents map so we don't wait for them (though logic checks size vs logged consents)
        this.playerConsents.delete(userId);
        return { allReady: this.checkAllReady(), removedPlayerId: userId };
      }
    }

    return { allReady: this.checkAllReady() };
  }

  // Check if all remaining players are READY
  private checkAllReady(): boolean {
    // If no players left, we can't start
    if (this.players.length === 0) return false;

    // Check if any player is still PENDING
    // Note: We only care about players currently in the game.
    // Use this.players source of truth.
    for (const player of this.players) {
      const status = this.playerConsents.get(player.userId);
      if (status !== 'READY') {
        return false;
      }
    }
    return true;
  }

  // Handle Timeout - Auto Accept everyone who is PENDING
  handleConsentTimeout(): boolean {
    if (this.gameState !== 'ROUND_END') return false;

    console.log(`[CONSENT] Timeout triggered. Auto-accepting pending players.`);

    let changed = false;
    this.players.forEach(p => {
      const status = this.playerConsents.get(p.userId);
      if (!status || status === 'PENDING') {
        this.playerConsents.set(p.userId, 'READY');
        console.log(`[CONSENT] Auto-accepted player ${p.username} (${p.userId})`);
        changed = true;
      }
    });

    return true; // Always proceed to start round check after timeout
  }
}
