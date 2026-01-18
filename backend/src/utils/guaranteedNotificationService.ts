import { Server } from 'socket.io';
import NotificationQueue from '../models/NotificationQueue';

interface PendingNotification {
  id: string; // Internal memory ID
  notificationId: string; // Unique public ID
  userId: string;
  sourceUserId?: string;
  type: string;
  data: any;
  timestamp: Date;
  attempts: number;
}

class GuaranteedNotificationService {
  private pendingQueue: Map<string, PendingNotification[]> = new Map();
  private maxAttempts = 3;
  private deliveryTimeout = 5000; // 5 seconds

  /**
   * Send a notification with guaranteed delivery
   * @param io - Socket.IO server instance
   * @param userId - Target user ID
   * @param notification - Notification object with type and data
   * @returns Promise<boolean> - true if delivered immediately, false if queued
   */
  async sendNotification(
    io: Server,
    userId: string,
    notification: { type: string; data: any; sourceUserId?: string }
  ): Promise<boolean> {
    const { type, data, sourceUserId } = notification;

    // RULE 1: NO DUPLICATE NOTIFICATIONS
    try {
      const existing = await NotificationQueue.findOne({
        userId,
        sourceUserId,
        type,
        status: 'pending'
      });

      if (existing) {
        console.log(`[NOTIFICATION] Skipping duplicate ${type} for user ${userId} from ${sourceUserId}`);
        return false;
      }
    } catch (err) {
      console.error('[NOTIFICATION] Error checking for duplicates:', err);
    }

    const notificationId = `notif_${userId.substring(0, 5)}_${Date.now()}`;
    console.log(`[NOTIFICATION] Sending ${type} to user ${userId} (ID: ${notificationId})`);

    const fullData = { ...data, notificationId };

    // 1. Try immediate delivery
    const delivered = await this.tryDeliver(io, userId, { type, data: fullData });

    if (delivered) {
      console.log(`[NOTIFICATION] ✓ Delivered ${type} to ${userId} immediately`);
      return true;
    }

    console.log(`[NOTIFICATION] ✗ User ${userId} not connected, queuing notification`);

    // 2. Queue in memory for quick retry
    this.queueNotification(userId, { type, data: fullData, sourceUserId, notificationId });

    // 3. Persist to database for reliability
    try {
      await NotificationQueue.create({
        notificationId,
        userId,
        sourceUserId,
        type,
        data: fullData,
        status: 'pending',
        attempts: 0
      });
      console.log(`[NOTIFICATION] Persisted ${type} to database for ${userId}`);
    } catch (err) {
      console.error('[NOTIFICATION] Failed to persist to database:', err);
    }

    return false;
  }

  /**
   * Called when a user connects - deliver all pending notifications
   * @param io - Socket.IO server instance
   * @param userId - User ID that just connected
   */
  async onUserConnect(io: Server, userId: string): Promise<void> {
    console.log(`[NOTIFICATION] User ${userId} connected, checking pending notifications`);

    // 1. Deliver in-memory queue first (faster)
    const memoryPending = this.pendingQueue.get(userId) || [];

    for (const notif of memoryPending) {
      const delivered = await this.tryDeliver(io, userId, {
        type: notif.type,
        data: notif.data
      });
      if (delivered) {
        this.removeFromQueue(userId, notif.id);
      }
    }

    // 2. Load and deliver from database
    try {
      const dbNotifications = await NotificationQueue.find({
        userId,
        status: 'pending',
        attempts: { $lt: this.maxAttempts }
      }).sort({ createdAt: 1 }); // Oldest first

      console.log(`[NOTIFICATION] Found ${dbNotifications.length} pending notifications in DB for ${userId}`);

      for (const notif of dbNotifications) {
        const delivered = await this.tryDeliver(io, userId, {
          type: notif.type,
          data: notif.data
        });

        if (delivered) {
          // Mark as delivered in database
          notif.status = 'delivered';
          notif.deliveredAt = new Date();
          await notif.save();
          console.log(`[NOTIFICATION] ✓ Delivered queued ${notif.type} to ${userId}`);
        } else {
          // Increment attempt counter
          notif.attempts += 1;
          notif.lastAttempt = new Date();

          if (notif.attempts >= this.maxAttempts) {
            notif.status = 'failed';
            console.error(`[NOTIFICATION] ✗ Failed to deliver ${notif.type} after ${this.maxAttempts} attempts`);
          }

          await notif.save();
        }
      }
    } catch (err) {
      console.error('[NOTIFICATION] Error loading pending notifications:', err);
    }
  }

