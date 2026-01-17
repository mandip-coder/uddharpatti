import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/db';

dotenv.config();

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

import { chatSocket } from './sockets/chatSocket';
import { gameSocket } from './sockets/gameSocket';
import { settingsSocket } from './sockets/settingsSocket';
import { inviteSocket } from './sockets/inviteSocket';
import { onlineStatusManager } from './utils/onlineStatusManager';
import { guaranteedNotificationService } from './utils/guaranteedNotificationService';
import User from './models/User';

import { socketProtect } from './middleware/authMiddleware';

io.use(socketProtect);

// Allow app to access io (must be before connection handler)
app.set('io', io);

io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id);

  // @ts-ignore
  const userId = socket.user?.id;

  if (userId) {
    // CRITICAL: Join personal room for notifications
    socket.join(userId);
    console.log(`[CONNECTION] User ${userId} joined personal room`);

    // Mark user as online
    onlineStatusManager.setUserOnline(userId, socket.id);

    // Deliver any pending notifications
    await guaranteedNotificationService.onUserConnect(io, userId);

    // Notify friends of online status
    try {
      const user = await User.findById(userId).populate('friends');
      if (user && user.friends && user.friends.length > 0) {
        user.friends.forEach((friend: any) => {
          io.to(friend._id.toString()).emit('friend_status_update', {
            userId,
            status: 'online'
          });
        });
        console.log(`[CONNECTION] Notified ${user.friends.length} friends that ${userId} is online`);
      }
    } catch (err) {
      console.error('[CONNECTION] Error notifying friends of online status:', err);
    }
  }

  // DEBUG: Log all incoming events
  socket.onAny((eventName, ...args) => {
    console.log(`[SOCKET_EVENT] Received: ${eventName}`, args.length > 0 ? args[0] : '');
  });

  // Initialize Sockets
  chatSocket(io, socket);
  gameSocket(io, socket);
  settingsSocket(io, socket);
  inviteSocket(io, socket);

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    // @ts-ignore
    const userId = socket.user?.id;
    if (userId) {
      // Mark offline
      const { onlineStatusManager } = require('./utils/onlineStatusManager');
      onlineStatusManager.setUserOffline(userId);

      // Notify friends
      try {
        const User = require('./models/User').default;
        const user = await User.findById(userId).populate('friends');
        if (user && user.friends) {
          user.friends.forEach((friend: any) => {
            io.to(friend._id.toString()).emit('friend_status_update', {
              userId,
              status: 'offline'
            });
          });
        }
      } catch (err) {
        console.error('Error broadcasting offline status:', err);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
