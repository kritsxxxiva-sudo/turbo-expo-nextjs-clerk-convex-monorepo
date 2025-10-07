# Documentation

Welcome to the documentation for this Turborepo monorepo project.

## Quick Links

- [Getting Started](./getting-started.md) - Setup and installation guide
- [Architecture](./architecture.md) - System architecture and design decisions
- [Development Guide](./development.md) - Development workflow and best practices
- [Deployment](./deployment.md) - Deployment instructions
- [API Reference](./api-reference.md) - Backend API documentation
- [Contributing](./contributing.md) - How to contribute to the project

## Project Overview

This is a full-stack monorepo featuring:

- **Web App**: Next.js 15 with Tailwind CSS v4
- **Mobile App**: React Native with Expo
- **Backend**: Convex (serverless, real-time database)
- **Auth**: Clerk (web and mobile)
- **AI**: OpenAI integration for text summarization

## Documentation Structure

```
docs/
├── README.md              # This file
├── getting-started.md     # Setup guide
├── architecture.md        # Architecture overview
├── development.md         # Development workflow
├── deployment.md          # Deployment guide
├── api-reference.md       # API documentation
├── contributing.md        # Contribution guidelines
├── guides/                # How-to guides
│   ├── adding-features.md
│   ├── convex-patterns.md
│   ├── testing.md
│   └── troubleshooting.md
└── examples/              # Code examples
    ├── queries.md
    ├── mutations.md
    ├── components.md
    └── hooks.md
```

## For AI Assistants

If you're an AI assistant working with this codebase, please also review:

- [CLAUDE.md](../CLAUDE.md) - Guide for Claude AI
- [AGENTS.md](../AGENTS.md) - AI agents and modes
- [.rules](../.rules) - Project-specific rules
- [.augment_code_snippet](../.augment_code_snippet) - Code display format

## Additional Resources

- [Main README](../README.md) - Project overview
- [Convex Backend README](../packages/backend/convex/README.md) - Backend specifics
- [Web App README](../apps/web/README.md) - Web app specifics

## Getting Help

1. Check relevant documentation section
2. Search existing issues on GitHub
3. Review code examples
4. Ask in project discussions
5. Use AI assistants (Claude, GPT) with project context

## Contributing to Docs

Found an error or want to improve documentation?

1. Edit the relevant `.md` file
2. Follow the [documentation style guide](./contributing.md#documentation-style)
3. Submit a pull request

Keep documentation:

- **Clear** - Easy to understand
- **Concise** - No unnecessary details
- **Current** - Updated with code changes
- **Complete** - Cover all important topics
