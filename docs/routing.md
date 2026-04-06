# Routing convention (Client vs Admin Dashboard)

All HTTP endpoints must be grouped under one of these prefixes so they appear clearly separated in Swagger and remain consistent as the codebase grows.

## Prefixes

- Client-facing APIs: `client/...`
- Admin dashboard APIs: `admin/dashboard/...`

These prefixes are defined in `src/presentation/routing.paths.ts` and should be reused by controllers (instead of hardcoding strings).

## Examples

- Client auth controller: `@Controller(\`\${ROUTE_PREFIX.client}/auth\`)` → `/client/auth/*`
- Admin dashboard auth controller: `@Controller(\`\${ROUTE_PREFIX.adminDashboard}/auth\`)` → `/admin/dashboard/auth/*`

