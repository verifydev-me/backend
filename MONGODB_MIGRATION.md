# MongoDB Migration Guide

## ✅ Completed Changes

### 1. Docker Compose Configuration
- ❌ Removed PostgreSQL container
- ✅ Updated all services to use MongoDB Atlas connection string
- ✅ Connection: `mongodb+srv://thesharmakeshav:TFJUWDRi46dbR5TB@cluster0.kegg0.mongodb.net/`

### 2. Database Separation
Each service now uses its own MongoDB database:
- **auth-service**: `verifydev` database
- **user-service**: `verifydev` database  
- **job-service**: `verifydev_jobs` database
- **recruiter-service**: `verifydev_recruiters` database
- **aura-processor**: `verifydev` database
- **resume-service**: `verifydev` database

### 3. Frontend Resume Builder
- ✅ Fixed hardcoded dark colors (slate-900, slate-800)
- ✅ Replaced with theme-aware classes (`bg-card`, `border-border`, `text-muted-foreground`)
- ✅ Now works properly in both light and dark modes

---

## 🔧 Required Code Changes

### **STEP 1: Update Prisma Schema to MongoDB**

Each service using Prisma needs schema updates:

#### File: `auth-service/prisma/schema.prisma`
```prisma
datasource db {
  provider = "mongodb"  // Changed from "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Update all models to use MongoDB IDs
model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String   @unique
  // ... rest of fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Session {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  // ... rest of fields
}
```

**Do this for ALL services**:
- `auth-service/prisma/schema.prisma`
- `user-service/prisma/schema.prisma`
- `job-service/prisma/schema.prisma`
- `recruiter-service/prisma/schema.prisma`

### **STEP 2: Update Relations**

MongoDB doesn't support foreign keys. Update relations:

```prisma
// Before (PostgreSQL)
model Post {
  id       Int    @id @default(autoincrement())
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}

// After (MongoDB)
model Post {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  authorId String @db.ObjectId
  author   User   @relation(fields: [authorId], references: [id])
}
```

### **STEP 3: Regenerate Prisma Client**

Run in each service directory:
```bash
cd auth-service
npx prisma generate
npx prisma db push

cd ../user-service
npx prisma generate
npx prisma db push

cd ../job-service
npx prisma generate  
npx prisma db push

cd ../recruiter-service
npx prisma generate
npx prisma db push
```

### **STEP 4: Update Go Services (if using direct SQL)**

For `project-analyzer` and `resume-service` (Go services):

Replace PostgreSQL driver with MongoDB:

```go
// Before
import _ "github.com/lib/pq"

// After  
import "go.mongodb.org/mongo-driver/mongo"
```

---

## 🚀 Running the Application

### 1. Rebuild Docker Images
```bash
docker compose build
```

### 2. Start Services
```bash
docker compose up
```

### 3. Verify MongoDB Connection
Check logs to ensure connection successful:
```bash
docker compose logs auth-service | grep -i mongo
docker compose logs user-service | grep -i mongo
```

---

## ⚠️ Important Notes

1. **No Migration Tool**: PostgreSQL → MongoDB migration requires manual data export/import
2. **Schema Differences**: MongoDB is schemaless but Prisma enforces types
3. **Transactions**: MongoDB transactions require replica sets (your Atlas cluster supports this)
4. **Indexing**: Create indexes in MongoDB Atlas for performance:
   ```javascript
   db.User.createIndex({ "email": 1 }, { unique: true })
   db.Session.createIndex({ "userId": 1 })
   ```

---

## 🔐 Security Considerations

**Current Connection String (visible in docker-compose.yml):**
```
mongodb+srv://thesharmakeshav:TFJUWDRi46dbR5TB@cluster0.kegg0.mongodb.net/
```

**⚠️ Security Risk**: Password is hardcoded!

**✅ Recommended Fix**: Move to `.env` file:

```env
# .env file
MONGODB_CONNECTION_STRING=mongodb+srv://thesharmakeshav:TFJUWDRi46dbR5TB@cluster0.kegg0.mongodb.net/verifydev?retryWrites=true&w=majority
```

Then in `docker-compose.yml`:
```yaml
environment:
  - DATABASE_URL=${MONGODB_CONNECTION_STRING}
```

---

## 📊 Data Migration (if needed)

If you have existing PostgreSQL data to migrate:

1. **Export from PostgreSQL**:
   ```bash
   docker exec -it verifydev-postgres pg_dump -U verifydev -d verifydev > backup.sql
   ```

2. **Convert SQL to MongoDB documents** (manual process)

3. **Import to MongoDB Atlas**:
   ```bash
   mongoimport --uri="mongodb+srv://..." --db=verifydev --collection=users --file=users.json
   ```

---

## ✅ Checklist

- [x] Updated docker-compose.yml
- [x] Fixed resume builder colors
- [ ] Update Prisma schemas (auth, user, job, recruiter)
- [ ] Regenerate Prisma clients
- [ ] Update Go MongoDB drivers (if needed)
- [ ] Run `docker compose build`
- [ ] Run `docker compose up`
- [ ] Test all services
- [ ] Move connection string to `.env`
- [ ] Create MongoDB indexes
- [ ] Migrate existing data (if any)
