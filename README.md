# Aksharshruti Backend

Backend services for **Aksharshruti** - A literary social network for Indian language writers and readers.

## 🚀 Project Status

**Current Phase:** Phase 0 - Infrastructure Setup ✅ **COMPLETE**

**Next Phase:** Phase 1 - Core MVP Development

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

## 🏗️ Architecture

Aksharshruti uses a hybrid architecture optimized for performance and cost-efficiency:

```
┌─────────────────────────────────────────┐
│     Mobile App (React Native)           │
└────────┬──────────────┬─────────────────┘
         │              │
    REST API        WebSocket
         │              │
┌────────▼────────┐ ┌──▼──────────┐
│ Cloudflare      │ │  Railway    │
│ Workers         │ │  Node.js    │
│ + Hono.js       │ │  Socket.io  │
└────────┬────────┘ └──┬──────────┘
         │              │
    ┌────▼──────────────▼───┐
    │     NeonDB (Postgres)  │
    │  Upstash Redis (Cache) │
    └────────────────────────┘
```

### Key Design Decisions

- **Edge Computing**: Cloudflare Workers for < 50ms global latency
- **Serverless Database**: NeonDB auto-scales from 0 to millions of users
- **Cost-Optimized**: Target $0-15/month for 10K MAU
- **Real-time First**: WebSocket for notifications, presence, events
- **Hybrid Caching**: Redis + edge caching for 80%+ hit rate

See [ARCHITECTURE.md](./ARCHITECTURE.md) for comprehensive architecture documentation.

## 🛠️ Tech Stack

### Runtime & Frameworks

