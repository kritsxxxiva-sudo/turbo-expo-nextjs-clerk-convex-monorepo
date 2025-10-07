<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- New constitution created for Turbo Expo Next.js Clerk Convex Monorepo
- Added sections: Core Principles (5), Monorepo Standards, Development Workflow, Governance
- Templates requiring updates: ✅ All templates reviewed and aligned
- Follow-up TODOs: None - all placeholders filled
-->

# Turbo Expo Next.js Clerk Convex Monorepo Constitution

## Core Principles

### I. Monorepo-First Architecture

Every feature MUST be designed to work across multiple platforms (web, native) from a single codebase. Shared logic MUST be extracted to packages that can be consumed by both apps/web and apps/native. Platform-specific implementations MUST be clearly isolated and documented. No feature should require duplicating business logic across platforms.

**Rationale**: Maintains consistency, reduces maintenance burden, and ensures feature parity across web and mobile platforms while leveraging the monorepo structure effectively.

### II. Type Safety End-to-End (NON-NEGOTIABLE)

All data flows from Convex backend to frontend clients MUST maintain strict TypeScript typing. Schema definitions in packages/backend MUST generate types consumed by both web and native apps. No `any` types allowed in production code. All API contracts MUST be validated at runtime and compile time.

**Rationale**: Prevents runtime errors, improves developer experience, and ensures data consistency across the full stack in this TypeScript-first architecture.

### III. Test-First Development (NON-NEGOTIABLE)

TDD mandatory: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Contract tests MUST exist for all Convex functions. Integration tests MUST verify cross-platform functionality. All tests MUST pass before merging.

**Rationale**: Ensures reliability in a complex monorepo with multiple deployment targets and prevents regressions across platforms.

### IV. Real-time by Default

All data interactions MUST leverage Convex's reactive capabilities. Use `useQuery` for data fetching, mutations for updates. Avoid imperative data fetching patterns. Real-time updates MUST work consistently across web and native platforms. Offline-first patterns encouraged where applicable.

**Rationale**: Maximizes the value of Convex's reactive database and ensures consistent user experience across platforms with automatic synchronization.

### V. Authentication & Security First

All protected routes and functions MUST use Clerk authentication. User context MUST be validated at both client and server levels. No sensitive operations without proper authorization. Security headers and CORS MUST be properly configured. Environment variables MUST be properly scoped and secured.

**Rationale**: Protects user data and ensures compliance with security best practices in a multi-platform authentication system.

## Monorepo Standards

**Workspace Organization**: Apps in `apps/`, shared packages in `packages/`. Each workspace MUST have clear ownership and purpose. Dependencies MUST be managed at the workspace level. Shared configurations MUST be in the root.

**Turbo Pipeline**: All build, dev, and test commands MUST be orchestrated through Turbo. Cache optimization MUST be configured for build artifacts. Parallel execution MUST be leveraged for independent workspaces.

**Package Management**: Use Yarn workspaces. Dependencies MUST be installed at the appropriate workspace level. Shared dependencies MUST be hoisted to root when possible. Lock file MUST be committed and consistent.

## Development Workflow

**Branch Strategy**: Feature branches from main. Branch naming: `feature/###-description`. All changes MUST go through pull requests. No direct commits to main.

**Code Review**: All PRs MUST pass automated checks (lint, type-check, tests). At least one approval required. Constitution compliance MUST be verified. Breaking changes MUST be documented and approved.

**Testing Gates**: Unit tests for business logic. Integration tests for cross-platform features. Contract tests for all Convex functions. E2E tests for critical user flows. All tests MUST pass in CI.

**Deployment**: Web app deploys via Vercel with Convex integration. Native app follows Expo deployment pipeline. Environment variables MUST be properly configured for each environment.

## Governance

This constitution supersedes all other development practices and guidelines. All pull requests and code reviews MUST verify compliance with these principles. Any deviation MUST be explicitly justified and documented.

**Amendment Process**: Constitution changes require documentation of rationale, impact assessment, and migration plan. Version bumps follow semantic versioning. All team members MUST be notified of changes.

**Compliance Review**: Weekly constitution compliance review during team meetings. Violations MUST be addressed immediately. Complexity additions MUST be justified against simplicity principles.

**Version**: 1.0.0 | **Ratified**: 2025-01-07 | **Last Amended**: 2025-01-07
