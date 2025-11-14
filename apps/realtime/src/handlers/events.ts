import { Server, Socket } from 'socket.io';

export function eventHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Join an event room
  socket.on('event:join', async (data: { eventId: string }) => {
    try {
      const { eventId } = data;
      console.log(`User ${userId} joining event ${eventId}`);

      // TODO: Verify user has permission to join event
      // TODO: Check if event is live

      // Join the event room
      await socket.join(`event:${eventId}`);

      // Notify other participants
      socket.to(`event:${eventId}`).emit('event:participant_joined', {
        userId,
        timestamp: Date.now(),
      });

      // Send current participants list to user
      const room = io.sockets.adapter.rooms.get(`event:${eventId}`);
      const participantCount = room ? room.size : 1;

      socket.emit('event:joined', {
        eventId,
        participantCount,
        success: true,
      });

      console.log(`User ${userId} joined event ${eventId}`);
    } catch (error) {
      console.error('Error joining event:', error);
      socket.emit('error', {
        message: 'Failed to join event',
      });
    }
  });

  // Leave an event room
  socket.on('event:leave', async (data: { eventId: string }) => {
    try {
      const { eventId } = data;
      console.log(`User ${userId} leaving event ${eventId}`);

      // Leave the event room
      await socket.leave(`event:${eventId}`);

      // Notify other participants
      socket.to(`event:${eventId}`).emit('event:participant_left', {
        userId,
        timestamp: Date.now(),
      });

      socket.emit('event:left', {
        eventId,
        success: true,
      });

      console.log(`User ${userId} left event ${eventId}`);
    } catch (error) {
      console.error('Error leaving event:', error);
      socket.emit('error', {
        message: 'Failed to leave event',
      });
    }
  });

  // Send chat message in event
  socket.on('event:send_message', async (data: { eventId: string; message: string }) => {
    try {
      const { eventId, message } = data;

      // TODO: Save message to database
      // TODO: Check if user is in event

      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        userId,
        message,
        timestamp: Date.now(),
      };

      // Broadcast message to all participants in the event
      io.to(`event:${eventId}`).emit('event:message', chatMessage);

      console.log(`User ${userId} sent message in event ${eventId}`);
    } catch (error) {
      console.error('Error sending event message:', error);
      socket.emit('error', {
        message: 'Failed to send message',
      });
    }
  });

  // Mute/unmute in event
  socket.on('event:toggle_mute', async (data: { eventId: string; isMuted: boolean }) => {
    try {
      const { eventId, isMuted } = data;

      // TODO: Update database

      // Notify other participants
      socket.to(`event:${eventId}`).emit('event:participant_muted', {
        userId,
        isMuted,
        timestamp: Date.now(),
      });

      socket.emit('event:mute_toggled', {
        isMuted,
        success: true,
      });
    } catch (error) {
      console.error('Error toggling mute:', error);
      socket.emit('error', {
        message: 'Failed to toggle mute',
      });
    }
  });
}
