# CI/CD Plan

## Environments

- Local: developer machine with Docker Compose.
- Staging: auto-deploy from `main` or `develop`.
- Production: manual approval deploy from tagged release or protected branch.

## CI Checks

Run on every pull request:

- install dependencies
- typecheck all workspaces
- build all workspaces
- lint all workspaces
- run unit tests once added
- run database migration check once schema stabilizes

## Deployment Shape

Recommended first deployment:

- Web: Vercel or equivalent Next.js host.
- API: Render/Fly.io/Railway/AWS ECS.
- Database: managed PostgreSQL.
- Redis: managed Redis.
- Files: S3/R2.

## Release Strategy

1. Keep static site live.
2. Deploy new platform to staging.
3. Migrate one level.
4. Run private beta.
5. Switch production traffic after Phase 4 launch gate.
