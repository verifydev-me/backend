# Frontend Chat Integration Guide

> Complete guide for integrating real-time chat in Next.js/React frontend

---

## 📦 Installation

```bash
npm install socket.io-client
```

---

## 🔌 Socket Connection Hook

```typescript
// hooks/useChat.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.verifydev.me';

interface Message {
  _id: string;
  roomId: string;
  senderId: string;
  senderRole: 'recruiter' | 'candidate';
  senderName?: string;
  content: string;
  type: 'text' | 'file' | 'system';
  createdAt: string;
}

interface UseChatOptions {
  roomId: string;
  onMessage?: (message: Message) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

export function useChat({
  roomId,
  onMessage,
  onTyping,
  onUserOnline,
  onUserOffline,
}: UseChatOptions) {
  const { accessToken, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!accessToken) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Connected to chat');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from chat');
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  // Join room when connected
  useEffect(() => {
    if (!connected || !roomId || !socketRef.current) return;

    const socket = socketRef.current;

    // Join the room
    socket.emit('join_room', { roomId });

    // Handle room joined
    socket.on('room_joined', (data) => {
      console.log('📥 Joined room:', data.roomId);
      setOtherUserOnline(data.onlineUsers?.length > 1);
    });

    // Handle new messages
    socket.on('new_message', ({ message }) => {
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);
    });

    // Handle typing
    socket.on('user_typing', (data) => {
      onTyping?.(data);
    });

    // Handle presence
    socket.on('user_online', ({ userId }) => {
      setOtherUserOnline(true);
      onUserOnline?.(userId);
    });

    socket.on('user_offline', ({ userId }) => {
      setOtherUserOnline(false);
      onUserOffline?.(userId);
    });

    // Cleanup
    return () => {
      socket.emit('leave_room', { roomId });
      socket.off('room_joined');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [connected, roomId]);

  // Send message
  const sendMessage = useCallback(
    (content: string, type: 'text' | 'file' = 'text') => {
      if (!socketRef.current || !connected) return;
      
      socketRef.current.emit('send_message', {
        roomId,
        content,
        type,
      });
    },
    [roomId, connected]
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    socketRef.current?.emit('typing_start', { roomId });
  }, [roomId]);

  const stopTyping = useCallback(() => {
    socketRef.current?.emit('typing_stop', { roomId });
  }, [roomId]);

  // Mark as read
  const markAsRead = useCallback(
    (messageId?: string) => {
      socketRef.current?.emit('mark_read', { roomId, messageId });
    },
    [roomId]
  );

  return {
    connected,
    messages,
    otherUserOnline,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    setMessages,
  };
}
```

---

## 📜 Message History Loading

```typescript
// services/chat.service.ts
import { api } from './api';

export const chatService = {
  // Get user's rooms
  async getRooms() {
    const { data } = await api.get('/api/v1/chat/rooms');
    return data.data;
  },

  // Get or create room for a job
  async getOrCreateRoom(jobId: string, candidateId?: string, recruiterId?: string) {
    const { data } = await api.post('/api/v1/chat/rooms', {
      jobId,
      candidateId,
      recruiterId,
    });
    return data.data;
  },

  // Get message history
  async getMessages(roomId: string, options?: { limit?: number; before?: string }) {
    const { data } = await api.get(`/api/v1/chat/rooms/${roomId}/messages`, {
      params: options,
    });
    return data.data;
  },

  // Mark messages as read
  async markAsRead(roomId: string, messageId?: string) {
    const { data } = await api.put(`/api/v1/chat/rooms/${roomId}/read`, {
      messageId,
    });
    return data.data;
  },
};
```

---

## 💬 Chat Component Example

```tsx
// components/ChatWindow.tsx
import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { chatService } from '@/services/chat.service';

interface ChatWindowProps {
  roomId: string;
  recipientName: string;
}

export function ChatWindow({ roomId, recipientName }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    connected,
    messages,
    otherUserOnline,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    setMessages,
  } = useChat({
    roomId,
    onTyping: (data) => setTyping(data.isTyping),
    onMessage: () => markAsRead(),
  });

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { messages: history } = await chatService.getMessages(roomId, { limit: 50 });
        setMessages(history);
        markAsRead();
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [roomId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    startTyping();

    // Stop typing after 2 seconds of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  // Send message
  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    stopTyping();
  };

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          {otherUserOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{recipientName}</h3>
          <p className="text-sm text-gray-500">
            {otherUserOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.senderId === 'current-user-id' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.senderId === 'current-user-id'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p>{msg.content}</p>
              <span className="text-xs opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {typing && (
          <div className="text-sm text-gray-500">{recipientName} is typing...</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!connected}
          />
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {!connected && (
          <p className="text-xs text-red-500 mt-1">Reconnecting...</p>
        )}
      </div>
    </div>
  );
}
```

---

## 🎯 Usage in Job Application

```tsx
// pages/application/[id]/chat.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { chatService } from '@/services/chat.service';

export default function ApplicationChatPage() {
  const { id: applicationId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initChat() {
      try {
        // Get or create room for this application
        const roomData = await chatService.getOrCreateRoom(
          applicationId,
          // Backend will determine candidateId/recruiterId from JWT
        );
        setRoom(roomData);
      } catch (error) {
        console.error('Failed to init chat:', error);
      } finally {
        setLoading(false);
      }
    }
    initChat();
  }, [applicationId]);

  if (loading) return <div>Loading chat...</div>;
  if (!room) return <div>Chat unavailable</div>;

  return (
    <div className="h-screen">
      <ChatWindow
        roomId={room.roomId}
        recipientName={room.otherParticipant?.name || 'Recruiter'}
      />
    </div>
  );
}
```

---

## ✅ Checklist

- [ ] Install `socket.io-client`
- [ ] Create `useChat` hook
- [ ] Create `chatService` for REST calls
- [ ] Create `ChatWindow` component
- [ ] Integrate with job application pages
- [ ] Handle reconnection gracefully
- [ ] Test on multiple browser tabs
- [ ] Test mobile responsiveness

---

## 🔒 Security Notes

1. **Always pass JWT in socket auth** - Never in query params in production
2. **Validate room access** - Backend rejects unauthorized joins
3. **XSS prevention** - Sanitize message content before display
4. **Rate limiting** - Backend limits 10 messages/second
