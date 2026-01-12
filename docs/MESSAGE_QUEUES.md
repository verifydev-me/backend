# Message Queue Architecture

> RabbitMQ Event-Driven Communication System

---

## 📋 Overview

VerifyDev uses **RabbitMQ** for asynchronous communication between microservices. This enables:
- ✅ Decoupled services
- ✅ Async processing (project analysis)
- ✅ Retry mechanisms (dead letter queues)
- ✅ Scalable workers

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            RabbitMQ (Port 5672)                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     Exchange: project.events                        │  │
│  │                           (Type: direct)                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│              │                    │                    │                 │
│              ▼                    ▼                    ▼                 │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │ project.analyze   │ │ project.analyzed  │ │ resume.generate   │      │
│  │    .request       │ │                   │ │    .request       │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                   Exchange: project.events.dlx                      │  │
│  │                     (Dead Letter Exchange)                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📨 Queues

### 1. project.analyze.request

**Purpose:** Trigger project analysis

| Property | Value |
|----------|-------|
| Exchange | `project.events` |
| Routing Key | `project.analyze.request` |
| Durable | ✅ Yes |
| Dead Letter Exchange | `project.events.dlx` |
| Producer | User Service |
| Consumer | Project Analyzer (Go) |

**Message Format:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "repoUrl": "https://github.com/user/project",
  "repoName": "project",
  "defaultBranch": "main",
  "projectType": "WEB_BACKEND"
}
```

**Flow:**
```
User adds project
       │
       ▼
┌─────────────┐   1. Publish    ┌─────────────────────────┐
│ User Service│ ───────────────►│ project.analyze.request │
└─────────────┘                 └──────────────┬──────────┘
                                               │ 2. Consume
                                               ▼
                               ┌───────────────────────────┐
                               │    Project Analyzer (Go)  │
                               │    - Clone repo           │
                               │    - Detect tech stack    │
                               │    - AI analysis          │
                               │    - Extract skills       │
                               └───────────────────────────┘
```

---

### 2. project.analyzed

**Purpose:** Deliver analysis results

| Property | Value |
|----------|-------|
| Exchange | `project.events` |
| Routing Key | `project.analyzed` |
| Durable | ✅ Yes |
| Producer | Project Analyzer (Go) |
| Consumer | Aura Processor |

**Message Format:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "status": "completed",
  "analysis": {
    "summary": "A robust backend API...",
    "techStack": {
      "languages": ["TypeScript", "Go"],
      "frameworks": ["Express", "Gin"],
      "databases": ["MongoDB", "Redis"],
      "infrastructure": ["Docker", "GitHub Actions"]
    },
    "architecture": "microservices",
    "skills": [
      {
        "name": "TypeScript",
        "category": "LANGUAGE",
        "confidence": 95,
        "linesOfCode": 5000
      },
      {
        "name": "Docker",
        "category": "DEVOPS",
        "confidence": 90
      }
    ],
    "scores": {
      "codeQuality": 85,
      "structure": 80,
      "overall": 82
    },
    "qualitySignals": {
      "hasTests": true,
      "hasCI": true,
      "hasDocker": true,
      "hasReadme": true,
      "documentation": "good"
    }
  },
  "analyzedAt": "2024-01-10T12:00:00Z"
}
```

**Flow:**
```
Project Analyzer completes
           │
           ▼
┌───────────────────┐   1. Publish   ┌──────────────────┐
│ Project Analyzer  │ ──────────────►│ project.analyzed │
└───────────────────┘                └────────┬─────────┘
                                              │ 2. Consume
                                              ▼
                              ┌────────────────────────────┐
                              │      Aura Processor        │
                              │  - Update project status   │
                              │  - Add/update skills       │
                              │  - Recalculate Aura score  │
                              │  - Log activity            │
                              └────────────────────────────┘
```

---

### 3. resume.generate.request

**Purpose:** Trigger resume PDF generation

| Property | Value |
|----------|-------|
| Exchange | `project.events` |
| Routing Key | `resume.generate.request` |
| Durable | ✅ Yes |
| Producer | User Service |
| Consumer | Resume Service (Go) |

**Message Format:**
```json
{
  "userId": "507f1f77bcf86cd799439012",
  "template": "modern",
  "format": "pdf",
  "requestId": "req_123456789"
}
```

---

## 🔄 Message Flow Diagram

