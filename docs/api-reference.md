# API Reference

This document provides a comprehensive reference for the Convex backend API.

## Overview

All API functions are defined in `packages/backend/convex/` and automatically generate TypeScript types in `_generated/api.d.ts`.

## Authentication

All authenticated functions check for a valid user session:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Unauthorized");
}
```

## Notes API

### Queries

#### `notes.list`

Get all notes for the current user.

**Args:**

```typescript
{
  userId: string;
}
```

**Returns:**

```typescript
Array<{
  _id: Id<"notes">;
  _creationTime: number;
  title: string;
  content: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
}>;
```

**Example:**

```typescript
const notes = useQuery(api.notes.list, { userId: user.id });
```

---

#### `notes.get`

Get a single note by ID.

**Args:**

```typescript
{
  id: Id<"notes">;
}
```

**Returns:**

```typescript
{
  _id: Id<"notes">;
  title: string;
  content: string;
  userId: string;
  // ... other fields
} | null
```

**Example:**

```typescript
const note = useQuery(api.notes.get, { id: noteId });
```

---

### Mutations

#### `notes.create`

Create a new note.

**Args:**

```typescript
{
  title: string;
  content: string;
}
```

**Returns:**

```typescript
Id<"notes">; // The ID of the created note
```

**Errors:**

- `"Unauthorized"` - User not authenticated
- `"Title cannot be empty"` - Title is empty

**Example:**

```typescript
const createNote = useMutation(api.notes.create);

await createNote({
  title: "My Note",
  content: "Note content here",
});
```

---

#### `notes.update`

Update an existing note.

**Args:**

```typescript
{
  id: Id<"notes">;
  title?: string;
  content?: string;
}
```

**Returns:**

```typescript
void
```

**Errors:**

- `"Unauthorized"` - User not authenticated
- `"Note not found"` - Note doesn't exist
- `"Forbidden"` - User doesn't own the note

**Example:**

```typescript
const updateNote = useMutation(api.notes.update);

await updateNote({
  id: noteId,
  title: "Updated Title",
});
```

---

#### `notes.delete`

Delete a note.

**Args:**

```typescript
{
  id: Id<"notes">;
}
```

**Returns:**

```typescript
void
```

**Errors:**

- `"Unauthorized"` - User not authenticated
- `"Note not found"` - Note doesn't exist
- `"Forbidden"` - User doesn't own the note

**Example:**

```typescript
const deleteNote = useMutation(api.notes.delete);

await deleteNote({ id: noteId });
```

---

### Actions

#### `openai.summarizeNote`

Generate AI summary for a note using OpenAI.

**Args:**

```typescript
{
  noteId: Id<"notes">;
}
```

**Returns:**

```typescript
{
  summary: string;
}
```

**Errors:**

- `"Unauthorized"` - User not authenticated
- `"Note not found"` - Note doesn't exist
- `"OpenAI API error"` - OpenAI request failed

**Example:**

```typescript
const summarize = useAction(api.openai.summarizeNote);

