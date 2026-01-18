import { Server, Socket } from 'socket.io';
import User from '../models/User';
import { guaranteedNotificationService } from '../utils/guaranteedNotificationService';
import { onlineStatusManager } from '../utils/onlineStatusManager';

export const inviteSocket = (io: Server, socket: Socket) => {

  // Send game invite
  socket.on('send_game_invite', async (data: { friendId: string; tableId: string; betAmount: number }) => {
    try {
      // @ts-ignore
      const currentUserId = socket.user?.id;
      if (!currentUserId) {
        socket.emit('invite_error', { message: 'Authentication required' });
        return;
      }

      // 1. Validate friendship
      const sender = await User.findById(currentUserId).select('username avatarId friends');
      if (!sender) {
        socket.emit('invite_error', { message: 'User not found' });
        return;
      }

      const isFriend = sender.friends.some((friendId: any) => friendId.toString() === data.friendId);
      if (!isFriend) {
        socket.emit('invite_error', { message: 'You can only invite friends' });
        return;
      }

      // 2. Check friend's current state
      const friendStatus = onlineStatusManager.getUserStatus(data.friendId);

      let notificationMessage = `${sender.username} invited you to play!`;
      let requiresConfirmation = false;
      let currentState = 'available';

      if (friendStatus?.inGame) {
        notificationMessage = `${sender.username} invited you to play. You are currently in another game. Accepting will make you leave your current table.`;
        requiresConfirmation = true;
        currentState = 'in_game';
      } else if (!friendStatus || friendStatus.status === 'offline') {
        currentState = 'offline';
      }

      // 3. Send notification with GUARANTEED delivery
      const delivered = await guaranteedNotificationService.sendNotification(io, data.friendId, {
        type: 'game_invite',
        sourceUserId: currentUserId,
        data: {
          inviterId: currentUserId,
          inviterName: sender.username,
          inviterAvatar: sender.avatarId,
          tableId: data.tableId,
          betAmount: data.betAmount,
          requiresConfirmation,
          currentState,
          message: notificationMessage,
          timestamp: new Date()
        }
      });

      socket.emit('invite_sent', {
        success: true,
        friendId: data.friendId,
        friendStatus: currentState,
        deliveredImmediately: delivered
      });

      console.log(`[INVITE] ${sender.username} invited ${data.friendId} to table ${data.tableId} (delivered: ${delivered})`);

    } catch (err) {
      console.error('Error sending invite:', err);
      socket.emit('invite_error', { message: 'Failed to send invite' });
    }
  });

  // Accept game invite - with table transition logic
  socket.on('accept_game_invite', async (data: { inviterId: string; tableId: string; notificationId: string }) => {
    try {
      // @ts-ignore
      const currentUserId = socket.user?.id;
      if (!currentUserId) {
        socket.emit('invite_accept_failed', { message: 'Authentication required' });
        return;
      }

      const user = await User.findById(currentUserId);
      if (!user) {
        socket.emit('invite_accept_failed', { message: 'User not found' });
        return;
      }

      console.log(`[INVITE] ${user.username} accepting invite to table ${data.tableId}`);

      // 2. Notify inviter
      await guaranteedNotificationService.sendNotification(io, data.inviterId, {
        type: 'invite_accepted',
        sourceUserId: currentUserId,
        data: {
          friendId: currentUserId,
          friendName: user.username,
          friendAvatar: user.avatarId,
          tableId: data.tableId,
          timestamp: new Date()
        }
      });

      // 3. Resolve notification
      await guaranteedNotificationService.resolveNotification(currentUserId, data.notificationId, 'accepted');

      const currentStatus = onlineStatusManager.getUserStatus(currentUserId);

      if (currentStatus?.inGame && currentStatus.roomId) {
        console.log(`[INVITE] User is in game ${currentStatus.roomId}, will exit first`);

        socket.emit('exit_current_game_for_invite', {
          currentRoomId: currentStatus.roomId,
          newTableId: data.tableId,
          inviterId: data.inviterId,
          notificationId: data.notificationId
        });

        return;
      }

      // 4. Instruct client to join new game
      socket.emit('invite_accepted_join', {
        tableId: data.tableId,
        notificationId: data.notificationId,
        message: 'Joining game...'
      });

      console.log(`[INVITE] ${user.username} accepted invite, joining ${data.tableId}`);

    } catch (err) {
      console.error('Error accepting invite:', err);
      socket.emit('invite_accept_failed', {
        notificationId: data.notificationId,
        message: 'Failed to accept invite'
      });
    }
  });

  // Reject game invite
  socket.on('reject_game_invite', async (data: { inviterId: string; tableId: string; notificationId: string }) => {
    try {
      // @ts-ignore
      const currentUserId = socket.user?.id;
      if (!currentUserId) return;

      const user = await User.findById(currentUserId);
      if (!user) return;

      // Notify inviter
      await guaranteedNotificationService.sendNotification(io, data.inviterId, {
        type: 'invite_rejected',
        sourceUserId: currentUserId,
        data: {
          friendId: currentUserId,
          friendName: user.username,
          tableId: data.tableId,
          timestamp: new Date()
        }
      });

      socket.emit('invite_rejected_success', { success: true });

      console.log(`[INVITE] ${user.username} rejected invite from ${data.inviterId}`);

    } catch (err) {
      console.error('Error rejecting invite:', err);
    }
  });
  // Resolve notification (Dismiss/Accept/Reject byproduct)
  socket.on('resolve_notification', async (data: { notificationId: string; status: 'accepted' | 'rejected' | 'dismissed' }) => {
    try {
      // @ts-ignore
      const currentUserId = socket.user?.id;
      if (!currentUserId) return;

      await guaranteedNotificationService.resolveNotification(currentUserId, data.notificationId, data.status);
      console.log(`[NOTIFICATION] Resolved ${data.notificationId} as ${data.status} for ${currentUserId}`);
    } catch (err) {
      console.error('Error resolving notification:', err);
    }
  });
};

