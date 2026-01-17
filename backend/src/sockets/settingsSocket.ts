import { Server, Socket } from 'socket.io';

/**
 * Settings socket handler
 * Manages real-time avatar updates and settings synchronization
 */
export const settingsSocket = (io: Server, socket: Socket) => {

  // Listen for avatar updates (triggered from REST API)
  // This is handled via io.emit in the controller
  // No specific socket events needed here for now

  // Future: Could add real-time settings sync events here
  // For example: 'sync_settings' to push settings changes to all user's devices

  console.log('Settings socket initialized for:', socket.id);

  socket.on('join_global', ({ userId }) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined personal room ${userId}`);
    }
  });
};
