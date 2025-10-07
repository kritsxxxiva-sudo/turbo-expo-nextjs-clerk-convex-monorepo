# Specify Mode Rules

Rules and guidelines for the AI agent when operating in **Specify Mode**.

## Purpose

Specify Mode is used to create detailed, unambiguous specifications for features, APIs, components, and integrations. The goal is to produce actionable specifications that can be directly implemented.

## Agent Behavior

When in Specify Mode, the agent MUST:

1. **Ask Clarifying Questions First**

   - Identify ambiguities in requirements
   - Understand edge cases
   - Clarify user expectations
   - Don't make assumptions - ASK

2. **Create Comprehensive Specifications**

   - Define inputs and outputs clearly
   - Specify error handling
   - Document edge cases
   - Include validation rules
   - Define success criteria

3. **Consider All Affected Areas**

   - Backend (Convex schema, mutations, queries)
   - Web app (Next.js components, pages)
   - Native app (React Native screens, components)
   - Shared types and utilities
   - Database migrations if needed

4. **Follow Project Patterns**

   - Use existing conventions
   - Match current architecture
   - Respect monorepo structure
   - Maintain type safety

5. **Think About Both Apps**
   - Web and native apps share the backend
   - API must work for both platforms
   - Consider UX differences between web and mobile
   - Plan for platform-specific implementations when needed

## Specification Template

Use this structure for all specifications:

````markdown
# Feature: [Feature Name]

## Overview

[Brief description of what this feature does]

## User Stories

- As a [role], I want to [action] so that [benefit]
- As a [role], I want to [action] so that [benefit]

## Requirements

### Functional Requirements

1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

### Non-Functional Requirements

- Performance: [specific metrics]
- Security: [security considerations]
- Scalability: [scalability needs]
- Accessibility: [a11y requirements]

## Architecture

### Database Schema

```typescript
// Convex schema changes
```
````

### API Design

#### Queries

- `queryName(args) -> ReturnType`
  - Purpose: [what it does]
  - Args: [argument details]
  - Returns: [return value details]
  - Auth: [authentication requirements]

#### Mutations

- `mutationName(args) -> ReturnType`
  - Purpose: [what it does]
  - Args: [argument details]
  - Returns: [return value details]
  - Auth: [authentication requirements]
  - Validation: [validation rules]

### Frontend Components

#### Web App

- Component: [ComponentName]
  - Location: `apps/web/src/components/...`
  - Props: [prop interface]
  - State: [state management approach]
  - Hooks: [Convex hooks used]

#### Native App

- Component: [ComponentName]
  - Location: `apps/native/src/screens/...`
  - Props: [prop interface]
  - State: [state management approach]
  - Hooks: [Convex hooks used]

## Data Flow

1. User action → Component event
2. Component → Convex mutation/query
3. Convex → Database operation
4. Database → Real-time update
5. Update → Component re-render

## Edge Cases

1. [Edge case 1] - [How to handle]
2. [Edge case 2] - [How to handle]
3. [Edge case 3] - [How to handle]

## Error Handling

- [Error type 1]: [User message and recovery]
- [Error type 2]: [User message and recovery]
- [Error type 3]: [User message and recovery]

## Validation Rules

- [Field 1]: [Validation logic]
- [Field 2]: [Validation logic]
- [Field 3]: [Validation logic]

## Security Considerations

- [Security aspect 1]
- [Security aspect 2]
- [Authentication/Authorization rules]

## Migration Plan

If changing existing functionality:

1. [Migration step 1]
2. [Migration step 2]
3. [Backward compatibility strategy]

## Testing Strategy

- Unit tests: [What to test]
- Integration tests: [What to test]
- Manual testing: [Test scenarios]

## Implementation Steps

1. [High-level step 1]
2. [High-level step 2]
3. [High-level step 3]
4. [High-level step 4]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] All tests pass
- [ ] Works in both web and native apps
- [ ] Performance meets requirements

## Future Considerations

- [Potential enhancement 1]
- [Potential enhancement 2]
- [Scalability considerations]

````

## Project-Specific Rules

### For Convex Backend

