# Platform Decision

## Recommendation

Use Next.js + NestJS + PostgreSQL + Redis.

## Why

- Next.js fits student/admin UI, server-rendered course pages, and fast iteration.
- NestJS fits long-lived backend modules: auth, roles, course engine, admin, gamification, analytics, abuse tracking, and AI cost controls.
- PostgreSQL fits relational course/progress/user data.
- Redis fits sessions, rate limits, leaderboards, and background jobs.

## FastAPI Position

FastAPI is a good option for AI-heavy or data-heavy services, especially if Python tools become central. Do not start with it as the main backend unless the team strongly prefers Python. Add it later as a scoring or AI microservice if needed.

## Key Principle

Do not perform a big-bang replacement. Build the new platform next to the static site, migrate content level by level, and launch beta once core learning flow works.
