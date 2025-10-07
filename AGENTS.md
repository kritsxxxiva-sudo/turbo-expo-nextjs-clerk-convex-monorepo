# AI Agents & Assistants Guide

This document describes the AI agents configured for this project and how to use them effectively.

## Table of Contents

- [Overview](#overview)
- [Available Agents](#available-agents)
- [Agent Modes](#agent-modes)
- [Custom Commands](#custom-commands)
- [Best Practices](#best-practices)
- [Integration Points](#integration-points)

## Overview

This monorepo is configured to work with multiple AI agents through:

- **Augment CLI** - Terminal-based AI assistant
- **Cursor IDE** - IDE-integrated AI pair programming
- **Custom Commands** - Specialized agent behaviors in `.augment/commands/`

All agents have access to:

- Full codebase context via semantic search
- MCP servers (filesystem, git, browser automation, etc.)
- Project-specific rules (`.rules`, `.augment_code_snippet`)
- Convex backend schema and functions
- Real-time collaboration capabilities

## Available Agents

### 1. Claude Sonnet 4 (Primary)

**Configuration**: `.augment/claude-4-sonnet-agent-prompts.txt`

**Strengths**:

- Deep code understanding and generation
- Excellent TypeScript/React expertise
- Strong reasoning for architecture decisions
- Good at following project conventions

**Best for**:

- Complex refactoring
- Feature implementation
- Debugging difficult issues
- Architecture planning

**Example usage**:

```bash
# In Augment CLI
augment chat "Implement real-time note sharing using Convex"

# In Cursor
Cmd/Ctrl + K: "Add pagination to the notes list"
```

### 2. GPT-5 (Alternative)

**Configuration**: `.augment/gpt-5-agent-prompts.txt`

**Strengths**:

- Fast response times
- Good general knowledge
- Strong at documentation
- Effective for routine tasks

**Best for**:

- Quick fixes
- Documentation generation
- Code formatting
- Simple features

## Agent Modes

### Analyze Mode

**File**: `.augment/commands/analyze.md`

**Purpose**: Deep code analysis and understanding

**When to use**:

- Understanding complex code flows
- Finding potential bugs
- Performance analysis
- Security review

**Example**:

```bash
augment analyze "Review the authentication flow for security issues"
```

**Output includes**:

- Code flow diagrams
- Potential issues
- Recommendations
- Related files

---

### Plan Mode

**File**: `.augment/commands/plan.md`

**Purpose**: Strategic planning and architecture design

**When to use**:

- Before starting large features
- Refactoring planning
- Architecture decisions
- Migration strategies

**Example**:

```bash
augment plan "Add multi-tenant support to the Convex backend"
```

**Output includes**:

- Step-by-step implementation plan
- Schema changes needed
- Migration strategy
- Testing approach

---

### Specify Mode

**File**: `.augment/commands/specify.md`

**Purpose**: Detailed specification creation

**When to use**:

- Defining new features
- API design
- Component specifications
- Integration planning

**Example**:

```bash
augment specify "Note sharing feature with permissions"
```

**Output includes**:

- Detailed requirements
- API contracts
- UI mockups (described)
- Test scenarios

---

### Implement Mode

**File**: `.augment/commands/implement.md`

**Purpose**: Direct code implementation

**When to use**:

- Actually writing code
- Following an existing plan
- Making specified changes
- Feature development

**Example**:

```bash
augment implement "Based on the plan above, add the sharing feature"
```

**Output includes**:

- Complete code changes
- File updates
- Type definitions
- Basic tests

---

### Clarify Mode

**File**: `.augment/commands/clarify.md`

**Purpose**: Understanding and asking questions

**When to use**:

- Unclear requirements
- Ambiguous specifications
- Learning codebase
- Before making changes

**Example**:

```bash
augment clarify "How does the note synchronization work between web and native?"
```

**Output includes**:

- Clear explanations
- Code examples
- Architecture diagrams
- Clarifying questions

---

### Tasks Mode

**File**: `.augment/commands/tasks.md`

**Purpose**: Task breakdown and project management

**When to use**:

- Breaking down epics
- Sprint planning
- Progress tracking
- Estimating work

**Example**:

```bash
augment tasks "Break down the note collaboration feature into tasks"
```

**Output includes**:

- Task list with estimates
- Dependencies
- Priority ordering
- Acceptance criteria

---

## Custom Commands

### Creating Custom Commands

Add new `.md` files to `.augment/commands/`:

```markdown
# My Custom Command

## Purpose

[What this command does]

## Usage

[When to use it]

## Behavior

[How the agent should behave]

## Example Output

[What users should expect]
```

### Example: Review Command

Create `.augment/commands/review.md`:

```markdown
# Review Command

## Purpose

Perform code review on recent changes

## Usage

Use before committing or creating PRs

## Behavior

- Check code quality
- Verify tests exist
- Check type safety
- Ensure conventions followed
- Suggest improvements

## Example

augment review "Review my changes to the notes API"
```

## Best Practices

### 1. Choose the Right Agent Mode

```markdown
❌ Don't: "augment implement" without planning
✅ Do: "augment plan" → review → "augment implement"

❌ Don't: "augment analyze" for simple questions
✅ Do: "augment clarify" for quick understanding
```

### 2. Provide Context

**Good**:

```bash
augment specify "Add note templates feature.
Users should be able to create, save, and reuse note templates.
Templates should support variables."
```

**Bad**:

```bash
augment specify "add templates"
```

### 3. Iterate with Agents

```bash
# Step 1: Plan
augment plan "Add real-time collaboration"

# Step 2: Clarify uncertainties
augment clarify "How should we handle conflict resolution?"

# Step 3: Specify in detail
augment specify "Real-time collaboration with operational transforms"

# Step 4: Implement
augment implement "Based on the specification above"

# Step 5: Analyze
augment analyze "Check for race conditions in the collaboration code"
```

### 4. Use Multiple Agents

Different agents for different tasks:

- **Heavy analysis**: Claude Sonnet 4
- **Quick docs**: GPT-5
- **Performance testing**: Claude with Chrome DevTools MCP
- **Git operations**: Any agent with Git MCP

## Integration Points

### With Convex

Agents understand Convex patterns:

```typescript
// Agents know to:
// 1. Define in schema.ts
// 2. Create mutations/queries in separate files
// 3. Export through _generated/api
// 4. Use proper validators
```

**Example prompt**:

```bash
augment implement "Add a mutation to bulk delete notes with proper auth"
```

### With Clerk

Agents handle authentication:

```typescript
// Agents understand:
// - Clerk JWT validation in Convex
// - useUser() hook usage
// - Protected routes
// - Social OAuth flows
```

**Example prompt**:

```bash
augment analyze "Review the auth setup for potential issues"
```

### With Turborepo

Agents respect workspace boundaries:

```bash
# Agents will:
# 1. Install deps in correct workspace
# 2. Update proper package.json
# 3. Consider cross-workspace imports
# 4. Maintain type safety across packages
```

**Example prompt**:

```bash
augment implement "Add a shared utility package for date formatting"
```

## Agent Collaboration Patterns

### Sequential Mode

```bash
augment plan → review plan → augment implement → augment analyze
```

### Parallel Mode

```bash
augment specify "web UI" &
augment specify "native UI" &
wait
augment implement "both UIs"
```

### Review Loop

```bash
while not satisfied:
    augment implement "feature"
    augment analyze "implementation"
    if issues:
        augment clarify "how to fix issues"
```

## Constitutional AI Rules

**File**: `.augment/commands/constitution.md`

Agents follow these principles:

1. **Safety**: Never delete data without confirmation
2. **Quality**: Maintain type safety and tests
3. **Convention**: Follow project patterns
4. **Clarity**: Ask when unclear
5. **Efficiency**: Minimize changes needed

## Troubleshooting

### Agent Doesn't Follow Instructions

**Solution**: Be more specific and reference files

```bash
# Instead of:
augment implement "fix the button"

# Try:
augment implement "In apps/web/src/components/notes/NoteItem.tsx,
fix the delete button to show confirmation dialog"
```

### Agent Makes Wrong Assumptions

**Solution**: Use clarify mode first

```bash
augment clarify "What's the current state of note permissions?"
# Then proceed with implementation
```

### Agent Changes Wrong Files

**Solution**: Specify exact paths

```bash
augment implement "Update ONLY apps/web/src/app/notes/page.tsx
to add the search feature"
```

### Agent Breaks Existing Code

**Solution**: Request backward compatibility

```bash
augment implement "Add feature while maintaining backward compatibility
with existing note format"
```

## Advanced Usage

### Chain Multiple Agents

```bash
# Use Claude for architecture
augment --agent claude plan "Add caching layer"

# Use GPT for documentation
augment --agent gpt5 "Document the caching implementation"

# Use Claude for implementation
augment --agent claude implement "Add Redis caching to Convex queries"
```

### Context-Aware Prompts

```bash
# Agent will use file context
augment implement "Add error handling"
# While having apps/web/src/components/notes/NotesList.tsx open

# Agent understands "this file"
augment analyze "this file for performance issues"
```

### Multi-Step Workflows

```bash
augment tasks "Implement note encryption" | \
augment plan --from-tasks | \
augment implement --from-plan
```

## Monitoring Agent Performance

Track agent effectiveness:

- Code quality maintained
- Tests pass after changes
- Type errors don't increase
- Follows project conventions
- Completes tasks in reasonable steps

## Configuration Files

```text
.augment/
├── claude-4-sonnet-agent-prompts.txt    # Claude configuration
├── claude-4-sonnet-tools.json           # Claude tools
├── gpt-5-agent-prompts.txt              # GPT-5 configuration
├── gpt-5-tools.json                     # GPT-5 tools
├── mcp-config.json                      # MCP servers
├── rules/
│   └── specify-rules.md                 # Specify mode rules
└── commands/
    ├── analyze.md                       # Analyze mode
    ├── plan.md                          # Plan mode
    ├── specify.md                       # Specify mode
    ├── implement.md                     # Implement mode
    ├── clarify.md                       # Clarify mode
    ├── tasks.md                         # Tasks mode
    └── constitution.md                  # AI principles
```

## Resources

- [Augment CLI Documentation](https://docs.augmentcode.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Claude API Docs](https://docs.anthropic.com/)
- Project-specific: `CLAUDE.md`, `.rules`, `.augment_code_snippet`

## Tips

1. **Start with planning** - Save time by getting the approach right
2. **Use specify for APIs** - Clear contracts prevent rework
3. **Clarify when stuck** - Don't guess what the agent meant
4. **Analyze before refactoring** - Understand implications
5. **Review agent changes** - Always verify before committing

Remember: Agents are tools to augment your development, not replace your judgment!