  /**
   * Resolve a notification (Accept/Reject/Dismiss)
   */
  async resolveNotification(userId: string, notificationId: string, status: 'accepted' | 'rejected' | 'dismissed'): Promise<void> {
    console.log(`[NOTIFICATION] Resolving notification ${notificationId} for user ${userId} as ${status}`);

    // Remove from memory queue
    const memoryPending = this.pendingQueue.get(userId) || [];
    const filtered = memoryPending.filter(n => n.notificationId !== notificationId);
    if (filtered.length === 0) {
      this.pendingQueue.delete(userId);
    } else {
      this.pendingQueue.set(userId, filtered);
    }

    // Update database
    try {
      await NotificationQueue.updateOne(
        { notificationId, userId },
        { status, deliveredAt: new Date() }
      );
    } catch (err) {
      console.error('[NOTIFICATION] Failed to resolve in DB:', err);
    }
  }

  /**
   * Try to deliver a notification immediately
   * @param io - Socket.IO server instance
   * @param userId - Target user ID
   * @param notification - Notification to deliver
   * @returns Promise<boolean> - true if delivered, false otherwise
   */
  private async tryDeliver(
    io: Server,
    userId: string,
    notification: { type: string; data: any }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if user has any connected sockets
      const sockets = io.sockets.adapter.rooms.get(userId);

      if (!sockets || sockets.size === 0) {
        resolve(false);
        return;
      }

      // Emit with timeout and acknowledgment
      io.to(userId).timeout(this.deliveryTimeout).emit(
        notification.type,
        notification.data,
        (err: any, responses: any[]) => {
          if (err) {
            console.error(`[NOTIFICATION] Delivery timeout for ${notification.type}:`, err);
            resolve(false);
          } else if (responses.length === 0) {
            console.warn(`[NOTIFICATION] No acknowledgment received for ${notification.type}`);
            resolve(false);
          } else {
            // At least one client acknowledged
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Add notification to in-memory queue
   */
  private queueNotification(
    userId: string,
    notification: { type: string; data: any; sourceUserId?: string; notificationId: string }
  ): void {
    const existing = this.pendingQueue.get(userId) || [];

    const pending: PendingNotification = {
      id: `${userId}_${notification.type}_${Date.now()}`,
      notificationId: notification.notificationId,
      userId,
      sourceUserId: notification.sourceUserId,
      type: notification.type,
      data: notification.data,
      timestamp: new Date(),
      attempts: 0
    };

    existing.push(pending);
    this.pendingQueue.set(userId, existing);
  }

  /**
   * Remove notification from in-memory queue
   */
  private removeFromQueue(userId: string, notificationId: string): void {
    const existing = this.pendingQueue.get(userId) || [];
    const filtered = existing.filter(n => n.id !== notificationId);

    if (filtered.length === 0) {
      this.pendingQueue.delete(userId);
    } else {
      this.pendingQueue.set(userId, filtered);
    }
  }

  /**
   * Get pending notification count for a user
   */
  async getPendingCount(userId: string): Promise<number> {
    const memoryCount = (this.pendingQueue.get(userId) || []).length;
    const dbCount = await NotificationQueue.countDocuments({
      userId,
      status: 'pending'
    });

    return memoryCount + dbCount;
  }

  /**
   * Clear all pending notifications for a user (e.g., when they read all)
   */
  async clearPending(userId: string): Promise<void> {
    this.pendingQueue.delete(userId);

    await NotificationQueue.updateMany(
      { userId, status: 'pending' },
      { status: 'delivered', deliveredAt: new Date() }
    );
  }
}

// Singleton instance
export const guaranteedNotificationService = new GuaranteedNotificationService();
