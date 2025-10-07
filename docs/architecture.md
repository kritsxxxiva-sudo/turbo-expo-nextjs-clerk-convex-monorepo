# Architecture

This document describes the high-level architecture of the monorepo and how different parts work together.

## Overview

```
┌─────────────────────────────────────────────────────┐
│                     Users                            │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
        ┌──────▼──────┐        ┌─────▼──────┐
        │   Web App   │        │ Mobile App │
        │  (Next.js)  │        │   (Expo)   │
        └──────┬──────┘        └─────┬──────┘
               │                     │
               └──────────┬──────────┘
                          │
                    ┌─────▼─────┐
                    │   Convex  │
                    │  Backend  │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼───┐      ┌────▼────┐     ┌────▼────┐
    │ Clerk  │      │ Convex  │     │ OpenAI  │
    │  Auth  │      │   DB    │     │   API   │
    └────────┘      └─────────┘     └─────────┘
```

## Technology Stack

### Frontend

**Web App (Next.js 15)**

- Framework: Next.js 15 with App Router
- UI: React 19 with concurrent features
- Styling: Tailwind CSS v4 (CSS-first configuration)
- Auth: Clerk React
- Data: Convex React client
- Language: TypeScript

**Mobile App (Expo)**

- Framework: React Native with Expo
- Architecture: New Architecture (Fabric + TurboModules)
- Navigation: React Navigation
- Auth: Clerk Expo
- Data: Convex React Native client
- Language: TypeScript

### Backend

**Convex**

- Database: NoSQL document database
- Functions: Queries, Mutations, Actions
- Real-time: Built-in subscriptions
- Auth: JWT validation (Clerk integration)
- Schema: TypeScript-based schema definition
- Runtime: V8 (optimized) and Node.js

### Infrastructure

**Monorepo**

- Tool: Turborepo
- Package Manager: Yarn workspaces
- Workspaces: `apps/*`, `packages/*`

**Authentication**

- Provider: Clerk
- Methods: Email, Google OAuth, Apple OAuth
- JWT: Used for Convex backend auth

**AI (Optional)**

- Provider: OpenAI
- Use: Text summarization
- Integration: Convex Actions

## Architecture Layers

### 1. Presentation Layer

#### Web App Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── notes/
│   │   ├── page.tsx       # Notes list
│   │   └── [slug]/
│   │       └── page.tsx   # Note detail
│   └── ConvexClientProvider.tsx
├── components/
│   ├── common/            # Shared components
│   ├── home/              # Landing page components
│   └── notes/             # Notes feature components
└── lib/
    └── utils.ts           # Utility functions
```

**Key Concepts:**

- Server Components by default
- Client Components with `"use client"`
- Convex Provider wraps the app
- Real-time subscriptions via `useQuery`

#### Native App Structure

```
apps/native/src/
├── screens/               # Screen components
│   ├── LoginScreen.tsx
│   ├── NotesDashboardScreen.tsx
│   ├── CreateNoteScreen.tsx
│   └── InsideNoteScreen.tsx
├── navigation/
│   └── Navigation.tsx     # Navigation setup
└── assets/                # Images, fonts, icons
```

**Key Concepts:**

- Screen-based navigation
- React Navigation
- Expo SDK for native features
- Convex Provider at root

### 2. Data Layer (Convex)

```
packages/backend/convex/
├── _generated/            # Auto-generated types
│   ├── api.d.ts          # API types
│   └── dataModel.d.ts    # Database types
├── schema.ts             # Database schema
├── notes.ts              # Notes functions
├── openai.ts             # AI integration
├── auth.config.js        # Auth configuration
└── utils.ts              # Helper functions
```

#### Query Pattern

```typescript
// Read data (cached, reactive)
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});
```

**Characteristics:**

- Automatically cached
- Reactive (real-time updates)
- Read-only
- Can use indexes
- Fast and efficient

#### Mutation Pattern

```typescript
// Write data (transactional)
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("notes", {
      ...args,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});
```

**Characteristics:**

- ACID transactions
- Can read and write
- Auth checked
- Validates input
- Returns result

#### Action Pattern

```typescript
// External API calls
export const summarize = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    // Can call external APIs (OpenAI)
    const note = await ctx.runQuery(api.notes.get, { id: args.noteId });
    const summary = await openai.createCompletion({...});
    await ctx.runMutation(api.notes.update, {
      id: args.noteId,
      summary: summary.data,
    });
  },
});
```

**Characteristics:**

- Non-deterministic allowed
- Can call external APIs
- Can run queries/mutations
- Longer timeout
- No automatic retries

### 3. Authentication Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│  User   │────────▶│  Clerk  │────────▶│   App   │
└─────────┘         └────┬────┘         └────┬────┘
                         │                   │
                    JWT Token               JWT
                         │                   │
                         ▼                   ▼
                    ┌─────────────────────────────┐
                    │         Convex              │
                    │  (validates JWT w/ Clerk)   │
                    └─────────────────────────────┘
```

