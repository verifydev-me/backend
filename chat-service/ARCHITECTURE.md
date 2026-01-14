# Chat Service Architecture

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Author:** Principal Backend Engineer

---

## 🎯 Overview

A real-time, scalable chat microservice enabling secure communication between **Recruiters** and **Candidates** in the context of job applications.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NGINX API GATEWAY                              │
│                                                                          │
│   /api/v1/chat/* ──────────────────────┐                                 │
│   /ws/chat ────────────────────────────┤                                 │
└────────────────────────────────────────┼─────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CHAT SERVICE                                    │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │  WebSocket      │    │   REST API      │    │   Event         │      │
│  │  Server         │    │   Server        │    │   Publisher     │      │
│  │  (Socket.IO)    │    │   (Express)     │    │   (RabbitMQ)    │      │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
│           │                      │                      │                │
│           └──────────────────────┼──────────────────────┘                │
│                                  │                                       │
│  ┌───────────────────────────────┼───────────────────────────────────┐  │
│  │                        SERVICE LAYER                               │  │
│  │                                                                    │  │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │   │  ChatRoom  │  │  Message   │  │  Presence  │  │  Auth      │  │  │
│  │   │  Service   │  │  Service   │  │  Service   │  │  Guard     │  │  │
│  │   └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────┐      ┌─────────────┐       ┌─────────────┐
│  MongoDB    │      │   Redis     │       │  RabbitMQ   │
│  (Messages) │      │  (Presence) │       │  (Events)   │
└─────────────┘      └─────────────┘       └─────────────┘
```

---

## 📦 Room Design

### Room ID Format
```
roomId = `chat_${jobId}_${candidateId}`
```

### Room Rules
1. **Exactly 2 participants:** Recruiter + Candidate
2. **Context-bound:** Must be linked to a job/application
3. **Access control:** Only authorized users can join
4. **Unique constraint:** One room per job-candidate pair

### Room Creation Flow
```
Candidate applies to Job
        ↓
Application created in job-service
        ↓
Chat room auto-created (lazy initialization)
        ↓
Both parties can now chat
```

---

## 🔐 Security Model

### JWT Authentication Flow
```
1. Client connects to WebSocket
2. Passes JWT in connection handshake
3. Server validates JWT using JWT_ACCESS_SECRET
4. Extracts userId and role from token
5. Stores socket-to-user mapping in Redis
6. Connection established or rejected
```

### Authorization Rules
```typescript
interface RoomAccess {
  // Recruiter access: owns the job
  recruiter: jobId belongs to recruiter.companyId
  
  // Candidate access: has applied to job
  candidate: application exists for job + userId
}
```

---

## 📡 WebSocket Events

### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId }` | Join a chat room |
| `leave_room` | `{ roomId }` | Leave a chat room |
| `send_message` | `{ roomId, content, type }` | Send a message |
| `typing_start` | `{ roomId }` | User started typing |
| `typing_stop` | `{ roomId }` | User stopped typing |
| `mark_read` | `{ roomId, messageId }` | Mark messages as read |

### Server → Client Events
| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ userId, socketId }` | Connection confirmed |
| `room_joined` | `{ roomId, participant }` | Successfully joined room |
| `new_message` | `{ message }` | New message received |
| `user_online` | `{ userId, roomId }` | Other user came online |
| `user_offline` | `{ userId, roomId }` | Other user went offline |
| `user_typing` | `{ userId, roomId }` | Other user is typing |
| `messages_read` | `{ roomId, readBy, upToMessageId }` | Messages marked as read |
| `error` | `{ code, message }` | Error occurred |

---

## 💾 MongoDB Schemas

### ChatRoom Collection
```javascript
{
  _id: ObjectId,
  roomId: String,           // "chat_jobId_candidateId" (unique index)
  jobId: ObjectId,
  applicationId: ObjectId,
  
  participants: [
    { 
      userId: ObjectId, 
      role: "recruiter" | "candidate",
      joinedAt: Date 
    }
  ],
  
  lastMessage: {
    content: String,
    senderId: ObjectId,
    sentAt: Date
  },
  
  unreadCount: {
    [userId]: Number
  },
  
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Collection
```javascript
{
  _id: ObjectId,
  roomId: String,           // Reference to room
  senderId: ObjectId,
  senderRole: "recruiter" | "candidate",
  
  content: String,
  type: "text" | "file" | "system",
  
  metadata: {
    fileName: String,       // For file messages
    fileUrl: String,
    fileSize: Number
  },
  
  readBy: [
    { userId: ObjectId, readAt: Date }
  ],
  
  deliveredAt: Date,
  createdAt: Date
}
```

### Indexes
```javascript
// ChatRoom
{ roomId: 1 }           // unique
{ "participants.userId": 1 }
{ jobId: 1 }

// Message
{ roomId: 1, createdAt: -1 }   // Compound for pagination
{ senderId: 1 }
{ createdAt: -1 }              // TTL index optional
```

---

## 🌐 REST API Endpoints

### Room APIs
```
GET  /api/v1/chat/rooms                    # Get user's chat rooms
GET  /api/v1/chat/rooms/:roomId            # Get room details
POST /api/v1/chat/rooms                    # Create/Get room for job
```

### Message APIs
```
GET  /api/v1/chat/rooms/:roomId/messages   # Get paginated messages
POST /api/v1/chat/rooms/:roomId/messages   # Send message (fallback)
PUT  /api/v1/chat/rooms/:roomId/read       # Mark messages as read
```

### Presence APIs
```
GET  /api/v1/chat/presence/:userId         # Check if user is online
```

---

## 🔄 Redis Data Structures

### Online Users
```redis
SET online:users                # Set of online userIds
HSET user:socket:{userId}       # socketId -> userId mapping
HSET socket:user:{socketId}     # userId -> socketId reverse mapping
```

### Room Presence
```redis
SET room:online:{roomId}        # Set of online users in room
```

### Pub/Sub Channels (for horizontal scaling)
```redis
CHANNEL chat:messages           # Real-time message broadcast
CHANNEL chat:presence           # User online/offline events
```

---

## 📨 RabbitMQ Events

### Published Events
```typescript
// When message sent to offline user
{
  type: "chat.message.offline",
  payload: {
    recipientId: string,
    senderId: string,
    senderName: string,
    roomId: string,
    preview: string,        // First 100 chars
    jobTitle: string
  }
}
```

### Queue Configuration
```
Exchange: chat.events (topic)
Queue: notification.chat.offline
Routing Key: chat.message.offline
```

---

## 🚀 Scalability Design

### Horizontal Scaling
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Chat Pod 1  │     │ Chat Pod 2  │     │ Chat Pod 3  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │    Redis    │
                    │   Pub/Sub   │
                    └─────────────┘

User A connected to Pod 1
User B connected to Pod 2
Message from A → Redis Pub/Sub → B receives on Pod 2
```

### Connection Limits
```
Max connections per pod: 10,000
Sticky sessions: Enabled via Nginx (ip_hash)
Heartbeat interval: 25 seconds
Connection timeout: 30 seconds
```

---

## 📁 Directory Structure

```
chat-service/
├── src/
│   ├── config/
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── room.routes.ts
│   │   │   └── message.routes.ts
│   │   ├── controllers/
│   │   │   ├── room.controller.ts
│   │   │   └── message.controller.ts
│   │   └── middlewares/
│   │       └── auth.middleware.ts
│   │
│   ├── websocket/
│   │   ├── socket-server.ts
│   │   ├── handlers/
│   │   │   ├── connection.handler.ts
│   │   │   ├── room.handler.ts
│   │   │   └── message.handler.ts
│   │   └── guards/
│   │       └── auth.guard.ts
│   │
│   ├── services/
│   │   ├── chat-room.service.ts
│   │   ├── message.service.ts
│   │   ├── presence.service.ts
│   │   └── notification.service.ts
│   │
│   ├── models/
│   │   ├── room.model.ts
│   │   └── message.model.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   └── jwt.ts
│   │
│   ├── app.ts
│   └── index.ts
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## ✅ Production Checklist

- [ ] JWT validation against same secret as auth-service
- [ ] Rate limiting on WebSocket events (10 msg/sec)
- [ ] Message content sanitization (XSS prevention)
- [ ] Connection limits per user (max 5 tabs)
- [ ] Graceful shutdown handling
- [ ] Health check endpoint
- [ ] Metrics (connection count, message rate)
- [ ] Error tracking (Sentry integration)
- [ ] Load testing (10k concurrent connections)

---

## 📊 Monitoring Metrics

```typescript
// Prometheus metrics to expose
chat_connections_total           // Gauge
chat_messages_sent_total         // Counter
chat_rooms_active_total          // Gauge
chat_message_delivery_latency    // Histogram
chat_connection_errors_total     // Counter
```

---

> **Next:** Implementation files follow this architecture.
