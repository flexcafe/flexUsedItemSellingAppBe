# Architecture Guide (Clean Architecture)

This project follows a pragmatic Clean Architecture structure:

- **Presentation** (HTTP / Swagger / guards / decorators) calls
- **Application** (use-cases) which depends on
- **Domain** (entities/enums + repository ports) implemented by
- **Infrastructure** (Prisma/Supabase/adapters)

Keep dependencies flowing **inward**:

`presentation → application → domain ← infrastructure`

No layer should “reach around” another layer (e.g., controllers calling Prisma).

---

## Folder responsibilities

### `src/presentation/`
**Purpose**: HTTP transport (NestJS).

- **What belongs here**
  - `@Controller()` route definitions
  - Guards, decorators usage (`@UseGuards`, `@CurrentUser`, `@Public`)
  - Swagger annotations (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
  - Request binding (`@Body`, `@Query`, `@Param`)
  - Route prefix conventions (`client/...`, `admin/dashboard/...`)

- **What must NOT belong here**
  - Prisma queries
  - Business flow logic (that goes into use-cases)

### `src/application/`
**Purpose**: Orchestrate business flows (use-cases), define input/output DTOs.

- **What belongs here**
  - `use-cases/`: one class per action (e.g., `CreateXUseCase`)
  - `dtos/`: request/response DTOs (API payload shape)
  - Business orchestration: validation, calling repositories, emitting notifications via ports

- **What must NOT belong here**
  - Nest HTTP controllers (`@Controller`)
  - Direct Prisma/Supabase calls

> Note: `src/application/controllers/` is intentionally **unused** and should remain empty or be removed. HTTP controllers belong to `presentation`.

### `src/domain/`
**Purpose**: Core business model + ports.

- **What belongs here**
  - `entities/`: domain entities (e.g., `UserEntity`)
  - `enums/`: business enums (e.g., `RegistrationType`)
  - `repositories/`: interfaces (“ports”) that the application depends on
  - (Optional in future) `services/`: pure business rules spanning multiple entities (no DB/framework)

- **What must NOT belong here**
  - Prisma models/types
  - Nest decorators
  - IO (HTTP, DB, filesystem)

### `src/infrastructure/`
**Purpose**: External adapters / implementations.

- **What belongs here**
  - Prisma-backed repository implementations
  - Mappers between Prisma types ↔ domain entities
  - External services (Supabase client, etc.)

---

## API versioning & route prefixes

### Global API prefix
`src/main.ts` sets:

- `api/v1`

So a controller path like `client/auth` becomes:

- `/api/v1/client/auth/...`

### Client vs Admin Dashboard routing
All endpoints must be grouped under one of these prefixes:

- **Client APIs**: `client/...`
- **Admin dashboard APIs**: `admin/dashboard/...`

Use the shared constants:

- `src/presentation/routing.paths.ts`

Example:

- `@Controller(\`\${ROUTE_PREFIX.client}/auth\`)`
- `@Controller(\`\${ROUTE_PREFIX.adminDashboard}/auth\`)`

---

## Feature module pattern (recommended)

When adding a new feature (e.g., Sales Orders), follow this structure:

### 1) Domain
- Add entities/enums (if needed): `src/domain/entities/*`, `src/domain/enums/*`
- Add repository ports: `src/domain/repositories/<feature>.repository.interface.ts`
- Export from `src/domain/repositories/index.ts` if you use the barrel.

### 2) Application
- Add DTOs:
  - `src/application/dtos/<feature>/*.dto.ts`
  - Keep DTOs focused on API/use-case IO (validation decorators are OK here).
- Add use-cases:
  - `src/application/use-cases/<feature>/*.use-case.ts`
  - Each use-case should depend on **domain interfaces** (ports).

### 3) Infrastructure
- Add repository implementations:
  - `src/infrastructure/repositories/<feature>.repository.ts`
- Add mappers (if needed):
  - `src/infrastructure/mappers/<feature>.mapper.ts`

### 4) Presentation
- Add controller(s) under:
  - `src/presentation/modules/<feature>/*controller.ts`
  - Use `client/...` vs `admin/dashboard/...` prefix appropriately.
- Add feature module:
  - `src/presentation/modules/<feature>/<feature>.module.ts`
  - Bind interface token → implementation:
    - `provide: <PORT_TOKEN>, useClass: <RepoImpl>`
- Register module in `src/app.module.ts`.

---

## Response format convention

Most endpoints return:

- `ApiResponseDto.success(data, message)`

Pagination uses:

- `PaginatedResponseDto`

Keep this consistent for new endpoints unless there is a deliberate exception.

---

## Idempotency & business rules

If an endpoint supports idempotency (e.g., `idempotencyKey`):

- Enforce it in an application use-case using a repository port method like:
  - `findByIdempotencyKey(...)` and/or `createIfNotExists(...)`
- Keep the rule in application/domain, not in controllers.

---

## Testing rules

- Add use-case tests under:
  - `src/application/use-cases/**/**/*.spec.ts`
- Prefer **unit tests** for use-cases by mocking repository ports.
- Use-case tests should cover:
  - happy paths
  - validation failures
  - not found / conflict / forbidden flows
  - idempotency behavior (if applicable)

Jest is configured for ESM via:

- `jest.config.cjs`

---

## Quick “where should this go?” checklist

- **HTTP route / Swagger / guards** → `presentation`
- **Business flow / orchestration** → `application/use-cases`
- **Business model / rules / ports** → `domain`
- **Prisma queries / external API calls** → `infrastructure`

