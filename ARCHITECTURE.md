# Aksharshruti Backend - Architecture Decision Record (ADR)

**Project**: Aksharshruti Literary Social Network
**Version**: 1.0.0 (MVP)
**Date**: 2025-01-14
**Status**: Approved for Implementation
**Target Launch**: Q2 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Architecture](#api-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [Caching Strategy](#caching-strategy)
8. [Rate Limiting](#rate-limiting)
9. [File Storage & CDN](#file-storage--cdn)
10. [Real-time Communication](#real-time-communication)
11. [Cost Analysis](#cost-analysis)
12. [Scaling Strategy](#scaling-strategy)
13. [Security Considerations](#security-considerations)
14. [Monitoring & Observability](#monitoring--observability)
15. [Development Roadmap](#development-roadmap)

---

## Executive Summary

Aksharshruti is a literary social network platform designed for Indian language writers and readers. The backend architecture is optimized for:

- **Cost Efficiency**: Target $0-15/month for 10K MAU
- **Scalability**: Linear scaling to 1M+ users
- **Performance**: < 300ms API response time (p95)
- **Developer Experience**: Modern TypeScript stack, excellent DX

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **REST API Runtime** | Cloudflare Workers + Hono.js | Edge computing, zero cold starts, $5/10M requests |
| **Real-time Layer** | Railway + Node.js + Socket.io | WebSocket support, easy deployment, $20/month |
| **Database** | NeonDB (Serverless Postgres) | Auto-scaling, generous free tier, Postgres compatibility |
| **Cache** | Upstash Redis | Serverless, HTTP-based, 10K requests/day free |
| **File Storage** | AWS S3 + CloudFront | Industry standard, free tier covers MVP |
| **Live Events** | LiveKit Cloud | Best-in-class real-time, 100 participant-mins free |
| **Authentication** | Custom JWT | Zero cost, full control, Clerk migration path |

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                    │
│                  iOS + Android + (Future: Web)                   │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
             │ HTTPS/REST                       │ WebSocket (WSS)
             │                                  │
    ┌────────▼────────────┐          ┌─────────▼──────────┐
    │  Cloudflare Workers │          │  Railway (Node.js)  │
    │    (Edge Runtime)   │          │   + Socket.io       │
    │                     │          │                     │
    │  - Hono.js Router   │          │  - Event handlers   │
    │  - JWT Middleware   │          │  - Notifications    │
    │  - Rate Limiting    │          │  - Presence system  │
    │  - Validation       │          │  - Chat messages    │
    └────────┬────────────┘          └─────────┬──────────┘
             │                                  │
             │                                  │
             └──────────────┬───────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Upstash Redis  │
                   │   (Cache Layer) │
                   │                 │
                   │  - Feed cache   │
                   │  - Session data │
                   │  - Rate limits  │
                   │  - Presence     │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   NeonDB        │
                   │  (PostgreSQL)   │
                   │                 │
                   │  - Primary DB   │
                   │  - Auto-scaling │
                   │  - Branching    │
                   └─────────────────┘

    ┌─────────────────┐         ┌──────────────────┐
    │  AWS S3 +       │         │  LiveKit Cloud   │
    │  CloudFront     │         │                  │
    │                 │         │  - Video events  │
    │  - Images       │         │  - Audio events  │
    │  - Avatars      │         │  - Screen share  │
    │  - Post media   │         │                  │
    └─────────────────┘         └──────────────────┘
```

### Architecture Layers

**Layer 1: Edge Layer (Cloudflare Workers)**
- Global CDN distribution (300+ cities)
- DDoS protection
- Rate limiting
- Request routing

**Layer 2: Application Layer (Railway + Cloudflare)**
- REST API (stateless, horizontally scalable)
- WebSocket server (sticky sessions for connections)
- Background jobs (queue processing)

**Layer 3: Data Layer**
- PostgreSQL (primary data store)
- Redis (cache + session store)
- S3 (object storage)

**Layer 4: Real-time Layer**
- LiveKit (events, video/audio)
- Socket.io (notifications, presence, chat)

---

## Technology Stack

### Backend Runtime

**REST API: Cloudflare Workers + Hono.js**
```typescript
// Why Cloudflare Workers?
✅ Edge deployment (< 50ms latency globally)
✅ Zero cold starts
✅ 100K requests/day free (3M/month)
✅ Auto-scaling to millions of requests
✅ Cost-effective ($5/10M requests)

// Why Hono.js?
✅ Fastest edge framework (5x faster than Express)
✅ TypeScript-first
✅ Middleware ecosystem
✅ Works on multiple runtimes (Cloudflare, Deno, Bun)
```

**Real-time: Railway + Node.js + Socket.io**
```typescript
// Why Railway?
✅ Simple deployment (git push to deploy)
✅ $5 free credit (enough for MVP)
✅ WebSocket support
✅ Auto-scaling

// Why Socket.io?
✅ Battle-tested (10+ years)
✅ Automatic reconnection
✅ Room/namespace support
✅ Fallback to polling if WebSocket fails
```

**Alternative Considered: Deno Deploy**
- ❌ Rejected: Limited WebSocket support, smaller ecosystem

---

### Database

**Primary: NeonDB (Serverless Postgres)**

**Decision Rationale:**
```typescript
✅ Serverless (auto-scaling storage and compute)
✅ Generous free tier (500MB storage, 10GB transfer)
✅ Postgres compatibility (mature ecosystem)
✅ Database branching (instant dev environments)
✅ Connection pooling built-in
✅ Read replicas (for future scaling)
✅ Point-in-time recovery

// vs Supabase
NeonDB: Better pricing at scale, true serverless
Supabase: More features (auth, storage, realtime) but costlier

// vs PlanetScale
NeonDB: Postgres (JSON, full-text search, PostGIS)
PlanetScale: MySQL (limited JSON support)
```

**Schema Overview:**
- 30+ tables
- 50+ indexes
- JSONB columns for flexible data
- Soft deletes for user-generated content
- Materialized views for analytics

---

### Caching

**Upstash Redis (Serverless)**

**Cache Strategy:**
```typescript
// Tier 1: Hot Cache (5-10 min TTL)
- User feeds
- Trending posts
- Live events

// Tier 2: Warm Cache (30-60 min TTL)
- User profiles
- Post details
- Collections

// Tier 3: Cold Cache (2-24 hours TTL)
- Search results
- Static content
```

**Cache Invalidation:**
- Write-through for critical data (user profiles)
- Cache-aside for read-heavy data (posts, feeds)
- Event-driven invalidation (real-time updates)

---

### File Storage

**AWS S3 + CloudFront CDN**

**Upload Flow:**
```typescript
1. Client requests presigned URL
   POST /api/v1/media/upload
   Response: { uploadUrl, assetId, expiresIn }

2. Client uploads directly to S3
   PUT https://s3.amazonaws.com/bucket/path
   Headers: { Content-Type, Content-Length }

3. Client confirms upload
   POST /api/v1/media/confirm { assetId }

4. Server validates and updates DB
   UPDATE posts SET cover_image_url = cdn_url
```

**Cost Optimization:**
- Client-side image compression (70% size reduction)
- Lazy loading with thumbnails
- S3 Intelligent-Tiering (auto-archive old files)
- CloudFront cache (1-day TTL for images)

**Future Migration Path (at 100K+ MAU):**
- BunnyCDN (60% cheaper than CloudFront)
- ImageKit.io (free tier: 20GB bandwidth)

---

## Database Design

### Design Principles

1. **Normalization**: 3NF for transactional data
2. **Denormalization**: Counters in parent tables for performance
3. **Soft Deletes**: `deleted_at` for user-generated content
4. **Audit Trails**: `created_at`, `updated_at` on all tables
5. **Foreign Keys**: Enforce referential integrity
6. **Indexes**: Cover all foreign keys and query patterns

### Core Tables

**Users & Authentication**
- `users` - User accounts
- `user_preferences` - Language, genre preferences
- `user_settings` - Notification, privacy settings
- `user_stats` - Cached aggregate stats
- `connected_accounts` - Social login accounts

**Content**
- `posts` - Main content table (text, poetry, stories)
- `post_chapters` - Multi-chapter stories
- `collections` - User-curated collections
- `journal_entries` - Private journals

**Social Interactions**
- `likes`, `comments`, `bookmarks`, `shares`
- `follows`, `blocked_users`, `muted_users`
- `comment_reactions` - Like, love, laugh on comments

**Events & Real-time**
- `events` - Live events (video, audio, text)
- `event_participants` - Event attendees
- `event_chat_messages` - Event chat history
- `event_recordings` - Recorded events

**Messaging**
- `conversations` - Chat conversations
- `conversation_participants` - Participants in chats
- `messages` - Chat messages

**Discovery**
- `hashtags` - Trending hashtags
- `post_hashtags` - Post-hashtag relationships
- `trending_posts` - Materialized trending data
- `search_history` - User search history

**Moderation**
- `notifications` - User notifications
- `reports` - Content reports
- `support_tickets` - User support tickets
- `app_feedback` - User feedback

### Performance Optimizations

**Denormalized Counters:**
```sql
ALTER TABLE posts
  ADD COLUMN likes_count INTEGER DEFAULT 0,
  ADD COLUMN comments_count INTEGER DEFAULT 0,
  ADD COLUMN shares_count INTEGER DEFAULT 0;

-- Updated via triggers (no COUNT() queries in feed)
```

**Composite Indexes:**
```sql
-- Feed query optimization
CREATE INDEX idx_posts_user_status_published
  ON posts(user_id, status, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_posts_fulltext
  ON posts USING GIN(to_tsvector('english', title || ' ' || content));
```

**Materialized Views:**
```sql
-- Trending posts (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW trending_posts_view AS
SELECT
  p.id,
  p.title,
  (
    p.likes_count * 1.0 +
    p.comments_count * 3.0 +
    p.shares_count * 5.0
  ) / (EXTRACT(EPOCH FROM (NOW() - p.published_at)) / 3600 + 2) AS score
FROM posts p
WHERE p.status = 'published'
  AND p.published_at > NOW() - INTERVAL '7 days'
ORDER BY score DESC
LIMIT 100;
```

---

## API Architecture

### REST API Design

**Base URL:** `https://api.aksharshruti.com/v1`

**Versioning Strategy:**
- URL-based versioning (`/v1/`, `/v2/`)
- Maintain v1 for 6 months after v2 launch
- Deprecation warnings in response headers

**Response Format:**
```typescript
// Success
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasNext": true
  },
  "meta": {
    "rateLimit": {
      "limit": 100,
      "remaining": 87,
      "reset": 1736899200000
    }
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Successful GET, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Pagination:**
```typescript
// Cursor-based (for infinite scroll)
GET /api/v1/feed?cursor=eyJpZCI6IjEyMyJ9&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6IjE0MyJ9",
    "hasNext": true
  }
}

// Offset-based (for static pages)
GET /api/v1/posts?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### API Route Categories

**Authentication (9 endpoints)**
- Registration, login, logout, password reset
- Social OAuth (Google, Facebook, Apple)
- Token refresh

**User Management (15 endpoints)**
- Profile CRUD, settings, preferences
- Avatar management, onboarding flow
- Connected accounts

**Posts & Content (25 endpoints)**
- Post CRUD, chapters, publishing
- Likes, comments, bookmarks, shares
- Reading progress

**Collections (10 endpoints)**
- Collection CRUD, item management
- Saved collections

**Journal (6 endpoints)**
- Private journal entries
- Calendar view

**Events (15 endpoints)**
- Event CRUD, join/leave, chat
- Recordings

**Social (12 endpoints)**
- Follow/unfollow, followers/following
- Block/mute users

**Messaging (8 endpoints)**
- Conversations, messages
- Read receipts

**Discovery (10 endpoints)**
- Search, trending, feed
- Recommendations, hashtags

**Notifications (5 endpoints)**
- List, mark read, unread count

**Moderation (5 endpoints)**
- Reports, support tickets, feedback

**Total: ~120 endpoints**

---

## Authentication & Authorization

### Authentication Flow

**JWT-based Authentication**

```typescript
// Access Token (short-lived)
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1736899200,
  "exp": 1736900100,  // 15 minutes
  "type": "access"
}

// Refresh Token (long-lived, stored in DB)
{
  "userId": "uuid",
  "tokenId": "uuid",
  "iat": 1736899200,
  "exp": 1737504000,  // 7 days
  "type": "refresh"
}
```

**Token Storage:**
- Access token: Mobile app secure storage (Keychain/Keystore)
- Refresh token: Database (hashed), mobile secure storage

**Refresh Flow:**
```typescript
1. Access token expires (15 min)
2. Client sends refresh token to /api/v1/auth/refresh-token
3. Server validates refresh token from DB
4. Server issues new access token + new refresh token
5. Server invalidates old refresh token (rotation)
```

### Social OAuth Flow

**Google OAuth:**
```typescript
1. Client initiates Google Sign-In (React Native)
2. Client receives Google ID token
3. Client sends ID token to POST /api/v1/auth/social/google
4. Server verifies token with Google
5. Server creates/updates user account
6. Server issues JWT tokens
```

### Authorization (RBAC)

**User Roles:**
- `user` - Regular user (default)
- `verified` - Verified account (email confirmed)
- `moderator` - Content moderator (future)
- `admin` - Platform admin (future)

**Permission Checks:**
```typescript
// Middleware
async function requireAuth(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const decoded = await verifyJWT(token);
  if (!decoded) return c.json({ error: 'Invalid token' }, 401);

  c.set('userId', decoded.userId);
  c.set('userRole', decoded.role);
  await next();
}

// Resource ownership check
async function requireOwnership(c: Context, next: Next) {
  const userId = c.get('userId');
  const postId = c.req.param('postId');
  const post = await db.posts.findById(postId);

  if (post.userId !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
}
```

---

## Caching Strategy

### Cache Tiers

**Tier 1: Hot (5-10 min TTL)**
- User feeds: `feed:user:{userId}:tab:{tabType}:page:{page}`
- Trending posts: `trending:posts:{timeframe}:page:{page}`
- Live events: `events:live`

**Tier 2: Warm (30-60 min TTL)**
- User profiles: `user:profile:{userId}`
- User stats: `user:stats:{userId}`
- Post details: `post:{postId}`
- Collections: `collection:{collectionId}`

**Tier 3: Cold (2-24 hours TTL)**
- Search results: `search:{queryHash}:filters:{filtersHash}:page:{page}`
- Hashtag posts: `hashtag:{tag}:posts:page:{page}`
- User posts: `user:{userId}:posts:published:page:{page}`

### Invalidation Patterns

**Write-Through (Immediate Consistency):**
- User profile updates
- Settings changes
- Post publish/unpublish

**Cache-Aside (Lazy Loading):**
- Post details
- Collections
- User stats

**Event-Driven (Real-time Updates):**
- New post → Invalidate author's followers' feeds
- New like → Increment cached counter
- New follower → Invalidate follower/following lists

### Cache Hit Rate Target

**Goal: 80%+ cache hit rate**

**Monitoring:**
```typescript
const cacheMetrics = {
  hitRate: hits / (hits + misses),
  avgLatency: totalLatency / requests,
  evictionRate: evictions / writes
};

// Alert if hitRate < 70%
```

---

## Rate Limiting

### Rate Limit Tiers

**Authentication (Strict):**
- Registration: 5 req/hour per IP
- Login: 10 req/15min per IP + email
- Password reset: 3 req/hour per IP + email

**Read Operations (Moderate):**
- User profile: 100 req/min per user
- Post details: 200 req/min per user
- Feed: 30 req/min per user
- Search: 20 req/min per user

**Write Operations (Conservative):**
- Create post: 10 req/hour per user
- Create comment: 30 req/hour per user
- Create event: 5 req/hour per user

**Social Interactions (Balanced):**
- Like: 100 req/min per user
- Follow: 50 req/hour per user
- Share: 30 req/hour per user

**Media Upload (Resource-Heavy):**
- Upload: 20 req/hour per user
- Daily quota: 100MB per user

### Implementation

**Sliding Window (Redis):**
```typescript
async function rateLimit(key: string, max: number, window: number) {
  const now = Date.now();
  const clearBefore = now - window * 1000;

  await redis.zremrangebyscore(key, 0, clearBefore);
  const count = await redis.zcard(key);

  if (count >= max) {
    return { allowed: false, remaining: 0 };
  }

  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, window);

  return { allowed: true, remaining: max - count - 1 };
}
```

### Response Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1736899200000
```

---

## File Storage & CDN

### Upload Strategy

**Direct Upload to S3 (Presigned URLs):**
```typescript
1. Client requests upload URL
   POST /api/v1/media/upload
   Request: { fileName, fileType, fileSize }

2. Server validates and generates presigned URL
   const url = await s3.getSignedUrl('putObject', {
     Bucket: 'aksharshruti',
     Key: `uploads/${userId}/${uuid}/${fileName}`,
     ContentType: fileType,
     Expires: 300  // 5 minutes
   });

3. Client uploads directly to S3
   PUT https://s3.amazonaws.com/...

4. Client confirms upload
   POST /api/v1/media/confirm { assetId }

5. Server updates DB with S3 URL
   UPDATE posts SET cover_image_url = cloudfront_url
```

### CDN Configuration

**CloudFront Settings:**
- Cache TTL: 86400 seconds (1 day)
- Compression: Gzip + Brotli
- CORS: Enabled for mobile app domains
- Custom error pages: 404 → placeholder image

**Image Optimization:**
- Client-side compression (quality: 0.8)
- Max dimensions: 1920x1080
- Supported formats: JPEG, PNG, WebP
- Future: Generate thumbnails via Lambda

---

## Real-time Communication

### WebSocket Architecture

**Socket.io Events:**

```typescript
// Server → Client
'notification:new'           // New notification
'event:participant_joined'   // User joined event
'event:participant_left'     // User left event
'event:message'              // Event chat message
'post:liked'                 // Post received like
'post:commented'             // Post received comment
'user:followed'              // User followed
'presence:status_changed'    // User online/offline

// Client → Server
'event:join'                 // Join event
'event:leave'                // Leave event
'event:send_message'         // Send chat message
'presence:update'            // Update online status
```

### Connection Management

**Authentication:**
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = verifyJWT(token);
  if (!decoded) return next(new Error('Authentication failed'));

  socket.userId = decoded.userId;
  next();
});
```

**Room Management:**
```typescript
// User joins event room
socket.on('event:join', async ({ eventId }) => {
  await socket.join(`event:${eventId}`);
  io.to(`event:${eventId}`).emit('event:participant_joined', {
    userId: socket.userId,
    timestamp: Date.now()
  });
});

// Send notification to user
io.to(`user:${userId}`).emit('notification:new', notification);
```

### LiveKit Integration

**Event Creation:**
```typescript
import { RoomServiceClient } from 'livekit-server-sdk';

async function createEvent(event: Event) {
  const livekitClient = new RoomServiceClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  const room = await livekitClient.createRoom({
    name: event.id,
    emptyTimeout: 300,  // 5 minutes
    maxParticipants: event.max_participants
  });

  return room;
}

// Generate participant token
async function getEventToken(userId: string, eventId: string) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: userId }
  );

  token.addGrant({
    roomJoin: true,
    room: eventId,
    canPublish: true,
    canSubscribe: true
  });

  return token.toJwt();
}
```

---

## Cost Analysis

### Monthly Cost Breakdown

**10,000 MAU:**
- Total: $0-15/month
- Potentially FREE on all free tiers
- Recommended buffer: $50/month

**50,000 MAU:**
- Total: $240/month
- Cost per user: $0.0048
- Major cost: LiveKit events (56%)

**100,000 MAU:**
- Total: $1,549/month
- Optimized: $850/month (with BunnyCDN + self-hosted LiveKit)
- Cost per user: $0.015

### Cost Optimization Strategies

**Immediate (MVP):**
1. Client-side image compression
2. Aggressive caching (80%+ hit rate)
3. Lazy loading everywhere
4. Paginate all lists

**Post-Launch:**
1. Migrate to BunnyCDN (60% CDN cost savings)
2. Self-host LiveKit (70% event cost savings)
3. Database query optimization
4. Image CDN (ImageKit free tier)

---

## Scaling Strategy

### Horizontal Scaling

**Cloudflare Workers:**
- Auto-scales infinitely
- No configuration needed

**Railway (WebSocket):**
```yaml
# Auto-scaling config
minReplicas: 1
maxReplicas: 5
targetCPU: 70%
targetMemory: 80%
```

**NeonDB:**
- Auto-scales storage and compute
- Add read replicas at 100K+ MAU:
  - Primary: Writes
  - Replica 1: Reads (feed, search)
  - Replica 2: Analytics

### Database Connection Pooling

**PgBouncer Configuration:**
```ini
[databases]
aksharshruti = host=neon.tech port=5432 dbname=aksharshruti

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
```

### Caching Layer Scaling

**Redis:**
- Upstash auto-scales
- Monitor memory usage
- Consider Redis cluster at 100K+ MAU

---

## Security Considerations

### Input Validation

**Zod Schemas:**
```typescript
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(50000),
  postType: z.enum(['text', 'image', 'journal', 'poetry', 'story']),
  language: z.string().min(2).max(50),
  tags: z.array(z.string()).max(10)
});

// Middleware
async function validateRequest(c: Context, next: Next) {
  const body = await c.req.json();
  const result = createPostSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: result.error.errors
      }
    }, 400);
  }

  c.set('validatedData', result.data);
  await next();
}
```

### SQL Injection Prevention

**Parameterized Queries (Always):**
```typescript
// ✅ GOOD
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ BAD (never do this)
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### XSS Protection

**Content Sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target']
  });
}
```

### CORS Configuration

```typescript
app.use('*', cors({
  origin: [
    'https://aksharshruti.com',
    'https://app.aksharshruti.com',
    // Mobile app schemes
    'capacitor://localhost',
    'ionic://localhost'
  ],
  credentials: true,
  maxAge: 86400
}));
```

### Secrets Management

**Environment Variables:**
```bash
# Cloudflare Workers Secrets
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY

# Railway Secrets (via UI or CLI)
railway variables set DATABASE_URL=...
railway variables set REDIS_URL=...
```

**Never commit:**
- `.env` files
- API keys
- Database credentials
- JWT secrets

---

## Monitoring & Observability

### Error Tracking

**Sentry Integration:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT,
  tracesSampleRate: 0.1  // Sample 10% of transactions
});

// Capture errors
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    user: { id: userId, email },
    tags: { endpoint: '/api/v1/posts' },
    extra: { postId }
  });
}
```

### Analytics

**Mixpanel Events:**
```typescript
mixpanel.track('post_created', {
  userId,
  postType,
  language,
  timeSpent: endTime - startTime,
  hasImage: !!coverImage
});

// User properties
mixpanel.people.set(userId, {
  $email: email,
  $name: displayName,
  language: preferredLanguage,
  signUpDate: joinedDate
});
```

### Performance Monitoring

**CloudWatch Metrics:**
```typescript
cloudwatch.putMetric({
  MetricName: 'APILatency',
  Value: latency,
  Unit: 'Milliseconds',
  Dimensions: [
    { Name: 'Endpoint', Value: '/api/v1/feed' },
    { Name: 'Method', Value: 'GET' }
  ]
});
```

**Custom Metrics:**
- API latency (p50, p95, p99)
- Error rate by endpoint
- Cache hit rate
- Database connection pool usage
- WebSocket active connections

### Health Checks

```typescript
app.get('/health', async (c) => {
  const dbHealth = await checkDatabase();
  const redisHealth = await checkRedis();

  const health = {
    status: dbHealth && redisHealth ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    services: {
      database: dbHealth ? 'up' : 'down',
      redis: redisHealth ? 'up' : 'down'
    }
  };

  return c.json(health, dbHealth && redisHealth ? 200 : 503);
});
```

---

## Development Roadmap

### Phase 0: Infrastructure Setup (Week 1-2)

- [ ] Set up NeonDB database
- [ ] Configure Cloudflare Workers
- [ ] Set up Railway project
- [ ] Create AWS S3 bucket + CloudFront distribution
- [ ] Configure Upstash Redis
- [ ] Set up LiveKit Cloud account
- [ ] Initialize Git repository
- [ ] Set up CI/CD pipeline (GitHub Actions)

### Phase 1: Core MVP (Week 3-8)

**Priority P0 (Blocking Launch):**
- [ ] Authentication system (JWT, social OAuth)
- [ ] User profiles (CRUD, settings)
- [ ] Post creation and viewing
- [ ] Feed generation (following + discover)
- [ ] Social interactions (like, comment, follow)
- [ ] Basic search

**Priority P1 (Launch Essentials):**
- [ ] Collections
- [ ] Image uploads
- [ ] Notifications
- [ ] Hashtags

### Phase 2: Growth Features (Week 9-12)

**Priority P2:**
- [ ] Events and live sessions (LiveKit)
- [ ] Journal entries
- [ ] Advanced search (filters, full-text)
- [ ] Messaging
- [ ] User analytics dashboard

### Phase 3: Optimization (Week 13-16)

- [ ] Performance optimization
- [ ] Database query optimization
- [ ] Cache warming
- [ ] Rate limiting tuning
- [ ] Security audit
- [ ] Load testing

### Phase 4: Polish (Week 17-20)

**Priority P3 (Post-Launch):**
- [ ] Event recordings
- [ ] Trending algorithm v2
- [ ] Admin dashboard
- [ ] Moderation tools
- [ ] Premium features

---

## Technical Constraints

### Cloudflare Workers Limitations

- ❌ No long-running processes (max 30 seconds)
- ❌ No WebSocket support (use Railway for this)
- ❌ No file system access
- ✅ 128MB memory limit (enough for API)
- ✅ 1MB request/response size limit

### NeonDB Limitations

- Free tier: 500MB storage (upgrade at 10K+ MAU)
- Max 100 concurrent connections (use pooling)
- No PostGIS in free tier (upgrade if geolocation needed)

### Upstash Redis Limitations

- Free tier: 10K requests/day
- HTTP-based (slower than TCP, but acceptable)
- No Redis modules (e.g., RedisJSON, RedisSearch)

---

## Migration Paths

### Database Migration (if needed)

**From NeonDB to self-hosted Postgres:**
```bash
# Export from Neon
pg_dump $NEON_URL > dump.sql

# Import to new DB
psql $NEW_DB_URL < dump.sql

# Update connection strings
# Zero downtime: Use read replica, then promote
```

### CDN Migration (BunnyCDN)

**From CloudFront to BunnyCDN:**
1. Create BunnyCDN storage zone
2. Sync existing S3 files to BunnyCDN
3. Update image URLs in database
4. Point DNS to BunnyCDN
5. Monitor for 1 week, then deprecate CloudFront

---

## Appendix

### Useful Commands

```bash
# Database migrations
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# Deploy to Cloudflare
wrangler deploy

# Deploy to Railway
railway up

# Run tests
npm test

# Load testing
npx artillery run load-test.yml
```

### Environment Variables

```bash
# Cloudflare Workers (.dev.vars)
DATABASE_URL=postgresql://...
REDIS_URL=https://...
JWT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=aksharshruti
CLOUDFRONT_URL=https://...

# Railway
WEBSOCKET_PORT=3000
REDIS_URL=https://...
DATABASE_URL=postgresql://...
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# Analytics
SENTRY_DSN=https://...
MIXPANEL_TOKEN=...
```

### External Dependencies

```json
{
  "dependencies": {
    "@hono/hono": "^4.0.0",
    "@neondatabase/serverless": "^0.9.0",
    "@upstash/redis": "^1.28.0",
    "zod": "^3.22.4",
    "socket.io": "^4.6.1",
    "livekit-server-sdk": "^1.2.7",
    "aws-sdk": "^2.1500.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "wrangler": "^3.20.0",
    "drizzle-kit": "^0.20.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Approval & Sign-off

**Architecture Status:** ✅ **APPROVED FOR IMPLEMENTATION**

**Next Steps:**
1. Proceed to **[IMPLEMENT]** phase
2. Set up infrastructure (Phase 0)
3. Begin MVP development (Phase 1)

**Estimated Timeline:**
- Phase 0: 2 weeks
- Phase 1 MVP: 6 weeks
- Total to launch: 8 weeks

**Budget Approval:**
- MVP (10K MAU): $50/month buffer
- Growth (50K MAU): $300/month
- Scale (100K MAU): $1,000/month

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-14
**Next Review:** Post-MVP Launch (Q2 2025)

---

## Contact & Support

**Project Lead:** [Your Name]
**Backend Team:** Multi-Agent Development System
**Repository:** https://github.com/Adi202001/Aksharshruti-backend

For questions or clarifications, refer to this ADR or create an issue in the repository.

---

*End of Architecture Decision Record*
