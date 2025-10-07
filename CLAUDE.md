# Claude AI Integration Guide

This guide explains how to effectively use Claude AI with this Turborepo monorepo project.

## Table of Contents

- [Overview](#overview)
- [Project Context](#project-context)
- [Best Practices](#best-practices)
- [Common Tasks](#common-tasks)
- [Prompting Strategies](#prompting-strategies)
- [Troubleshooting](#troubleshooting)

## Overview

This project is configured to work with Claude Sonnet 4 through Augment CLI and Cursor IDE. Claude has access to:

- Full codebase through semantic search
- MCP servers (filesystem, git, Chrome DevTools, etc.)
- Project-specific rules and conventions
- Real-time code editing capabilities

## Project Context

### Stack

- **Monorepo**: Turborepo with Yarn workspaces
- **Web**: Next.js 15 (App Router) + Tailwind CSS v4 + Clerk
- **Mobile**: Expo + React Native (New Architecture)
- **Backend**: Convex (serverless, real-time database)
- **Language**: TypeScript (strict mode)
- **Auth**: Clerk with Google/Apple OAuth

### Project Structure

```text
apps/
  web/          # Next.js application
  native/       # React Native (Expo) app
packages/
  backend/      # Convex backend (shared by both apps)
```

## Best Practices

### 1. Providing Context

**Good prompts include:**

```markdown
"Update the note creation mutation in Convex to add a tags field"
"Add error handling to the NotesDashboardScreen in the native app"
"Implement dark mode toggle in the web app's user navigation"
```

**Avoid vague prompts:**

```markdown
❌ "Make it better"
❌ "Fix the bug"
❌ "Update the code"
```

### 2. Specifying Scope

Be explicit about which part of the monorepo:

```markdown
✅ "In apps/web, add a loading skeleton to the notes list"
✅ "Update the native app's login screen to match the web design"
✅ "Add a new Convex query in packages/backend for searching notes"
```

### 3. Iterative Development

Break large tasks into steps:

```markdown
1. First, create the Convex schema for tags
2. Then add the mutation to create tags
3. Finally, update the UI components to use tags
```

### 4. Testing & Validation

Always request testing:

```markdown
"Add the feature and suggest how to test it"
"Create the component with example usage"
"Update the function and show how to verify it works"
```

## Common Tasks

### Adding Features

#### Backend (Convex)

```markdown
"Add a Convex mutation to archive notes with soft delete"
```

Claude will:

1. Update schema if needed
2. Create the mutation with proper validation
3. Ensure type safety
4. Consider auth/permissions

#### Frontend (Web)

```markdown
"Add a share button to NoteItem that copies the note URL"
```

Claude will:

1. Update the component
2. Add proper TypeScript types
3. Follow Tailwind CSS patterns
4. Handle error states

#### Frontend (Native)

```markdown
"Add pull-to-refresh on the NotesDashboardScreen"
```

Claude will:

1. Use React Native patterns
2. Integrate with Convex subscriptions
3. Match existing UI patterns
4. Handle loading states

### Refactoring

```markdown
"Extract the note card UI into a shared component used by both list and detail views"
```

Claude will:

1. Identify common code
2. Create reusable component
3. Update both usage sites
4. Maintain type safety

### Debugging

```markdown
"The notes aren't updating in real-time on the web app. Help me debug."
```

Claude will:

1. Check Convex subscription setup
2. Verify ConvexClientProvider
3. Review query usage
4. Test reactivity

### Adding Dependencies

```markdown
"Add date-fns for better date formatting in the web app"
```

Claude will:

1. Use `yarn add` in correct workspace
2. Show usage examples
3. Update TypeScript imports
4. Respect existing patterns

## Prompting Strategies

### For New Features

```markdown
I need to add [feature] to [web/native/backend].

Requirements:

- [Specific requirement 1]
- [Specific requirement 2]

The feature should work with [existing feature/component].
```

### For Bug Fixes

```markdown
I'm seeing [specific error/behavior] when [specific action].

Expected: [what should happen]
Actual: [what's happening]

Relevant code: [file path or component name]
```

### For Optimization

```markdown
The [component/page/query] is slow when [specific scenario].

Current implementation: [brief description]
Expected performance: [target]

Please suggest optimizations.
```

### For Architecture Decisions

```markdown
I need to decide between [Option A] and [Option B] for [use case].

Considerations:

- [Factor 1]
- [Factor 2]

What do you recommend for this monorepo setup?
```

## Troubleshooting

### Claude Doesn't Understand Project Structure

**Solution**: Reference specific files/paths

```markdown
"Update apps/web/src/components/notes/NoteItem.tsx"
```

### Changes Affect Both Apps

**Solution**: Be explicit about shared backend

```markdown
"This Convex mutation will be used by both web and native apps,
ensure the API is compatible with both"
```

### Type Errors After Changes

**Solution**: Request type checking

```markdown
"Update the function and fix any TypeScript errors"
```

### Breaking Changes

**Solution**: Request backward compatibility

```markdown
"Add this field but keep backward compatibility for existing notes"
```

### Missing Context

If Claude seems to miss important context:

```markdown
"First, review the existing note schema in packages/backend/convex/schema.ts,
then add the new field"
```

## Advanced Usage

### Multi-Step Workflows

```markdown
Let's implement user note sharing:

1. First, plan the database schema changes needed
2. Then, create the Convex mutations for sharing
3. Next, add the UI in the web app
4. Finally, add the UI in the native app
5. Suggest how to test each step
```

### Code Review

```markdown
"Review the NotesContext implementation for potential improvements
regarding performance and type safety"
```

### Migration Assistance

```markdown
"Help me migrate from the old note format to include a tags array.
Provide a Convex migration script and update the schema."
```

## Working with MCP Servers

### Performance Testing

```markdown
"Use Chrome DevTools to analyze the performance of the web app's
dashboard and suggest optimizations"
```

### Git Operations

```markdown
"Show me the recent commits that modified the authentication flow"
```

### API Testing

```markdown
"Use the fetch server to test our Convex HTTP endpoint"
```

## Tips for Maximum Efficiency

1. **Reference files explicitly** when asking for changes
2. **Break large tasks** into smaller, verifiable steps
3. **Ask for explanations** when learning new patterns
4. **Request tests** for critical functionality
5. **Specify both apps** when backend changes affect them
6. **Use code snippets** from errors to get better help
7. **Iterate quickly** - small changes are easier to verify
8. **Leverage real-time** - test changes immediately with Convex dev server

## Example Conversation Flow

```markdown
User: "I want to add a feature to star/favorite notes"

Claude: [Creates plan, asks clarifying questions about UX]

User: "Yes, proceed with Option B"

Claude: [Updates Convex schema and mutations]

User: "Good, now add the UI to web app"

Claude: [Adds star button to NoteItem]

User: "Now do the same for native"

Claude: [Adds TouchableOpacity with star icon]

User: "Test it by creating a query to get starred notes"

Claude: [Creates query and shows usage]
```

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Clerk Docs](https://clerk.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Need Help?

If Claude isn't giving you the results you want:

1. Be more specific about the file/component
2. Provide error messages or screenshots
3. Break the task into smaller steps
4. Reference existing code patterns to follow
5. Ask for clarification on the approach first

Remember: Claude works best with clear, specific instructions and context!
