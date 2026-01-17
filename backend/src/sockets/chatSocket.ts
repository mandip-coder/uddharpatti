import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import { emitIfAllowed } from '../utils/notificationService';
import { onlineStatusManager } from '../utils/onlineStatusManager';
import User from '../models/User';

export const chatSocket = (io: Server, socket: Socket) => {
  // Join a specific chat room (or friend 1-on-1 room)
  socket.on('join_chat', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined chat room: ${roomId}`);
  });

  // Global join (Connection established)
  socket.on('join_global', async ({ userId }) => {
    socket.join(userId);
    console.log(`User ${userId} joined global room`);

    // Mark as online
    onlineStatusManager.setUserOnline(userId, socket.id);

    // Notify friends
    try {
      const user = await User.findById(userId).populate('friends');
      if (user && user.friends) {
        user.friends.forEach((friend: any) => {
          // Emit to friend's room if they are online
          // We can just emit to their userId room, if they are online they will get it
          io.to(friend._id.toString()).emit('friend_status_update', {
            userId,
            status: 'online'
          });
        });
      }
    } catch (err) {
      console.error('Error broadcasting online status:', err);
    }
  });

  // Join private chat with a friend
  // roomId convention: "chat_<userId1>_<userId2>" (sorted)
  socket.on('join_private_chat', ({ friendId }: { friendId: string }) => {
    // @ts-ignore
    const currentUserId = socket.user?.id;
    if (!currentUserId) return;

    const ids = [currentUserId, friendId].sort();
    const roomId = `chat_${ids[0]}_${ids[1]}`;

    socket.join(roomId);
    console.log(`User ${currentUserId} joined private chat: ${roomId}`);
  });

  // Send message
  socket.on('send_message', async (data: {
    roomId: string;
    message: string;
    sender: string;
    recipientId?: string;
    type?: string;
    metadata?: any;
  }) => {
    const messageType = data.type || 'TEXT';

    // If it's a private chat (has recipientId), save to DB
    if (data.recipientId) {
      try {
        // @ts-ignore
        const senderId = socket.user?.id;

        // Verify sender matches socket user (simple check)
        if (senderId && data.sender !== senderId) {
          // Mismatch? Log warning
        }

        const savedMessage = await Message.create({
          sender: senderId || data.sender, // Fallback if socket.user not set (should be set by middleware)
          recipient: data.recipientId,
          content: data.message,
          read: false,
          type: messageType,
          metadata: data.metadata,
          status: 'SENT'
        });

        // Broadcast to specific private room
        const emitData = {
          ...data,
          _id: savedMessage._id,
          createdAt: savedMessage.createdAt,
          sender: senderId || data.sender,
          type: messageType,
          metadata: data.metadata,
          status: 'SENT'
        };

        io.to(data.roomId).emit('receive_message', emitData);

        // Notify recipient if they are online to update status to DELIVERED
        // For MVP, we can assume if they get it via socket, it's delivered (if room members > 1)
        // Or client acknowledges it.

      } catch (err) {
        console.error('Error saving message:', err);
      }
    } else {
      // Standard room broadcast (lobby or game chat)
      io.to(data.roomId).emit('receive_message', { ...data, type: messageType });
    }
  });

  socket.on('typing', (data: { roomId: string; isTyping: boolean; username: string }) => {
    socket.to(data.roomId).emit('typing_status', data);
  });

  // Message Reactions
  socket.on('add_reaction', async (data: { messageId: string, emoji: string, roomId: string }) => {
    try {
      // @ts-ignore
      const userId = socket.user?.id;
      if (!userId) return;

      await Message.findByIdAndUpdate(data.messageId, {
        $set: { [`reactions.${userId}`]: data.emoji }
      });

      io.to(data.roomId).emit('message_reaction_update', {
        messageId: data.messageId,
        userId,
        emoji: data.emoji
      });

    } catch (err) {
      console.error(err);
    }
  });
};
