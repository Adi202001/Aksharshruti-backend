import { Server, Socket } from 'socket.io';

export function messagingHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // User typing indicator
  socket.on('message:typing', async (data: { conversationId: string; isTyping: boolean }) => {
    try {
      const { conversationId, isTyping } = data;

      // Broadcast typing status to other participants in the conversation
      socket.to(`conversation:${conversationId}`).emit('message:user_typing', {
        userId,
        conversationId,
        isTyping,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  });

  // Join conversation room (for real-time message delivery)
  socket.on('conversation:join', async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;

      // TODO: Verify user is participant in conversation

      await socket.join(`conversation:${conversationId}`);

      socket.emit('conversation:joined', {
        conversationId,
        success: true,
      });

      console.log(`User ${userId} joined conversation ${conversationId}`);
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', {
        message: 'Failed to join conversation',
      });
    }
  });

  // Leave conversation room
  socket.on('conversation:leave', async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;

      await socket.leave(`conversation:${conversationId}`);

      socket.emit('conversation:left', {
        conversationId,
        success: true,
      });

      console.log(`User ${userId} left conversation ${conversationId}`);
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  });

  // Mark conversation as read
  socket.on('conversation:mark_read', async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;

      // TODO: Update database to mark messages as read

      // Notify other participants
      socket.to(`conversation:${conversationId}`).emit('conversation:read', {
        userId,
        conversationId,
        timestamp: Date.now(),
      });

      socket.emit('conversation:marked_read', {
        conversationId,
        success: true,
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      socket.emit('error', {
        message: 'Failed to mark conversation as read',
      });
    }
  });
}

// Helper function to send real-time message (called after message is saved to DB)
export function sendRealtimeMessage(
  io: Server,
  conversationId: string,
  message: any
) {
  io.to(`conversation:${conversationId}`).emit('message:new', message);
}
