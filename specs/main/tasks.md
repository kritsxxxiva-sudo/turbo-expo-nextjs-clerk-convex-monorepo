# Tasks: Comprehensive External Service Integration

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, API clients
   → Integration: webhooks, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Turbo Monorepo** (this project): `apps/web/src/`, `apps/native/src/`, `packages/backend/convex/`
- **Web features**: `apps/web/src/components/`, `apps/web/src/app/`
- **Native features**: `apps/native/src/components/`, `apps/native/src/screens/`
- **Backend**: `packages/backend/convex/functions/`, `packages/backend/convex/schema.ts`
- **Shared packages**: `packages/api-clients/src/`, `packages/types/src/`
- Paths shown below assume monorepo structure - adjust workspace paths as needed

## Phase 3.1: Setup

- [x] T001 Create shared packages structure (api-clients, types) with package.json files
- [x] T002 [P] Configure strict TypeScript in packages/types/tsconfig.json with project references
- [x] T003 [P] Configure strict TypeScript in packages/api-clients/tsconfig.json with project references
- [x] T004 [P] Install external service dependencies (Stripe SDK, Ayrshare SDK) in packages/api-clients
- [x] T005 [P] Configure ESLint and Prettier for new packages
- [x] T006 [P] Set up path mapping configuration in root tsconfig.json for clean imports

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T007 [P] Contract test for auth API in packages/backend/tests/contract/test_auth_api.ts
- [x] T008 [P] Contract test for payments API in packages/backend/tests/contract/test_payments_api.ts
- [x] T009 [P] Contract test for social API in packages/backend/tests/contract/test_social_api.ts
- [x] T010 [P] Integration test for Clerk webhook processing in packages/backend/tests/integration/test_clerk_webhooks.ts
- [x] T011 [P] Integration test for Stripe webhook processing in packages/backend/tests/integration/test_stripe_webhooks.ts
- [ ] T012 [P] Integration test for Ayrshare webhook processing in packages/backend/tests/integration/test_ayrshare_webhooks.ts
- [ ] T013 [P] Integration test for user authentication flow in apps/web/tests/integration/test_auth_flow.ts
- [ ] T014 [P] Integration test for payment processing flow in apps/web/tests/integration/test_payment_flow.ts
- [ ] T015 [P] Integration test for social media posting flow in apps/web/tests/integration/test_social_flow.ts
- [ ] T016 [P] Integration test for native auth flow in apps/native/tests/integration/test_auth_flow.ts
- [x] T017 [P] Integration test for session management in packages/backend/tests/integration/test_session_management.ts
- [ ] T018 [P] Integration test for multi-currency support in packages/backend/tests/integration/test_multi_currency.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### 3.3.1: Shared Types and API Clients

- [x] T019 [P] Create Clerk type definitions in packages/types/src/clerk.ts
- [x] T020 [P] Create Stripe type definitions in packages/types/src/stripe.ts
- [x] T021 [P] Create Ayrshare type definitions in packages/types/src/ayrshare.ts
- [x] T022 [P] Create Convex type definitions in packages/types/src/convex.ts
- [x] T023 [P] Create environment variable types in packages/types/src/environment.ts
- [x] T024 [P] Implement BaseApiClient with caching in packages/api-clients/src/base/BaseApiClient.ts
- [x] T025 [P] Implement StripeClient in packages/api-clients/src/stripe/StripeClient.ts
- [x] T026 [P] Implement AyrshareClient in packages/api-clients/src/ayrshare/AyrshareClient.ts
- [x] T027 [P] Implement ApiClientFactory in packages/api-clients/src/factory/ApiClientFactory.ts

### 3.3.2: Database Schema and Backend Functions

- [x] T028 Enhanced Convex schema with all entities and indexes in packages/backend/convex/schema.ts
- [x] T029 [P] User management functions in packages/backend/convex/functions/users.ts
- [x] T030 [P] Social account functions in packages/backend/convex/functions/socialAccounts.ts
- [x] T031 [P] Customer management functions in packages/backend/convex/functions/customers.ts
- [x] T032 [P] Subscription management functions in packages/backend/convex/functions/subscriptions.ts
- [x] T033 [P] Social post functions in packages/backend/convex/functions/socialPosts.ts
- [x] T034 [P] Webhook event functions in packages/backend/convex/functions/webhookEvents.ts
- [ ] T035 [P] Session management functions in packages/backend/convex/functions/sessions.ts
- [x] T036 [P] Data validation and integrity rules in packages/backend/convex/lib/validation.ts

### 3.3.3: Authentication Integration

- [x] T037 [P] Clerk authentication setup in packages/backend/convex/auth.ts
- [x] T038 [P] Clerk webhook handlers in packages/backend/convex/webhooks/clerk.ts
- [x] T039 [P] Web auth components in apps/web/src/components/auth/
- [x] T040 [P] Native auth components in apps/native/src/components/auth/
- [x] T041 User profile management in apps/web/src/app/profile/page.tsx
- [x] T042 [P] Session timeout configuration in packages/backend/convex/lib/sessionConfig.ts

### 3.3.4: Payment Processing Integration

- [x] T043 [P] Stripe integration setup in packages/backend/convex/payments.ts
- [x] T044 [P] Stripe webhook handlers in packages/backend/convex/webhooks/stripe.ts
- [x] T045 [P] Multi-currency support in packages/backend/convex/lib/currency.ts
- [x] T046 [P] Web payment components in apps/web/src/components/payments/
- [x] T047 [P] Native payment components in apps/native/src/components/payments/
- [x] T048 Subscription management in apps/web/src/app/billing/page.tsx

### 3.3.5: Social Media Integration