```typescript
// Always specify validators
import { v } from "convex/values";

export const myMutation = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Specify auth checks
    // Specify validation logic
    // Specify return value
  },
});
````

**Requirements**:

- Use `v` validators for all args
- Include auth checks (`ctx.auth.getUserIdentity()`)
- Handle errors gracefully
- Return typed values
- Consider real-time subscriptions

### For Next.js Components

```typescript
// Specify component interface
interface Props {
  noteId: string;
  onUpdate?: () => void;
}

// Specify client/server component
("use client"); // or nothing for server component

// Specify Convex hooks
const note = useQuery(api.notes.get, { id: noteId });
```

**Requirements**:

- Specify if client or server component
- Define prop interfaces
- Use Convex React hooks correctly
- Handle loading and error states
- Follow Tailwind CSS patterns

### For React Native Components

```typescript
// Specify component interface
interface Props {
  noteId: string;
  onPress?: () => void;
}

// Specify React Native imports
import { View, Text, TouchableOpacity } from "react-native";
import { useQuery } from "convex/react";
```

**Requirements**:

- Use React Native components (not HTML)
- Handle touch interactions properly
- Consider mobile UX patterns
- Handle keyboard behavior
- Support both iOS and Android

### For Shared Types

```typescript
// In packages/backend/convex/schema.ts or types file
export interface NoteData {
  title: string;
  content: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}
```

**Requirements**:

- Define in backend package
- Import in both apps
- Use Convex's type generation
- Maintain consistency

## Common Scenarios

### Scenario: Adding a New Feature

1. **Clarify Requirements**

   ```
   Questions to ask:
   - Who will use this feature?
   - What's the expected behavior?
   - Are there any constraints?
   - How should errors be handled?
   - What's the success criteria?
   ```

2. **Specify Backend**

   ```
   - Schema changes (if any)
   - New queries/mutations
   - Validation rules
   - Auth requirements
   - Real-time behavior
   ```

3. **Specify Frontend (Both Apps)**

   ```
   - Component structure
   - UI/UX flow
   - State management
   - Loading states
   - Error handling
   - Platform-specific differences
   ```

4. **Specify Testing**
   ```
   - Test scenarios
   - Edge cases to cover
   - Manual testing steps
   ```

### Scenario: Modifying Existing Feature

1. **Analyze Current Implementation**

   ```
   - Review existing code
   - Understand current behavior
   - Identify affected components
   ```

2. **Specify Changes**

   ```
   - What changes (be precise)
   - What stays the same
   - Backward compatibility plan
   - Migration if needed
   ```

3. **Specify Impact**
   ```
   - Which files affected
   - Which apps affected
   - Breaking changes (if any)
   - Deprecation strategy
   ```

### Scenario: API Design

1. **Define Purpose**

   ```
   - What problem does this solve?
   - Who calls this API?
   - What's the expected usage pattern?
   ```

2. **Specify Contract**

   ```typescript
   // Query example
   export const searchNotes = query({
     args: {
       searchTerm: v.string(),
       limit: v.optional(v.number()),
       userId: v.string(),
     },
     handler: async (ctx, args) => {
       // Returns: Note[]
       // Auth: Must be authenticated
       // Validates: searchTerm is not empty
       // Errors: "UNAUTHORIZED" | "INVALID_SEARCH"
     },
   });
   ```

3. **Specify Error Cases**
   ```
   - Missing auth → "UNAUTHORIZED"
   - Invalid input → "INVALID_INPUT"
   - Not found → "NOT_FOUND"
   - Server error → "INTERNAL_ERROR"
   ```

## Quality Checklist

Before completing a specification, verify:

- [ ] All ambiguities resolved with user
- [ ] Backend API fully specified (args, return, errors)
- [ ] Frontend UX described for both web and native
- [ ] Edge cases identified and handled
- [ ] Error handling strategy defined
- [ ] Validation rules specified
- [ ] Auth/permissions clarified
- [ ] Performance considerations noted
- [ ] Testing approach outlined
- [ ] Success criteria clearly defined
- [ ] Backward compatibility addressed (if applicable)
- [ ] Both TypeScript types defined or referenced

## Anti-Patterns (AVOID)

❌ **Vague Requirements**

```
"Add a way to share notes"
```

✅ **Clear Requirements**

```
"Add note sharing with:
- Share via unique URL
- Optional password protection
- View-only or edit permissions
- Expire after 30 days or custom date"
```

---

❌ **Missing Error Handling**

```
"The mutation creates a note"
```

✅ **Complete Error Handling**

```
"The mutation creates a note and:
- Returns ConvexError on auth failure
- Validates title is 1-200 chars
- Returns NoteId on success
- Handles rate limiting"
```

---

❌ **Ignoring One Platform**

```
"Add a modal dialog for note details"
```

✅ **Both Platforms**

```
"Add note details:
- Web: Modal dialog with backdrop
- Native: Bottom sheet with gesture handling"
```

---

❌ **No Types**

```
"Function takes some params and returns data"
```

✅ **Typed Specification**

```typescript
interface CreateNoteArgs {
  title: string;
  content: string;
  tags?: string[];
}

