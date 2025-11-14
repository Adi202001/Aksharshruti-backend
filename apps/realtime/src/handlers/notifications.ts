import { Server, Socket } from 'socket.io';

export function notificationHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Mark notification as read
  socket.on('notification:mark_read', async (data: { notificationId: string }) => {
    try {
      console.log(`User ${userId} marked notification ${data.notificationId} as read`);

      // TODO: Update database to mark notification as read

      // Acknowledge to client
      socket.emit('notification:marked_read', {
        notificationId: data.notificationId,
        success: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      socket.emit('error', {
        message: 'Failed to mark notification as read',
      });
    }
  });

  // Mark all notifications as read
  socket.on('notification:mark_all_read', async () => {
    try {
      console.log(`User ${userId} marked all notifications as read`);

      // TODO: Update database to mark all notifications as read

      // Acknowledge to client
      socket.emit('notification:all_marked_read', {
        success: true,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      socket.emit('error', {
        message: 'Failed to mark all notifications as read',
      });
    }
  });
}

// Helper function to send notification to user (called from other parts of the system)
export function sendNotification(io: Server, userId: string, notification: any) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}