- [x] T049 [P] Ayrshare integration setup in packages/backend/convex/social.ts
- [x] T050 [P] Ayrshare webhook handlers in packages/backend/convex/webhooks/ayrshare.ts
- [x] T051 [P] Content scheduling logic in packages/backend/convex/lib/scheduler.ts
- [x] T052 [P] Analytics integration in packages/backend/convex/lib/analytics.ts
- [ ] T053 [P] Web social components in apps/web/src/components/social/
- [x] T054 [P] Native social components in apps/native/src/components/social/
- [x] T055 Social media dashboard in apps/web/src/app/social/page.tsx

## Phase 3.4: Integration

- [x] T056 Webhook signature verification middleware in packages/backend/convex/lib/webhookAuth.ts
- [x] T057 Error handling and retry logic in packages/backend/convex/lib/errorHandling.ts
- [x] T058 Request/response logging in packages/backend/convex/lib/logging.ts
- [x] T059 Environment configuration validation in packages/backend/convex/lib/config.ts
- [x] T060 Cross-platform navigation setup in apps/web/src/lib/navigation.ts
- [x] T061 Real-time data synchronization in packages/backend/convex/lib/sync.ts
- [x] T062 [P] Audit logging implementation in packages/backend/convex/lib/auditLog.ts

## Phase 3.5: Polish

- [x] T063 [P] Unit tests for API clients in packages/api-clients/tests/unit/
- [x] T064 [P] Unit tests for type definitions in packages/types/tests/unit/
- [x] T065 [P] Unit tests for Convex functions in packages/backend/tests/unit/
- [ ] T066 [P] Performance tests with specific SLA targets (<200ms Stripe, <500ms Ayrshare)
- [ ] T067 [P] Security audit with SOC 2 compliance checklist
- [ ] T068 [P] Update API documentation in docs/api.md
- [ ] T069 [P] Update deployment documentation in docs/deployment.md
- [ ] T070 Run end-to-end quickstart validation from specs/main/quickstart.md

## Dependencies

- Setup (T001-T006) before everything
- Tests (T007-T018) before implementation (T019-T062)
- Types (T019-T023) before API clients (T024-T027)
- Schema (T028) before backend functions (T029-T036)
- Backend functions before web/native components
- Core implementation before integration (T056-T062)
- Everything before polish (T063-T070)

## Parallel Example

```
# Launch T019-T023 together (shared types):
Task: "Create Clerk type definitions in packages/types/src/clerk.ts"
Task: "Create Stripe type definitions in packages/types/src/stripe.ts"
Task: "Create Ayrshare type definitions in packages/types/src/ayrshare.ts"
Task: "Create Convex type definitions in packages/types/src/convex.ts"
Task: "Create environment variable types in packages/types/src/environment.ts"

# Launch T024-T027 together (API clients):
Task: "Implement BaseApiClient with caching in packages/api-clients/src/base/BaseApiClient.ts"
Task: "Implement StripeClient in packages/api-clients/src/stripe/StripeClient.ts"
Task: "Implement AyrshareClient in packages/api-clients/src/ayrshare/AyrshareClient.ts"
Task: "Implement ApiClientFactory in packages/api-clients/src/factory/ApiClientFactory.ts"

# Launch T029-T036 together (backend functions):
Task: "User management functions in packages/backend/convex/functions/users.ts"
Task: "Social account functions in packages/backend/convex/functions/socialAccounts.ts"
Task: "Customer management functions in packages/backend/convex/functions/customers.ts"
Task: "Subscription management functions in packages/backend/convex/functions/subscriptions.ts"
Task: "Social post functions in packages/backend/convex/functions/socialPosts.ts"
Task: "Webhook event functions in packages/backend/convex/functions/webhookEvents.ts"
Task: "Session management functions in packages/backend/convex/functions/sessions.ts"
Task: "Data validation and integrity rules in packages/backend/convex/lib/validation.ts"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Follow constitutional principles: monorepo-first, type safety, test-first, real-time, security
- All external service integrations must use proper authentication and error handling
- Maintain cross-platform consistency between web and native implementations

## Task Generation Rules

_Applied during main() execution_

1. **From Contracts**:

   - auth-api.yaml → T007 (contract test)
   - payments-api.yaml → T008 (contract test)
   - social-api.yaml → T009 (contract test)

2. **From Data Model**:

   - User entity → T029 (user functions)
   - SocialAccount entity → T030 (social account functions)
   - Customer entity → T031 (customer functions)
   - Subscription entity → T032 (subscription functions)
   - SocialPost entity → T033 (social post functions)
   - WebhookEvent entity → T034 (webhook event functions)

3. **From User Stories**:

   - Authentication story → T013, T016 (integration tests)
   - Payment story → T014 (integration test)
   - Social media story → T015 (integration test)
   - Session management → T017 (integration test)
   - Multi-currency → T018 (integration test)

4. **From Research Decisions**:

   - TypeScript strict mode → T002, T003, T006 (setup tasks)
   - Webhook-driven sync → T010, T011, T012 (webhook tests)
   - Centralized API clients → T024-T027 (API client tasks)

5. **Ordering**:
   - Setup → Tests → Types → API Clients → Schema → Functions → Components → Integration → Polish
   - Dependencies block parallel execution

## Validation Checklist

_GATE: Checked by main() before returning_

- [x] All contracts have corresponding tests (T007-T009)
- [x] All entities have model tasks (T029-T034)
- [x] All tests come before implementation (T007-T018 before T019+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitutional compliance: monorepo-first, type safety, test-first, real-time, security
- [x] Missing requirements coverage added: session management, multi-currency, analytics, scheduling, audit logging, caching
- [x] Performance tests include specific SLA targets
- [x] Security audit includes compliance checklist