type CreateNoteResult =
  | {
      noteId: Id<"notes">;
      createdAt: number;
    }
  | ConvexError<"UNAUTHORIZED">;
```

## Examples

### Example 1: Note Tags Feature

````markdown
# Feature: Note Tags

## Overview

Allow users to add tags to notes for better organization and filtering.

## User Stories

- As a user, I want to add tags to my notes so that I can organize them by topic
- As a user, I want to filter notes by tag so that I can find related notes quickly
- As a user, I want to see all my tags so that I can manage them

## Database Schema

```typescript
// In packages/backend/convex/schema.ts
notes: defineTable({
  // ... existing fields
  tags: v.array(v.string()), // NEW: array of tag names
}),

tags: defineTable({ // NEW: tag definitions
  name: v.string(),
  userId: v.string(),
  color: v.optional(v.string()), // hex color
  createdAt: v.number(),
}).index("by_user", ["userId"]),
```
````

## API Design

### Mutations

```typescript
// addTagToNote(noteId, tagName) -> void
// removeTagFromNote(noteId, tagName) -> void
// createTag(name, color?) -> TagId
// deleteTag(tagId) -> void
```

### Queries

```typescript
// getNotesByTag(tagName) -> Note[]
// getUserTags() -> Tag[]
// getNoteTags(noteId) -> Tag[]
```

## Edge Cases

1. Tag name with special characters → Sanitize and validate
2. Duplicate tags on same note → Prevent duplicates
3. Deleting a tag → Remove from all notes
4. Empty tag name → Reject with error

## Success Criteria

- [ ] Can add/remove tags from notes
- [ ] Can filter notes by tag
- [ ] Tags persist across sessions
- [ ] Works in both web and native apps
- [ ] Real-time updates when tags change

````

### Example 2: Note Export Feature

```markdown
# Feature: Export Notes

## Overview
Allow users to export their notes in various formats (PDF, Markdown, JSON).

## Requirements

### Functional
1. Support export formats: PDF, Markdown, JSON
2. Export single note or multiple notes
3. Include metadata (creation date, tags)
4. Preserve formatting

### Non-Functional
- Performance: Export completes in < 5 seconds for 100 notes
- File size: Reasonable compression for PDF
- Quality: PDF maintains note formatting

## API Design

### Actions (for external calls)
```typescript
export const exportNote = action({
  args: {
    noteId: v.id("notes"),
    format: v.union(
      v.literal("pdf"),
      v.literal("markdown"),
      v.literal("json")
    ),
  },
  handler: async (ctx, args) => {
    // Returns: { fileUrl: string, fileSize: number }
    // Uses: Convex file storage
    // Errors: "UNAUTHORIZED" | "NOT_FOUND" | "EXPORT_FAILED"
  },
});
````

## Implementation Steps

1. Add export action to Convex
2. Integrate PDF generation library (pdf-lib)
3. Add export button to web UI
4. Add export button to native UI
5. Handle file download/share per platform

## Platform Differences

- **Web**: Download file directly
- **Native**: Use Expo sharing API

## Success Criteria

- [ ] Export works in all formats
- [ ] File can be opened in appropriate app
- [ ] Formatting preserved
- [ ] Works offline (generates then uploads)

```

## Remember

The goal of Specify Mode is to create a clear, complete specification that:
1. **Eliminates ambiguity** - Anyone can implement it
2. **Covers all cases** - No surprises during implementation
3. **Respects architecture** - Fits the existing system
4. **Enables testing** - Clear success criteria
5. **Works for both apps** - Consider web and native

When in doubt, **ask questions** rather than making assumptions!

```
