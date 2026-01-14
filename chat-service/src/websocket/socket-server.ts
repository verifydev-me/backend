// ==================== WEBSOCKET SERVER ====================

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { verifyToken, extractToken, type JwtPayload } from '../utils/jwt.js';
import { presenceService } from '../services/presence.service.js';
import { chatRoomService } from '../services/chat-room.service.js';
import { messageService, type SendMessageInput } from '../services/message.service.js';
import { notificationService } from '../services/notification.service.js';

// Extend Socket with user data
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingInterval: config.ws.pingInterval,
    pingTimeout: config.ws.pingTimeout,
    transports: ['websocket', 'polling'],
  });

  // ==================== AUTHENTICATION MIDDLEWARE ====================
  io.use(async (socket, next) => {
    try {
      // Extract token from auth header or query
      const token = extractToken(
        socket.handshake.auth?.token,
        socket.handshake.query?.token as string
      );

      if (!token) {
        logger.warn({ socketId: socket.id }, 'No token provided');
        return next(new Error('Authentication required'));
      }

      // Verify JWT
      const payload = verifyToken(token);
      if (!payload) {
        logger.warn({ socketId: socket.id }, 'Invalid token');
        return next(new Error('Invalid token'));
      }

      // Check connection limit
      const exceeded = await presenceService.hasExceededConnectionLimit(
        payload.userId,
        config.ws.maxConnPerUser
      );
      if (exceeded) {
        logger.warn({ userId: payload.userId }, 'Connection limit exceeded');
        return next(new Error('Too many connections'));
      }

      // Attach user to socket
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch (error) {
      logger.error({ error }, 'Auth middleware error');
      next(new Error('Authentication failed'));
    }
  });

  // ==================== CONNECTION HANDLER ====================
  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, role } = authSocket.user;

    logger.info({ userId, role, socketId: socket.id }, '🔌 Client connected');

    // Mark user as online
    await presenceService.userConnected(userId, socket.id);

    // Send connection confirmation
    socket.emit('connected', {
      userId,
      role,
      socketId: socket.id,
    });

    // ==================== JOIN ROOM ====================
    socket.on('join_room', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        // Validate room access
        const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
        if (!hasAccess) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Cannot access this room' });
          return;
        }

        // Join socket room
        socket.join(roomId);
        await presenceService.joinRoom(roomId, userId);

        // Get room and other participant
        const room = await chatRoomService.getRoomById(roomId);
        if (!room) {
          socket.emit('error', { code: 'NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Notify room that user joined
        socket.to(roomId).emit('user_online', { userId, roomId });

        // Get online users in room
        const onlineUsers = await presenceService.getRoomOnlineUsers(roomId);

        socket.emit('room_joined', {
          roomId,
          room,
          onlineUsers,
        });

        logger.debug({ userId, roomId }, '📥 User joined room');
      } catch (error) {
        logger.error({ error, userId }, 'Error joining room');
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
      }
    });

    // ==================== LEAVE ROOM ====================
    socket.on('leave_room', async (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(roomId);
      await presenceService.leaveRoom(roomId, userId);
      socket.to(roomId).emit('user_offline', { userId, roomId });
      logger.debug({ userId, roomId }, '📤 User left room');
    });

    // ==================== SEND MESSAGE ====================
    socket.on('send_message', async (data: { 
      roomId: string; 
      content: string; 
      type?: 'text' | 'file'; 
      metadata?: Record<string, unknown>;
    }) => {
      try {
        const { roomId, content, type = 'text', metadata } = data;

        // Validate
        if (!content?.trim()) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Message cannot be empty' });
          return;
        }

        // Validate room access
        const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
        if (!hasAccess) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Cannot send to this room' });
          return;
        }

        // Get room for recipient info
        const room = await chatRoomService.getRoomById(roomId);
        if (!room) {
          socket.emit('error', { code: 'NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Save message
        const messageInput: SendMessageInput = {
          roomId,
          senderId: userId,
          senderRole: role,
          senderName: authSocket.user.email?.split('@')[0],
          content: content.trim(),
          type,
          metadata: metadata as SendMessageInput['metadata'],
        };

        const message = await messageService.saveMessage(messageInput);

        // Get other participant
        const otherParticipant = chatRoomService.getOtherParticipant(room, userId);

        // Broadcast to room (including sender for confirmation)
        io.to(roomId).emit('new_message', { message });

        // Check if recipient is online
        if (otherParticipant) {
          const recipientOnline = await presenceService.isOnline(otherParticipant.userId);

          if (recipientOnline) {
            // Increment unread counter
            await chatRoomService.incrementUnread(roomId, otherParticipant.userId);
          } else {
            // User offline - publish notification event
            await notificationService.publishOfflineMessage({
              recipientId: otherParticipant.userId,
              senderId: userId,
              senderName: messageInput.senderName || 'User',
              roomId,
              preview: content.substring(0, 100),
              jobId: room.jobId || 'direct',
              timestamp: new Date().toISOString(),
            });
          }
        }

        logger.debug({ roomId, messageId: message.id }, '💬 Message sent');
      } catch (error) {
        logger.error({ error, userId }, 'Error sending message');
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to send message' });
      }
    });

    // ==================== TYPING INDICATORS ====================
    socket.on('typing_start', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user_typing', { userId, roomId: data.roomId, isTyping: true });
    });

    socket.on('typing_stop', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user_typing', { userId, roomId: data.roomId, isTyping: false });
    });

    // ==================== MARK AS READ ====================
    socket.on('mark_read', async (data: { roomId: string; messageId?: string }) => {
      try {
        const { roomId, messageId } = data;
        const count = await messageService.markAsRead(roomId, userId, messageId);
        
        socket.to(roomId).emit('messages_read', {
          roomId,
          readBy: userId,
          upToMessageId: messageId,
          count,
        });
      } catch (error) {
        logger.error({ error }, 'Error marking messages as read');
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', async (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, '🔌 Client disconnected');

      const { isFullyOffline } = await presenceService.userDisconnected(socket.id);

      if (isFullyOffline) {
        // Notify all rooms user was in
        const rooms = await chatRoomService.getUserRooms(userId);
        for (const room of rooms) {
          await presenceService.leaveRoom(room.roomId, userId);
          io.to(room.roomId).emit('user_offline', { userId, roomId: room.roomId });
        }
      }
    });
  });

  logger.info('🚀 WebSocket server initialized');
  return io;
}
