# Development Guide

This guide covers the development workflow, best practices, and conventions for this project.

## Table of Contents

- [Development Environment](#development-environment)
- [Workflow](#workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Common Patterns](#common-patterns)

## Development Environment

### Recommended Tools

- **IDE**: [Cursor](https://cursor.sh/), VS Code, or WebStorm
- **Terminal**: iTerm2, Hyper, or built-in terminal
- **Git Client**: Command line or GitHub Desktop
- **Database Browser**: Convex Dashboard
- **API Testing**: Convex Dashboard Functions tab

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "expo.vscode-expo-tools",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Environment Setup

Create `.env.local` files in each app:

**apps/web/.env.local**

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

**apps/native/.env.local**

```env
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

## Workflow

### Starting Development

```bash
# Start everything
npm run dev

# Or start individually
cd apps/web && yarn dev          # Web only
cd apps/native && yarn start     # Native only
cd packages/backend && npx convex dev  # Backend only
```

### Making Changes

1. **Backend Changes** (Convex)

   ```bash
   # Edit files in packages/backend/convex/
   # Changes auto-deploy to dev environment
   # Check logs in terminal or Convex dashboard
   ```

2. **Web Changes**

   ```bash
   # Edit files in apps/web/src/
   # Hot reload in browser
   # Check browser console for errors
   ```

3. **Native Changes**
   ```bash
   # Edit files in apps/native/src/
   # Shake device (or Cmd+D) to reload
   # Or enable Fast Refresh (automatic)
   ```

### Adding Dependencies

Always use Yarn in the correct workspace:

```bash
# Web dependency
cd apps/web
yarn add package-name

# Native dependency
cd apps/native
yarn add package-name
expo install expo-specific-package

# Backend dependency
cd packages/backend
yarn add package-name

# Dev dependency
yarn add -D package-name
```

### Adding Features

1. **Plan the Feature**

   - Define requirements
   - Design data model
   - Plan API surface
   - Consider both web and native

2. **Update Backend**

   ```bash
   # 1. Update schema if needed
   # packages/backend/convex/schema.ts

   # 2. Add/update functions
   # packages/backend/convex/your-feature.ts

   # 3. Verify types generate correctly
   # Check _generated/api.d.ts
   ```

3. **Update Frontend(s)**

   ```typescript
   // Import generated API
   import { api } from "convex/_generated/api";

   // Use in component
   const data = useQuery(api.yourFeature.list);
   const mutate = useMutation(api.yourFeature.create);
   ```

4. **Test**
   - Test in web app
   - Test in native app
   - Test real-time updates
   - Test error cases

## Code Style

### TypeScript

```typescript
// ✅ Good - Explicit types for public APIs
interface NoteProps {
  noteId: string;
  onUpdate?: () => void;
}

export function NoteCard({ noteId, onUpdate }: NoteProps) {
  // Implementation
}

// ✅ Good - Type inference for local variables
const notes = useQuery(api.notes.list);
const [isEditing, setIsEditing] = useState(false);

// ❌ Avoid - Using 'any'
function processData(data: any) {}

// ❌ Avoid - Unnecessary explicit types
const name: string = "John"; // Type is obvious
```

### React Components

```typescript
// ✅ Good - Functional components with hooks
export function NotesList() {
  const notes = useQuery(api.notes.list);

  if (!notes) return <LoadingSpinner />;

  return (
    <div className="notes-list">
      {notes.map(note => (
        <NoteCard key={note._id} noteId={note._id} />
      ))}
    </div>
  );
}

// ❌ Avoid - Class components (unless necessary)
export class NotesList extends React.Component { }
```

### Convex Functions

```typescript
// ✅ Good - Clear validation and error handling
export const createNote = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    if (args.title.length === 0) {
      throw new Error("Title cannot be empty");
    }

    return await ctx.db.insert("notes", {
      ...args,
      userId: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ❌ Avoid - No validation
export const createNote = mutation({
  handler: async (ctx, args: any) => {
    return await ctx.db.insert("notes", args);
  },
});
```

### File Naming

```
✅ Good
- NoteCard.tsx         (Component)
- useNotes.ts          (Hook)
- notes.ts             (Convex functions)
- types.ts             (Type definitions)
- utils.ts             (Utilities)

❌ Avoid
- note_card.tsx        (Use PascalCase)
- Notes.hooks.ts       (Unnecessary nesting)
- index.tsx            (Not descriptive)
```

### Import Organization

```typescript
// 1. External imports
import { useState } from "react";
import { useQuery } from "convex/react";

// 2. Internal imports (absolute)
import { api } from "convex/_generated/api";

// 3. Relative imports
import { Button } from "../common/Button";
import { formatDate } from "../../lib/utils";

// 4. Type imports (if separate)
import type { Note } from "../../types";
```

## Testing

### Manual Testing

1. **Test Real-time Updates**

   ```
   1. Open web app and native app side-by-side
   2. Make a change in one
   3. Verify it appears in the other
   4. Check timing (should be < 1 second)
   ```

2. **Test Auth Flow**

   ```
   1. Sign out
   2. Sign in with different providers
   3. Verify user data loads correctly
   4. Check protected routes work
   ```

3. **Test Error Cases**
   ```
   1. Disconnect internet
   2. Enter invalid data
   3. Try unauthorized actions
   4. Verify error messages are clear
   ```

### Convex Function Testing

Use the Convex dashboard:

```
1. Go to Functions tab
2. Select your function
3. Enter test arguments (JSON)
4. Click "Run"
5. Verify output and logs
```

### Component Testing (Future)

```typescript
// TODO: Add testing setup
// Recommended: Vitest + React Testing Library
import { render, screen } from "@testing-library/react";
import { NoteCard } from "./NoteCard";

test("renders note title", () => {
  render(<NoteCard noteId="123" />);
  expect(screen.getByText("My Note")).toBeInTheDocument();
});
```

## Git Workflow

### Branch Strategy

```bash
main              # Production-ready code
├── develop       # Integration branch
│   ├── feature/note-tags
│   ├── feature/export-pdf
│   └── fix/auth-redirect
```

### Commit Messages

```bash
# ✅ Good
git commit -m "feat(web): add note tags UI component"
git commit -m "fix(backend): handle empty note title"
git commit -m "docs: update API reference"

# ❌ Avoid
git commit -m "updates"
git commit -m "fixed bug"
git commit -m "WIP"
```

### Conventional Commits

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting (no code change)
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance tasks
```

Scope examples: `web`, `native`, `backend`, `ci`, `deps`

### Pull Requests

Template:

```markdown
## Description

[Brief description of changes]

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested on web
- [ ] Tested on native (iOS)
- [ ] Tested on native (Android)
- [ ] Tested real-time updates

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No console errors
- [ ] Types are correct
```

## Common Patterns

### Loading States

```typescript
// ✅ Good
const notes = useQuery(api.notes.list);

if (notes === undefined) {
  return <LoadingSpinner />;
}

if (notes.length === 0) {
  return <EmptyState message="No notes yet" />;
}

return <NotesList notes={notes} />;
```

### Error Handling

```typescript
// ✅ Good - Frontend
const createNote = useMutation(api.notes.create);

const handleSubmit = async (data) => {
  try {
    await createNote(data);
    toast.success("Note created!");
  } catch (error) {
    toast.error(error.message);
  }
};

// ✅ Good - Backend
export const createNote = mutation({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    if (args.title.length > 200) {
      throw new Error("Title must be less than 200 characters");
    }

    // ... rest of logic
  },
});
```

### Optimistic Updates

```typescript
const updateNote = useMutation(api.notes.update);

const handleUpdate = (id: string, newTitle: string) => {
  // Optimistically update UI
  setLocalTitle(newTitle);

  // Send to server
  updateNote({ id, title: newTitle }).catch((error) => {
    // Revert on error
    setLocalTitle(originalTitle);
    toast.error(error.message);
  });
};
```

### Shared State

```typescript
// ✅ Good - Use Convex queries (shared across apps)
const notes = useQuery(api.notes.list);

// ✅ Good - Local UI state
const [isModalOpen, setIsModalOpen] = useState(false);

// ❌ Avoid - Redux for server state (Convex handles this)
```

## Performance Best Practices

### Frontend

1. **Lazy Load Components**

   ```typescript
   const HeavyComponent = lazy(() => import("./HeavyComponent"));
   ```

2. **Memoize Expensive Computations**

   ```typescript
   const sortedNotes = useMemo(
     () => notes.sort((a, b) => b.createdAt - a.createdAt),
     [notes],
   );
   ```

3. **Use Proper Keys**

   ```typescript
   // ✅ Good - Stable unique key
   {notes.map(note => (
     <NoteCard key={note._id} note={note} />
   ))}

   // ❌ Avoid - Index as key
   {notes.map((note, i) => (
     <NoteCard key={i} note={note} />
   ))}
   ```

### Backend

1. **Use Indexes**

   ```typescript
   // schema.ts
   notes: defineTable({...})
     .index("by_user_and_date", ["userId", "createdAt"])

   // Use the index
   await ctx.db
     .query("notes")
     .withIndex("by_user_and_date", q =>
       q.eq("userId", userId)
     )
     .collect();
   ```

2. **Batch Operations**

   ```typescript
   // ✅ Good
   const promises = noteIds.map((id) => ctx.db.get(id));
   const notes = await Promise.all(promises);

   // ❌ Avoid
   for (const id of noteIds) {
     const note = await ctx.db.get(id);
   }
   ```

## Debugging

### Convex Logs

```typescript
// Add console.log in Convex functions
export const myFunction = query({
  handler: async (ctx, args) => {
    console.log("Args:", args);
    const result = await ctx.db.query("notes").collect();
    console.log("Found notes:", result.length);
    return result;
  },
});

// View logs in:
// - Terminal (if using `npx convex dev`)
// - Convex Dashboard > Logs tab
```

### React DevTools

- Install React DevTools browser extension
- Inspect component props and state
- Profile component renders

### Network Tab

- Check Convex requests in Network tab
- Look for authentication errors
- Verify real-time subscriptions are active

## Resources

- [Convex Best Practices](https://docs.convex.dev/production/best-practices)
- [Next.js Docs](https://nextjs.org/docs)
- [React Native Docs](https://reactnative.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)

## Next Steps

- Review [Architecture](./architecture.md)
- Check [API Reference](./api-reference.md)
- Read [Deployment Guide](./deployment.md)
