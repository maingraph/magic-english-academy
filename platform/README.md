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

Presentation-only sample users and leaderboard data:

```bash
npm run db:demo
```

This command is never run by production containers.

## First Product Milestone

MVP target: auth, roles, on-site course content, student progress, basic interactive tasks, and admin course editor.
Leaderboard, certificates, AI assistant, and deeper analytics follow after core learning flow works.

## Design Constraint

The new platform should preserve the existing Magic English design language. The current placeholder UI is not final; it only proves routes and architecture. See `docs/04-design-parity.md`.

## Production Deployment

```bash
cp .env.production.example .env.production
# Fill every secret and set the real Telegram URL.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Caddy obtains HTTPS certificates automatically after domain DNS points to the server.
The API runs Prisma migrations before startup. PostgreSQL and Redis use persistent volumes.

Backup:

```bash
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh
```

Before launch:

- Replace seeded demo credentials or remove demo accounts.
- Configure Resend and verify the sender domain.
- Add the OpenAI API key through Admin → Settings.
- Set `NEXT_PUBLIC_DEMO_MODE=false`.
- Schedule daily encrypted database backups outside the VPS.

## Dev Auth Headers

The API has a temporary role/session guard so protected endpoints can be shaped before real auth lands.

```bash
curl http://localhost:4000/api/auth/session
curl -H "x-user-role: admin" http://localhost:4000/api/admin/overview
```

Valid dev roles: `student`, `teacher`, `admin`, `owner`.
