# Contributing Guide

Thank you for considering contributing to this project! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/turbo-expo-nextjs-clerk-convex-monorepo.git
cd turbo-expo-nextjs-clerk-convex-monorepo
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/turbo-expo-nextjs-clerk-convex-monorepo.git
```

### 4. Install Dependencies

```bash
yarn install
```

### 5. Set Up Development Environment

Follow the [Getting Started Guide](./getting-started.md) to configure Convex, Clerk, and environment variables.

## Development Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow existing patterns
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Start dev environment
npm run dev

# Test in web app
cd apps/web
yarn dev

# Test in native app
cd apps/native
yarn start

# Test backend functions in Convex dashboard
```

**Testing checklist:**

- [ ] Works in web app
- [ ] Works in native app (iOS and Android)
- [ ] Real-time updates work correctly
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Follows existing patterns

### 4. Commit Your Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat(web): add note export feature"
```

**Format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Updating build tasks, package manager configs, etc.

**Scopes:**

- `web` - Web app changes
- `native` - Native app changes
- `backend` - Convex backend changes
- `deps` - Dependency updates
- `ci` - CI/CD changes

**Examples:**

```bash
git commit -m "feat(backend): add note tags functionality"
git commit -m "fix(web): resolve auth redirect loop"
git commit -m "docs: update API reference"
git commit -m "refactor(native): extract note card component"
```

### 5. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

If conflicts occur:

```bash
# Resolve conflicts in your editor
git add .
git rebase --continue
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

## Submitting Changes

### 1. Create a Pull Request

Go to your fork on GitHub and click "New Pull Request".

### 2. Fill Out the PR Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

Describe how you tested your changes:

- [ ] Tested on web
- [ ] Tested on native (iOS)
- [ ] Tested on native (Android)
- [ ] Tested real-time updates
- [ ] No TypeScript errors
- [ ] No console errors

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Additional Notes

Any additional information that would be helpful for reviewers.
```

### 3. Wait for Review

- Maintainers will review your PR
- Address any feedback
- Make requested changes
- Push updates to your branch

### 4. Merge

Once approved, your PR will be merged!

## Style Guidelines

### TypeScript

```typescript
// ✅ Good
interface NoteProps {
  noteId: string;
  onUpdate?: () => void;
}

export function NoteCard({ noteId, onUpdate }: NoteProps) {
  const note = useQuery(api.notes.get, { id: noteId });

  if (!note) {
    return <LoadingSpinner />;
  }

  return (
    <div className="note-card">
      <h3>{note.title}</h3>
      <p>{note.content}</p>
    </div>
  );
}
```

**Key points:**

- Use TypeScript strict mode
- Define interfaces for props
- Use functional components
- Prefer `const` over `let`
- Use meaningful variable names

### File Structure

```
apps/web/src/
├── app/              # Next.js pages
├── components/       # React components
│   ├── common/      # Shared components
│   └── feature/     # Feature-specific components
└── lib/             # Utilities and helpers
```

### Naming Conventions

- **Components**: PascalCase (`NoteCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useNotes.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_NOTES = 100`)

### Code Formatting

We use Prettier for code formatting. Run:

```bash
yarn format
```

Or configure your editor to format on save.

### Comments

```typescript
// ✅ Good - Explains WHY
// We batch deletes to avoid rate limiting
await Promise.all(noteIds.map(id => deleteNote(id)));

// ❌ Bad - States the obvious
// Loop through notes
notes.forEach(note => { ... });
```

## Documentation

### When to Update Docs

Update documentation when you:

- Add new features
- Change APIs
- Modify workflows
- Fix significant bugs
- Add configuration options

### Documentation Style

**Clear and Concise:**

```markdown
✅ "Use `yarn add` to install dependencies"
❌ "You might want to consider using yarn to add packages"
```

**Use Examples:**

```markdown
## Installation

Install the package:

\`\`\`bash
yarn add package-name
\`\`\`

Then import it:

\`\`\`typescript
import { MyComponent } from 'package-name';
\`\`\`
```

**Structure:**

- Use headings (`##`, `###`)
- Add table of contents for long docs
- Include code examples
- Add "See also" links

### API Documentation

When adding/modifying backend functions:

```typescript
/**
 * Creates a new note for the authenticated user.
 *
 * @param title - The note title (1-200 characters)
 * @param content - The note content
 * @returns The ID of the created note
 * @throws {Error} "Unauthorized" if user not authenticated
 * @throws {Error} "Title cannot be empty" if title is empty
 */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

Update `docs/api-reference.md` with the new function.

## Issue Reporting

### Before Creating an Issue

1. Search existing issues
2. Check documentation
3. Try to reproduce the bug

### Bug Report Template

```markdown
## Bug Description

Clear and concise description of the bug.

## To Reproduce

Steps to reproduce the behavior:

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What you expected to happen.

## Screenshots

If applicable, add screenshots.

## Environment

- Platform: [Web/iOS/Android]
- Browser/Device: [e.g., Chrome, iPhone 12]
- Version: [e.g., 1.0.0]

## Additional Context

Any other context about the problem.
```

### Feature Request Template

```markdown
## Feature Description

Clear and concise description of the feature.

## Use Case

Why is this feature needed? What problem does it solve?

## Proposed Solution

How should this feature work?

## Alternatives Considered

Other solutions you've thought about.

## Additional Context

Any other context, screenshots, or examples.
```

## Review Process

### For Contributors

1. Submit PR with clear description
2. Address reviewer feedback promptly
3. Keep changes focused (one feature per PR)
4. Ensure all tests pass
5. Update documentation

### For Reviewers

1. Be constructive and respectful
2. Explain the reasoning behind feedback
3. Approve when satisfied
4. Suggest improvements, don't demand perfection
5. Recognize good work

## Questions?

- Check [Documentation](./README.md)
- Ask in GitHub Discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
