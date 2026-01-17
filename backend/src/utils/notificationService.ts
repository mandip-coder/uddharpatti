import { Server } from 'socket.io';
import UserSettings from '../models/UserSettings';

// Cache for user settings (5 minute TTL)
interface CachedSettings {
  settings: any;
  timestamp: number;
}

const settingsCache = new Map<string, CachedSettings>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Notification type mapping to settings path
 */
type NotificationType =
  | 'game.turnTimerWarning'
  | 'game.yourTurn'
  | 'game.roundResult'
  | 'game.opponentLeft'
  | 'game.sideShowRequest'
  | 'game.invite'
  | 'social.friendRequest'
  | 'social.friendAccepted'
  | 'social.userBlocked'
  | 'social.gameInvite'
  | 'debt.udhaarRequest'
  | 'debt.udhaarResponse'
  | 'debt.interestApplied'
  | 'debt.repaymentReminder'
  | 'debt.overdueWarning';

/**
 * Get user settings from database or cache
 * @param userId - The user ID
 * @returns User settings or null
 */
export const getUserSettings = async (userId: string): Promise<any | null> => {
  // Check cache first
  const cached = settingsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.settings;
  }

  try {
    const settings = await UserSettings.findOne({ userId });

    if (settings) {
      // Update cache
      settingsCache.set(userId, {
        settings: settings.notifications,
        timestamp: Date.now(),
      });
      return settings.notifications;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
};

/**
 * Invalidate cache for a user
 * @param userId - The user ID
 */
export const invalidateSettingsCache = (userId: string): void => {
  settingsCache.delete(userId);
};

/**
 * Check if a notification should be sent to a user
 * @param userId - The user ID
 * @param notificationType - The type of notification
 * @returns true if notification should be sent, false otherwise
 */
export const shouldSendNotification = async (
  userId: string,
  notificationType: NotificationType
): Promise<boolean> => {
  const settings = await getUserSettings(userId);

  // If no settings found, default to allowing all notifications
  if (!settings) {
    return true;
  }

  // Parse notification type (e.g., "game.yourTurn" -> settings.game.yourTurn)
  const [category, type] = notificationType.split('.') as [string, string];

  if (settings[category] && typeof settings[category][type] === 'boolean') {
    return settings[category][type];
  }

  // Default to true if setting not found
  return true;
};

/**
 * Emit event to user only if notification is allowed
 * @param io - Socket.io server instance
 * @param userId - The user ID (socket room)
 * @param event - The event name
 * @param data - The event data
 * @param notificationType - The notification type to check
 */
export const emitIfAllowed = async (
  io: Server,
  userId: string,
  event: string,
  data: any,
  notificationType: NotificationType
): Promise<void> => {
  const allowed = await shouldSendNotification(userId, notificationType);

  if (allowed) {
    io.to(userId).emit(event, data);
  } else {
    console.log(`Notification ${notificationType} suppressed for user ${userId}`);
  }
};

/**
 * Clear expired cache entries (run periodically)
 */
export const cleanupSettingsCache = (): void => {
  const now = Date.now();
  for (const [userId, cached] of settingsCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL) {
      settingsCache.delete(userId);
    }
  }
};

// Run cache cleanup every 10 minutes
setInterval(cleanupSettingsCache, 10 * 60 * 1000);
