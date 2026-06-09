# Phased Implementation Roadmap

## Phase 0: Product Definition

Target: 1 week.

Deliverables:
- Roles: student, admin, teacher, owner.
- Course hierarchy: course, level, module, lesson, block, task.
- MVP launch scope.
- Initial ERD and admin permissions.

Exit criteria:
- CEO can review feature map.
- Developer can build without guessing entity names or permissions.

## Phase 1: Technical Foundation

Target: 1-2 weeks.

Deliverables:
- Monorepo with Next.js web app and NestJS API.
- PostgreSQL, Redis, Prisma schema.
- Auth/RBAC skeleton.
- Legacy design tokens and base component kit.
- CI checks: install, typecheck, build.
- Staging deploy.

Exit criteria:
- Login route exists.
- API health endpoint works.
- Database schema can migrate.
- New Next screens visually match the existing Magic English site foundation.
- Staging URL exists.

## Phase 2: Course Content Migration

Target: 2-3 weeks.

Deliverables:
- Admin course editor MVP.
- On-site lesson/article rendering.
- Migration of current level structure from static HTML/Notion links.
- Student course page with progress.

Exit criteria:
- One full level works fully on-site.
- Old content links are no longer source of truth for that level.

## Phase 3: Interactive Learning Core

Target: 3-5 weeks.

Deliverables:
- Task types: choice, fill blank, matching, writing answer.
- Attempts, correctness, points.
- Homework submission and review flow.
- Student dashboard: current progress, next lesson, weak areas.

Exit criteria:
- Student can complete full lesson journey inside site.
- Admin/teacher can review homework.

## Phase 4: Admin and Metrics MVP

Target: 2-4 weeks.

Deliverables:
- User list, filters, roles, access status.
- Course/content management.
- Activity timeline per user.
- Basic product metrics dashboard.

Exit criteria:
- CEO/admin can manage users and course without code.
- Support can inspect user progress/activity.

## Phase 5: Gamification

Target: 2-3 weeks.

Deliverables:
- XP, streaks, badges.
- Achievements interface.
- Certificates on completion.
- Email certificate delivery.
- Weekly/monthly/all-time leaderboard.

Exit criteria:
- Achievement/certificate flow works with placeholder design.
- Leaderboard ranks by points and accuracy.

## Phase 6: Dictionary

Target: 2-3 weeks.

Deliverables:
- Global dictionary.
- Lesson-linked words.
- Personal saved words.
- Review mode.

Exit criteria:
- Student can save and review words across site.

## Phase 7: AI Course Assistant

Target: 2-4 weeks.

Deliverables:
- Backend-only AI API integration.
- Rate limits and quotas.
- Preset action buttons: explain, examples, check answer, quiz me.
- Lesson-aware context.
- Cost and abuse logs.

Exit criteria:
- Assistant is helpful inside lesson flow.
- Token spend is bounded per user.

## Phase 8: Abuse Detection and Advanced Analytics

Target: 2-4 weeks.

Deliverables:
- Activity event tracking.
- Account-sharing signals.
- Toxic message flags.
- Admin alerts.
- Sales/site metrics integrations.

Exit criteria:
- Admin sees suspicious activity queues and business metrics.

## Recommended Launch Gates

- Staging: after Phase 1.
- Private beta: after Phase 3.
- Paid production launch: after Phase 4.
- Growth features: Phases 5-8.