- **REST API**: [Cloudflare Workers](https://workers.cloudflare.com/) + [Hono.js](https://hono.dev/)
- **Real-time**: [Node.js](https://nodejs.org/) + [Socket.io](https://socket.io/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)

### Data Layer

- **Database**: [NeonDB](https://neon.tech/) (Serverless Postgres)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Cache**: [Upstash Redis](https://upstash.com/) (Serverless)

### Infrastructure

- **API Hosting**: Cloudflare Workers (Edge)
- **WebSocket Hosting**: [Railway](https://railway.app/)
- **File Storage**: AWS S3 + CloudFront CDN
- **Live Events**: [LiveKit Cloud](https://livekit.io/)

### Developer Tools

- **Monorepo**: pnpm workspaces
- **Package Manager**: pnpm (v8+)
- **Testing**: Vitest
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier

## 📁 Project Structure

```
Aksharshruti-backend/
├── apps/
│   ├── api/                  # Cloudflare Workers REST API
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── middleware/   # Auth, rate limiting, etc.
│   │   │   ├── services/     # Business logic
│   │   │   └── utils/        # Helper functions
│   │   ├── wrangler.toml     # Cloudflare config
│   │   └── package.json
│   │
│   └── realtime/             # Railway WebSocket server
│       ├── src/
│       │   ├── handlers/     # Socket.io event handlers
│       │   ├── services/     # Business logic
│       │   └── utils/        # Helper functions
│       ├── railway.json      # Railway config
│       └── package.json
│
├── packages/
│   ├── database/             # Drizzle ORM schemas & migrations
│   │   ├── schema/           # Database table definitions
│   │   ├── migrations/       # SQL migrations
│   │   └── drizzle.config.ts
│   │
│   ├── shared/               # Shared types & utilities
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Shared functions
│   │
│   └── validation/           # Zod validation schemas
│       └── schemas/          # Input validation
│
├── docs/
│   ├── api/                  # API documentation
│   └── deployment/           # Deployment guides
│
├── scripts/
│   └── seed.ts               # Database seeding
│
├── ARCHITECTURE.md           # Architecture documentation
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace config
├── tsconfig.json             # TypeScript config
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+ ([Download](https://nodejs.org/))
- **pnpm**: v8+ (`npm install -g pnpm`)
- **NeonDB Account**: [Sign up](https://neon.tech/)
- **Upstash Account**: [Sign up](https://upstash.com/)
- **Cloudflare Account**: [Sign up](https://cloudflare.com/)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Adi202001/Aksharshruti-backend.git
cd Aksharshruti-backend
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
# Copy example env files
cp .env.example .env
cp apps/api/.dev.vars.example apps/api/.dev.vars

# Edit .env and apps/api/.dev.vars with your credentials
```

4. **Set up database**

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed database
pnpm db:seed
```

5. **Start development servers**

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api       # Cloudflare Workers API
pnpm dev:realtime  # WebSocket server
```

### Verify Installation

- **REST API**: http://localhost:8787/health
- **WebSocket**: http://localhost:3000/health

## 💻 Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:api                # Start API only
pnpm dev:realtime           # Start WebSocket server only

# Build
pnpm build                  # Build all apps
pnpm build:api              # Build API
pnpm build:realtime         # Build realtime server

# Database
pnpm db:generate            # Generate migrations
pnpm db:migrate             # Run migrations
pnpm db:push                # Push schema changes (dev only)
pnpm db:studio              # Open Drizzle Studio
pnpm db:seed                # Seed database

# Testing
pnpm test                   # Run tests
pnpm test:coverage          # Run tests with coverage

# Code Quality
pnpm lint                   # Lint code
pnpm lint:fix               # Lint and fix
pnpm format                 # Format code
pnpm format:check           # Check formatting
pnpm typecheck              # Type check

# Deployment
pnpm deploy:api             # Deploy to Cloudflare
pnpm deploy:realtime        # Deploy to Railway
```

### API Development

The API follows a route-based structure:

```typescript
// apps/api/src/routes/example.ts
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { rateLimits } from '../middleware/rate-limit';

export const exampleRoutes = new Hono();

exampleRoutes.get('/', requireAuth, rateLimits.read.standard, async (c) => {
  const userId = c.get('userId');

  // Your logic here

  return c.json({ success: true, data: {} });
});
```

### WebSocket Development

Add new event handlers in `apps/realtime/src/handlers/`:

```typescript
// apps/realtime/src/handlers/example.ts
import { Server, Socket } from 'socket.io';

export function exampleHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on('example:event', async (data) => {
    // Your logic here
    socket.emit('example:response', { success: true });
  });
}
```

### Database Migrations

```bash
# 1. Modify schema in packages/database/src/schema/
# 2. Generate migration
pnpm db:generate

# 3. Review migration in packages/database/migrations/
# 4. Apply migration
pnpm db:migrate
```

## 🚢 Deployment

### Cloudflare Workers (API)

```bash
# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put REDIS_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY

# Deploy
pnpm deploy:api
```

### Railway (WebSocket)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables via Railway dashboard

# Deploy
pnpm deploy:realtime
```

### Environment Variables

See [.env.example](./.env.example) for required environment variables.

## 📚 Documentation

- **[Architecture Documentation](./ARCHITECTURE.md)** - Complete system architecture
- **[API Documentation](./docs/api/)** - REST API endpoints (Coming soon)
- **[Database Schema](./packages/database/schema/)** - Database table definitions
- **[Deployment Guide](./docs/deployment/)** - Deployment instructions (Coming soon)

## 🗺️ Roadmap

### Phase 0: Infrastructure Setup ✅ (COMPLETE)

- [x] Project structure and monorepo setup
- [x] Database schema with Drizzle ORM
- [x] Cloudflare Workers API structure
- [x] Railway WebSocket server structure
- [x] Authentication middleware (JWT)
- [x] Rate limiting middleware
- [x] Shared types and validation schemas

### Phase 1: Core MVP (In Progress)

- [ ] User registration and authentication
- [ ] User profiles and settings
- [ ] Post creation and viewing
- [ ] Feed generation (following + discover)
- [ ] Social interactions (like, comment, follow)
- [ ] Basic search
- [ ] Collections
- [ ] Image uploads
- [ ] Notifications

### Phase 2: Growth Features

- [ ] Events and live sessions (LiveKit)
- [ ] Journal entries
- [ ] Advanced search (filters, full-text)
- [ ] Messaging
- [ ] User analytics dashboard

### Phase 3: Optimization

- [ ] Performance optimization
- [ ] Database query optimization
- [ ] Cache warming
- [ ] Rate limiting tuning
- [ ] Security audit
- [ ] Load testing

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete 20-week roadmap.

## 🤝 Contributing

This is currently a private project. Contribution guidelines will be added when the project goes public.

## 📄 License

Copyright © 2025 Aksharshruti. All rights reserved.

## 🔗 Links

- **Frontend Repository**: [Coming soon]
- **Mobile App Repository**: [Coming soon]
- **Documentation Site**: [Coming soon]

## 📞 Contact

For questions or support, please contact the development team.

---

**Built with ❤️ for Indian language writers and readers**
