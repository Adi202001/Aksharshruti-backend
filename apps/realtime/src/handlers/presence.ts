import { Server, Socket } from 'socket.io';

// Store online users in memory (use Redis in production for multi-instance)
const onlineUsers = new Map<string, { socketId: string; status: string; lastSeen: number }>();

export function presenceHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // User comes online
  onlineUsers.set(userId, {
    socketId: socket.id,
    status: 'online',
    lastSeen: Date.now(),
  });

  // Broadcast online status to followers (TODO: get followers from DB)
  socket.broadcast.emit('presence:status_changed', {
    userId,
    status: 'online',
    timestamp: Date.now(),
  });

  // Update presence status
  socket.on('presence:update', async (data: { status: 'online' | 'away' | 'busy' }) => {
    try {
      const { status } = data;

      onlineUsers.set(userId, {
        socketId: socket.id,
        status,
        lastSeen: Date.now(),
      });

      // TODO: Update database with last_active timestamp

      // Broadcast status change
      socket.broadcast.emit('presence:status_changed', {
        userId,
        status,
        timestamp: Date.now(),
      });

      socket.emit('presence:updated', {
        status,
        success: true,
      });
    } catch (error) {
      console.error('Error updating presence:', error);
      socket.emit('error', {
        message: 'Failed to update presence',
      });
    }
  });

  // Get online status of specific users
  socket.on('presence:check', async (data: { userIds: string[] }) => {
    try {
      const { userIds } = data;

      const statuses = userIds.map((id) => {
        const user = onlineUsers.get(id);
        return {
          userId: id,
          status: user ? user.status : 'offline',
          lastSeen: user ? user.lastSeen : null,
        };
      });

      socket.emit('presence:status', { users: statuses });
    } catch (error) {
      console.error('Error checking presence:', error);
      socket.emit('error', {
        message: 'Failed to check presence',
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Mark user as offline
    onlineUsers.delete(userId);

    // TODO: Update database with last_active timestamp

    // Broadcast offline status
    socket.broadcast.emit('presence:status_changed', {
      userId,
      status: 'offline',
      timestamp: Date.now(),
    });
  });
}

// Helper function to check if user is online
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

// Helper function to get online user count
export function getOnlineUserCount(): number {
  return onlineUsers.size;
}
