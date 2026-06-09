# Magic English Platform

Next-generation Magic English learning platform. This folder is the rewrite track.
The legacy static site remains in the project root as the current production snapshot.

## What This Starts

- `apps/web`: Next.js student/admin frontend.
- `apps/api`: NestJS backend API.
- `packages/shared`: shared TypeScript contracts.
- `docs`: roadmap, architecture decisions, domain model, CI/CD plan.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Default local ports:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/health`

## First Product Milestone

MVP target: auth, roles, on-site course content, student progress, basic interactive tasks, and admin course editor.
Leaderboard, certificates, AI assistant, and deeper analytics follow after core learning flow works.

## Design Constraint

The new platform should preserve the existing Magic English design language. The current placeholder UI is not final; it only proves routes and architecture. See `docs/04-design-parity.md`.

## Dev Auth Headers

The API has a temporary role/session guard so protected endpoints can be shaped before real auth lands.

```bash
curl http://localhost:4000/api/auth/session
curl -H "x-user-role: admin" http://localhost:4000/api/admin/overview
```

Valid dev roles: `student`, `teacher`, `admin`, `owner`.