const result = await summarize({ noteId });
console.log(result.summary);
```

**Note:** Requires `OPENAI_API_KEY` environment variable in Convex.

---

## Database Schema

### Notes Table

```typescript
notes: defineTable({
  title: v.string(),
  content: v.string(),
  userId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  summary: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_creation", ["userId", "createdAt"]);
```

**Fields:**

- `title` - Note title (required)
- `content` - Note content (required)
- `userId` - Owner's user ID (required)
- `createdAt` - Creation timestamp (milliseconds)
- `updatedAt` - Last update timestamp (milliseconds)
- `summary` - AI-generated summary (optional)

**Indexes:**

- `by_user` - Query notes by user
- `by_creation` - Query notes by user and creation date

---

## Error Handling

### Standard Errors

All functions may throw these errors:

| Error             | Description                  |
| ----------------- | ---------------------------- |
| `"Unauthorized"`  | User not authenticated       |
| `"Forbidden"`     | User doesn't have permission |
| `"Not Found"`     | Resource doesn't exist       |
| `"Invalid Input"` | Validation failed            |

### Handling Errors

```typescript
const createNote = useMutation(api.notes.create);

try {
  await createNote({ title: "", content: "..." });
} catch (error) {
  if (error.message === "Title cannot be empty") {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

---

## Type Safety

### Import Types

```typescript
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

const noteId: Id<"notes"> = "...";
```

### Function Signatures

```typescript
// Query
const notes = useQuery(api.notes.list, { userId: string });
// Type: Note[] | undefined

// Mutation
const create = useMutation(api.notes.create);
// Type: (args: { title: string; content: string }) => Promise<Id<"notes">>

// Action
const summarize = useAction(api.openai.summarizeNote);
// Type: (args: { noteId: Id<"notes"> }) => Promise<{ summary: string }>
```

---

## Real-time Subscriptions

### How Queries Work

Queries automatically subscribe to changes:

```typescript
const notes = useQuery(api.notes.list, { userId });
// Component re-renders when notes change
```

### Reactivity

Changes trigger updates:

1. Mutation modifies data
2. All subscribed queries notified
3. Components re-render with new data
4. Happens across all connected clients

---

## Rate Limits

Convex has built-in rate limiting:

- Queries: No limit (cached)
- Mutations: ~1000/minute per user
- Actions: ~100/minute per user

For production apps, consider:

- Debouncing user input
- Batching operations
- Optimistic updates

---

## Best Practices

### 1. Use Proper Validators

```typescript
// ✅ Good
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => { ... }
});

// ❌ Bad
export const create = mutation({
  handler: async (ctx, args: any) => { ... }
});
```

### 2. Check Authorization

```typescript
// ✅ Good
const note = await ctx.db.get(args.id);
if (note.userId !== identity.subject) {
  throw new Error("Forbidden");
}

// ❌ Bad
const note = await ctx.db.get(args.id);
// No ownership check
```

### 3. Validate Input

```typescript
// ✅ Good
if (args.title.length === 0) {
  throw new Error("Title cannot be empty");
}
if (args.title.length > 200) {
  throw new Error("Title too long");
}

// ❌ Bad
// No validation
```

### 4. Use Indexes

```typescript
// ✅ Good
await ctx.db
  .query("notes")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();

// ❌ Bad (slow without index)
const allNotes = await ctx.db.query("notes").collect();
const userNotes = allNotes.filter((n) => n.userId === userId);
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Good
try {
  const note = await ctx.db.get(args.id);
  if (!note) {
    throw new Error("Note not found");
  }
  return note;
} catch (error) {
  console.error("Error fetching note:", error);
  throw error;
}
```

---

## Testing API Functions

### In Convex Dashboard

1. Go to **Functions** tab
2. Select function
3. Enter arguments (JSON)
4. Click **Run**
5. View results and logs

### In Code

```typescript
// Integration test example (future)
import { expect, test } from "vitest";
import { ConvexTestingHelper } from "convex-testing";

test("create note", async () => {
  const helper = new ConvexTestingHelper();

  const noteId = await helper.mutation(api.notes.create, {
    title: "Test",
    content: "Content",
  });

  expect(noteId).toBeDefined();
});
```

---

## Extending the API

### Adding New Queries

```typescript
// packages/backend/convex/notes.ts
export const search = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) =>
        q.or(
          q.like(q.field("title"), args.searchTerm),
          q.like(q.field("content"), args.searchTerm),
        ),
      )
      .collect();
  },
});
```

### Adding New Mutations

```typescript
export const archive = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (note.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.id, {
      archived: true,
      archivedAt: Date.now(),
    });
  },
});
```

---

## Related Documentation

- [Getting Started](./getting-started.md)
- [Architecture](./architecture.md)
- [Development Guide](./development.md)
- [Convex Documentation](https://docs.convex.dev)
