/**
 * Online Status Manager
 * Tracks user online/offline status and current game participation
 */

interface UserStatus {
  socketId: string;
  lastSeen: number;
  currentRoom?: string;
  gameState?: 'WAITING' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
}

export class OnlineStatusManager {
  private onlineUsers: Map<string, UserStatus>;

  constructor() {
    this.onlineUsers = new Map();
  }

  /**
   * Mark user as online
   */
  setUserOnline(userId: string, socketId: string): void {
    this.onlineUsers.set(userId, {
      socketId,
      lastSeen: Date.now(),
    });
    console.log(`User ${userId} is now online (socket: ${socketId})`);
  }

  /**
   * Mark user as offline
   */
  setUserOffline(userId: string): void {
    this.onlineUsers.delete(userId);
    console.log(`User ${userId} is now offline`);
  }

  /**
   * Update user's game status
   */
  setUserInGame(userId: string, roomId: string, gameState: 'WAITING' | 'PLAYING' | 'ROUND_END' | 'FINISHED'): void {
    const status = this.onlineUsers.get(userId);
    if (status) {
      status.currentRoom = roomId;
      status.gameState = gameState;
      status.lastSeen = Date.now();
      console.log(`User ${userId} joined game ${roomId} (state: ${gameState})`);
    }
  }

  /**
   * Clear user's game status
   */
  setUserLeftGame(userId: string): void {
    const status = this.onlineUsers.get(userId);
    if (status) {
      delete status.currentRoom;
      delete status.gameState;
      status.lastSeen = Date.now();
      console.log(`User ${userId} left game`);
    }
  }

  /**
   * Get user's current status
   */
  getUserStatus(userId: string): {
    status: 'online' | 'in_game' | 'offline';
    inGame: boolean;
    roomId?: string;
    gameState?: string;
  } {
    const status = this.onlineUsers.get(userId);

    if (!status) {
      return { status: 'offline', inGame: false };
    }

    if (status.currentRoom && status.gameState) {
      return {
        status: 'in_game',
        inGame: true,
        roomId: status.currentRoom,
        gameState: status.gameState
      };
    }

    return { status: 'online', inGame: false };
  }

  /**
   * Get user's game information
   */
  getUserGameInfo(userId: string): { roomId?: string; gameState?: string } {
    const status = this.onlineUsers.get(userId);

    if (!status || !status.currentRoom) {
      return {};
    }

    return {
      roomId: status.currentRoom,
      gameState: status.gameState,
    };
  }

  /**
   * Get socket ID for a user
   */
  getUserSocketId(userId: string): string | undefined {
    return this.onlineUsers.get(userId)?.socketId;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Clean up stale connections (users who haven't been seen in 5 minutes)
   */
  cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, status] of this.onlineUsers.entries()) {
      if (now - status.lastSeen > staleThreshold) {
        console.log(`Removing stale connection for user ${userId}`);
        this.onlineUsers.delete(userId);
      }
    }
  }
}

// Singleton instance
export const onlineStatusManager = new OnlineStatusManager();

// Cleanup stale connections every minute
setInterval(() => {
  onlineStatusManager.cleanupStaleConnections();
}, 60000);
