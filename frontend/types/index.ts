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
  winner: {
    userId: string;
    username: string;
    avatarId: string;
  };
  reason: 'fold' | 'show' | 'side_show' | 'timeout' | 'player_exit';
  pot: number;
  timestamp: number;
  playerHands?: Array<{
    userId: string;
    username: string;
    avatarId: string;
    hand: any[]; // Card[]
    handName: string;
    isWinner: boolean;
  }>;
}

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
  timerExpiresAt?: number;
}

// ... existing types
export interface User {
  id: string;
  username: string;
  email: string;
  walletBalance: number;
  avatarId?: string;
  createdAt: string;
  stats?: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalWinnings: number;
  };
  debtSummary?: {
    activeCount: number;
    totalAmount: number;
  };
  joinedAt?: string;
  friends?: any[];
}

export interface AuthResponse {
  token: string;
  _id: string;
  username: string;
  email: string;
  walletBalance: number;
  avatarId: string;
  createdAt: string;
  stats?: User['stats'];
  debtSummary?: User['debtSummary'];
  friends?: any[];
  user?: User; // Optional fallback if hierarchy differs
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  gameInvites: boolean;
  marketing: boolean;
  game: {
    turnTimerWarning: boolean;
    yourTurn: boolean;
    roundResult: boolean;
    opponentLeft: boolean;
    sideShowRequest: boolean;
  };
  social: {
    friendRequest: boolean;
    friendAccepted: boolean;
    userBlocked: boolean;
  };
  debt: {
    udhaarRequest: boolean;
    udhaarResponse: boolean;
    interestApplied: boolean;
    repaymentReminder: boolean;
    overdueWarning: boolean;
  };
}

export interface UserSettings {
  userId: string; // Foreign key to User
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  musicEnabled: boolean;
  notifications: NotificationPreferences;
}
