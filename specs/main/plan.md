# Implementation Plan: Comprehensive External Service Integration

**Branch**: `main` | **Date**: 2025-10-06 | **Spec**: [D:\turborepo\turbo-expo-nextjs-clerk-convex-monorepo\specs\main\spec.md](D:\turborepo\turbo-expo-nextjs-clerk-convex-monorepo\specs\main\spec.md)
**Input**: Feature specification from `/specs/main/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Implement comprehensive integration with external services including Clerk authentication, Stripe payments, Ayrshare social media management, enhanced database schema, strict TypeScript configuration, and centralized API client utilities. This provides enterprise-grade capabilities across the entire fullstack monorepo with real-time synchronization, type safety, and cross-platform consistency.

## Technical Context

**Language/Version**: TypeScript with strict mode, Node.js 18+, React 18+
**Primary Dependencies**: Next.js 15, Expo SDK 51+, Convex, Clerk, Stripe, Ayrshare
**Storage**: Convex (serverless real-time database), Stripe (payment data), external service APIs
**Testing**: Jest, React Testing Library, Expo Testing Library, Convex test utilities
**Target Platform**: Web (modern browsers), iOS 15+, Android API 24+
**Project Type**: web/mobile - fullstack monorepo with shared backend
**Performance Goals**: <200ms API responses (95th percentile), 60fps mobile, Core Web Vitals compliance
**Constraints**: Real-time data sync, cross-platform consistency, SOC 2 compliance, PCI DSS compliance
**Scale/Scope**: 100k+ users, 13+ social platforms, multi-currency payments, enterprise features

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**I. Monorepo-First Architecture**: ✓ Feature respects workspace boundaries with packages for shared API clients, types in packages/, backend in packages/backend, and clear dependency declarations
**II. Type Safety End-to-End**: ✓ All external service integrations use strict TypeScript with generated types from Convex schema and comprehensive type definitions for Clerk, Stripe, Ayrshare APIs
**III. Test-First Development**: ✓ Tests planned for all API integrations, webhook processing, authentication flows, payment processing, and cross-platform compatibility
**IV. Real-time by Default**: ✓ Uses Convex reactive queries for user data, payment status, social media analytics, and real-time webhook processing with automatic UI updates
**V. Authentication & Security First**: ✓ Clerk JWT validation, encrypted token storage, PCI DSS compliant payment handling, secure webhook signature verification
**Technology Constraints**: ✓ Uses required stack (TypeScript strict mode, Next.js 15, Expo with New Architecture, Convex, Clerk) plus approved external services
**Performance Standards**: ✓ API client utilities include caching and retry logic to meet <200ms response times, optimized database queries, and 60fps mobile performance
**Security Requirements**: ✓ Clerk JWT validation, encrypted token storage, PCI DSS compliant payment handling, secure webhook signature verification

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
apps/
├── web/                     # Next.js 15 web application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        # Clerk authentication components
│   │   │   ├── payments/    # Stripe payment components
│   │   │   └── social/      # Ayrshare social media components
│   │   ├── app/             # Next.js App Router pages
│   │   ├── lib/             # Web-specific utilities
│   │   └── types/           # Web-specific types
│   └── tests/
└── native/                  # Expo React Native application
    ├── src/
    │   ├── components/
    │   │   ├── auth/        # Clerk authentication components
    │   │   ├── payments/    # Stripe payment components
    │   │   └── social/      # Ayrshare social media components
    │   ├── screens/         # React Native screens
    │   ├── lib/             # Native-specific utilities
    │   └── types/           # Native-specific types
    └── tests/

packages/
├── backend/                 # Convex backend
│   ├── convex/
│   │   ├── schema.ts        # Enhanced database schema
│   │   ├── auth.ts          # Clerk integration
│   │   ├── payments.ts      # Stripe integration
│   │   ├── social.ts        # Ayrshare integration
│   │   └── lib/             # Backend utilities
│   └── tests/
├── api-clients/             # Centralized API client utilities
│   ├── src/
│   │   ├── base/            # Base API client
│   │   ├── stripe/          # Stripe client
│   │   ├── ayrshare/        # Ayrshare client
│   │   └── factory/         # Client factory
│   └── tests/
└── types/                   # Shared TypeScript types
    ├── src/
    │   ├── clerk.ts         # Clerk type definitions
    │   ├── stripe.ts        # Stripe type definitions
    │   ├── ayrshare.ts      # Ayrshare type definitions
    │   ├── convex.ts        # Convex type definitions
    │   └── environment.ts   # Environment variable types
    └── tests/
```

**Structure Decision**: Fullstack monorepo with web/mobile apps sharing backend and API clients. External service integrations are centralized in packages/ for reuse across platforms, with platform-specific UI components in respective apps.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:

   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:

   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:

   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:

   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:

   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType auggie`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:

- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md generated
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS - All constitutional principles satisfied
- [x] Post-Design Constitution Check: PASS - Design maintains constitutional compliance
- [x] All NEEDS CLARIFICATION resolved - Technical context fully specified
- [x] Complexity deviations documented - No constitutional violations requiring justification

---

_Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`_