```
┌─────────────┐                                              ┌─────────────┐
│   Frontend  │                                              │   Database  │
└──────┬──────┘                                              └──────▲──────┘
       │                                                            │
       │ 1. Add Project                                             │
       ▼                                                            │
┌─────────────┐                                                     │
│   Gateway   │                                                     │
└──────┬──────┘                                                     │
       │                                                            │
       ▼                                                            │
┌─────────────┐  2. Create Project (PENDING)  ┌─────────────┐      │
│    User     │ ─────────────────────────────►│   MongoDB   │      │
│   Service   │                               └─────────────┘      │
└──────┬──────┘                                                     │
       │                                                            │
       │ 3. Publish to RabbitMQ                                     │
       ▼                                                            │
┌─────────────────────────────────────┐                            │
│           RabbitMQ                   │                            │
│   Queue: project.analyze.request     │                            │
└──────────────────┬──────────────────┘                            │
                   │                                                │
                   │ 4. Consume                                     │
                   ▼                                                │
          ┌─────────────────┐                                      │
          │    Project      │                                      │
          │    Analyzer     │                                      │
          │     (Go)        │                                      │
          │                 │                                      │
          │ - Clone repo    │                                      │
          │ - Analyze code  │                                      │
          │ - Call Gemini   │                                      │
          │ - Extract skills│                                      │
          └────────┬────────┘                                      │
                   │                                                │
                   │ 5. Publish result                              │
                   ▼                                                │
┌─────────────────────────────────────┐                            │
│           RabbitMQ                   │                            │
│      Queue: project.analyzed         │                            │
└──────────────────┬──────────────────┘                            │
                   │                                                │
                   │ 6. Consume                                     │
                   ▼                                                │
          ┌─────────────────┐                                      │
          │     Aura        │                                      │
          │   Processor     │                                      │
          │                 │                                      │
          │ - Update project│──────────────────────────────────────┘
          │ - Add skills    │ 7. Update DB
          │ - Calc Aura     │
          │ - Log activity  │
          └─────────────────┘
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# RabbitMQ Connection
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# Exchange
EXCHANGE_NAME=project.events

# Queues
CONSUME_QUEUE=project.analyze.request   # For analyzer
PUBLISH_QUEUE=project.analyzed          # After analysis
```

### Publisher Code (TypeScript)

```typescript
// user-service/src/rabbitmq/publisher.ts

const EXCHANGE_NAME = 'project.events';
const ANALYZE_QUEUE = 'project.analyze.request';

class RabbitMQPublisher {
  async publishAnalyzeRequest(data: {
    projectId: string;
    userId: string;
    repoUrl: string;
    repoName: string;
    defaultBranch: string;
  }) {
    const message = Buffer.from(JSON.stringify(data));
    
    this.channel.publish(
      EXCHANGE_NAME,
      ANALYZE_QUEUE,
      message,
      { persistent: true, contentType: 'application/json' }
    );
  }
}
```

### Consumer Code (Go)

```go
// project-analyzer/internal/rabbitmq/consumer.go

func (c *Consumer) StartConsuming() {
    msgs, _ := c.channel.Consume(
        "project.analyze.request",
        "",
        false,  // auto-ack: false for manual ack
        false,
        false,
        false,
        nil,
    )

    for msg := range msgs {
        var request AnalyzeRequest
        json.Unmarshal(msg.Body, &request)
        
        result := c.analyzer.Analyze(request)
        
        c.publisher.Publish("project.analyzed", result)
        
        msg.Ack(false)  // Acknowledge message
    }
}
```

---

## 🔁 Retry & Dead Letter Queue

### DLX Configuration

When a message fails processing, it goes to the Dead Letter Exchange:

```
project.events.dlx (Dead Letter Exchange)
       │
       ▼
project.analyze.request.dlq (Dead Letter Queue)
```

**Retry Strategy:**
1. Message fails → goes to DLQ
2. After delay, retry worker picks up
3. Max 3 retries
4. After 3 failures → logged and discarded

### Queue Declaration with DLX

```typescript
await channel.assertQueue('project.analyze.request', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'project.events.dlx'
  }
});
```

---

## 📊 Monitoring

### RabbitMQ Management UI

- **URL:** http://localhost:15672
- **Default Credentials:** guest / guest

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue Depth | Messages waiting | > 100 |
| Consumer Count | Active consumers | < 1 |
| Publish Rate | Messages/sec | N/A |
| Ack Rate | Acknowledgments/sec | N/A |
| Unacked | Unacknowledged messages | > 50 |

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Messages Not Being Consumed
```bash
# Check if consumer is running
docker logs verifydev-analyzer

# Check queue status
docker exec verifydev-rabbitmq rabbitmqctl list_queues
```

#### 2. Messages Going to DLQ
```bash
# Check DLQ depth
docker exec verifydev-rabbitmq rabbitmqctl list_queues | grep dlq

# View DLQ messages (Management UI)
# Go to Queues → project.analyze.request.dlq → Get Messages
```

#### 3. Connection Issues
```bash
# Test RabbitMQ connection
docker exec verifydev-rabbitmq rabbitmq-diagnostics check_running

# Check connection from service
docker logs verifydev-user | grep RabbitMQ
```

---

## 📝 Best Practices

1. **Always use persistent messages** - Survive broker restarts
2. **Manual acknowledgments** - Don't lose messages on crash
3. **Dead letter queues** - Handle failures gracefully
4. **Idempotent consumers** - Same message processed twice = same result
5. **Message TTL** - Expire old messages

---

> Last Updated: January 2026