**Flow:**

1. User signs in via Clerk UI
2. Clerk generates JWT token
3. Frontend stores token
4. Token sent with Convex requests
5. Convex validates JWT with Clerk issuer
6. User identity available in functions

### 4. Real-time Data Flow

```
User Action (Web/Native)
    │
    ▼
Convex Mutation
    │
    ▼
Database Write
    │
    ▼
Subscription Update
    │
    ├──────────────┐
    ▼              ▼
Web Component  Native Component
(re-renders)   (re-renders)
```

**Key Points:**

- Changes propagate automatically
- No manual polling needed
- Optimistic updates possible
- Works across devices
- Millisecond latency

## Data Model

### Schema Definition

```typescript
// packages/backend/convex/schema.ts
export default defineSchema({
  notes: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    summary: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_creation", ["userId", "createdAt"]),
});
```

**Indexes:**

- `by_user`: Quick lookup of user's notes
- `by_creation`: Sorted by creation date

## Communication Patterns

### 1. Frontend → Backend

```typescript
// In React component (web or native)
const notes = useQuery(api.notes.list, { userId });
const createNote = useMutation(api.notes.create);
const summarizeNote = useAction(api.notes.summarize);
```

**Types:**

- `useQuery`: Read data, reactive
- `useMutation`: Write data, non-reactive
- `useAction`: External operations

### 2. Backend → External APIs

```typescript
// In Convex Action
export const summarize = action({
  handler: async (ctx, args) => {
    // Call OpenAI
    const response = await fetch("https://api.openai.com/...", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({...}),
    });
    // Process and store result
  },
});
```

## Deployment Architecture

### Development

```
Local Machine
├── Web (localhost:3000)
├── Native (Expo Dev)
└── Convex (dev deployment)
```

### Production

```
┌──────────────┐
│    Vercel    │  ← Web App (Next.js)
└──────┬───────┘
       │
       ├──────────────┐
       │              │
┌──────▼───────┐  ┌──▼──────┐
│    Convex    │  │  Clerk  │
│  (Prod Deploy)│  │  (Prod) │
└──────────────┘  └─────────┘
```

**Native App:** Distributed via App Store / Play Store

## Security Architecture

### Authentication

- Clerk handles user auth
- JWT tokens for API calls
- Token validation in Convex

### Authorization

```typescript
// In Convex functions
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthorized");

// Check ownership
const note = await ctx.db.get(args.noteId);
if (note.userId !== identity.subject) {
  throw new Error("Forbidden");
}
```

### Data Access

- Row-level security via userId checks
- No direct database access from frontend
- All data access through Convex functions

## Scalability Considerations

### Convex

- Automatically scales
- Global edge network
- Built-in caching
- Optimistic concurrency control

### Frontend

- Web: Vercel edge functions
- Native: Client-side rendering
- Static assets: CDN

### Database

- NoSQL: Horizontal scaling
- Indexes: Query optimization
- Real-time: WebSocket connections managed by Convex

## Design Decisions

### Why Turborepo?

- Share code between web and native
- Single command runs everything
- Parallel builds
- Shared dependencies

### Why Convex?

- Real-time by default
- End-to-end type safety
- No API layer needed
- Built-in auth integration
- Serverless (no infrastructure)

### Why Clerk?

- Works on web and native
- Social OAuth support
- JWT for Convex integration
- Good DX

### Why Tailwind CSS?

- Rapid development
- Consistent design
- Small bundle size
- Great with Next.js

## Performance Optimizations

### Web

- Server Components (reduce client JS)
- Image optimization (Next.js)
- Route prefetching
- Code splitting

### Native

- New Architecture (faster renders)
- Hermes engine
- Optimized images
- Lazy loading

### Backend

- Query caching (automatic)
- Index usage
- Batch operations
- Efficient subscriptions

## Monitoring & Debugging

### Convex Dashboard

- Function logs
- Database browser
- Performance metrics
- Error tracking

### Web

- Vercel Analytics
- Browser DevTools
- Next.js build analysis

### Native

- Expo Dev Tools
- React Native Debugger
- Flipper

## Future Considerations

- Offline support (service workers)
- Multi-tenancy
- Advanced caching strategies
- GraphQL layer (if needed)
- Microservices (if scale requires)

## Related Documentation

- [Development Guide](./development.md)
- [API Reference](./api-reference.md)
- [Deployment Guide](./deployment.md)
